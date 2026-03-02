import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { User as SelectUser, InsertUser } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

async function hashPassword(password: string) {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

async function comparePasswords(supplied: string, stored: string) {
  return bcrypt.compare(supplied, stored);
}

// Verify Firebase ID token
async function verifyFirebaseToken(idToken: string): Promise<any> {
  // Call Firebase's token verification endpoint
  const firebaseApiKey = process.env.FIREBASE_API_KEY;
  if (!firebaseApiKey) {
    throw new Error("FIREBASE_API_KEY environment variable is not set");
  }
  
  const response = await fetch(
    `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${firebaseApiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ idToken }),
    }
  );
  
  if (!response.ok) {
    throw new Error("Invalid Firebase token");
  }
  
  const data = await response.json();
  if (!data.users || data.users.length === 0) {
    throw new Error("No user found for token");
  }
  
  return data.users[0];
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "active-recovery-360-secret",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log(`Attempting login for username: ${username}`);
        const user = await storage.getUserByUsername(username);
        console.log(`User found:`, user ? "yes" : "no");
        
        if (!user) {
          console.log("No user found with that username");
          return done(null, false);
        }
        
        const passwordMatches = await comparePasswords(password, user.password);
        console.log(`Password comparison result: ${passwordMatches}`);
        
        if (!passwordMatches) {
          console.log("Password does not match");
          return done(null, false);
        } else {
          console.log("Login successful");
          return done(null, user);
        }
      } catch (error) {
        console.error("Login error:", error);
        return done(error);
      }
    }),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Register a new user
  app.post("/api/register", async (req, res, next) => {
    try {
      const userData: InsertUser = req.body;
      
      // Check if username already exists
      const existingUserByUsername = await storage.getUserByUsername(userData.username);
      if (existingUserByUsername) {
        return res.status(400).json({ message: "Username already exists" });
      }
      
      // Check if email already exists
      const existingUserByEmail = await storage.getUserByEmail(userData.email);
      if (existingUserByEmail) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create user with hashed password
      const user = await storage.createUser({
        ...userData,
        password: hashedPassword,
      });

      // Log in the user
      req.login(user, (err) => {
        if (err) return next(err);
        // Return user without password
        const { password, ...userWithoutPassword } = user;
        res.status(201).json(userWithoutPassword);
      });
    } catch (error) {
      next(error);
    }
  });

  // Login
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.status(200).json(userWithoutPassword);
  });

  // Logout
  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Firebase Authentication endpoint
  app.post("/api/auth/firebase", async (req, res, next) => {
    try {
      const { idToken, email, fullName, profileImage, isDoctor, doctorTitle, doctorSpecialty, doctorBio } = req.body;
      
      if (!idToken) {
        return res.status(400).json({ message: "Firebase ID token is required" });
      }
      
      console.log("Verifying Firebase token for:", email);
      
      // Verify the Firebase token
      let firebaseUser;
      try {
        firebaseUser = await verifyFirebaseToken(idToken);
      } catch (error) {
        console.error("Firebase token verification failed:", error);
        return res.status(401).json({ message: "Invalid Firebase token" });
      }
      
      // Check if user already exists by email
      let user = await storage.getUserByEmail(email);
      
      if (user) {
        console.log("Existing user found, logging in:", email);
        // Update profile image if changed
        if (profileImage && profileImage !== user.profileImage) {
          user = await storage.updateUser(user.id, { profileImage }) || user;
        }
      } else {
        // Create new user from Firebase profile
        console.log("Creating new user from Firebase:", email);
        const username = email.split('@')[0] || `user_${Date.now()}`;
        
        // Check if username exists and make unique if needed
        let finalUsername = username;
        let counter = 1;
        while (await storage.getUserByUsername(finalUsername)) {
          finalUsername = `${username}_${counter}`;
          counter++;
        }
        
        const newUser: InsertUser = {
          username: finalUsername,
          email: email,
          fullName: fullName || "User",
          password: "", // No password needed for Firebase users
          isMember: false,
          isAdmin: false,
          isDoctor: isDoctor || false,
          doctorTitle: doctorTitle || null,
          doctorSpecialty: doctorSpecialty || null,
          doctorBio: doctorBio || null,
          profileImage: profileImage || null,
        };
        
        user = await storage.createUser(newUser);
        console.log("New Firebase user created:", user.email);
      }
      
      // Log in the user with Passport session
      req.login(user, (err) => {
        if (err) {
          console.error("Session login error:", err);
          return next(err);
        }
        
        // Return user without password
        const { password, ...userWithoutPassword } = user!;
        res.status(200).json(userWithoutPassword);
      });
      
    } catch (error) {
      console.error("Firebase auth error:", error);
      next(error);
    }
  });

  // Get current user
  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.sendStatus(401);
    }
    // Return user without password
    const { password, ...userWithoutPassword } = req.user as SelectUser;
    res.json(userWithoutPassword);
  });

  // Membership purchase endpoint
  app.post("/api/membership/purchase", async (req, res, next) => {
    try {
      if (!req.isAuthenticated()) {
        return res.status(401).json({ message: "You must be logged in to purchase a membership" });
      }

      const userId = (req.user as SelectUser).id;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      if (user.isMember) {
        return res.status(400).json({ message: "You are already a member" });
      }

      // Update user's membership status
      const updatedUser = await storage.updateUser(userId, { isMember: true });
      if (!updatedUser) {
        return res.status(500).json({ message: "Failed to update membership status" });
      }

      // Return updated user without password
      const { password, ...userWithoutPassword } = updatedUser;
      res.status(200).json(userWithoutPassword);
    } catch (error) {
      next(error);
    }
  });
}
