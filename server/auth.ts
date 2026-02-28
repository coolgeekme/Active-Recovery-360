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

  // Emergent Google OAuth - Exchange session_id for user data
  // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
  app.post("/api/auth/emergent-session", async (req, res, next) => {
    try {
      const { session_id } = req.body;
      
      if (!session_id) {
        return res.status(400).json({ message: "session_id is required" });
      }
      
      console.log("Exchanging Emergent session_id for user data");
      
      // Call Emergent Auth API to get user data
      const response = await fetch(
        "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
        {
          method: "GET",
          headers: {
            "X-Session-ID": session_id,
          },
        }
      );
      
      if (!response.ok) {
        console.error("Emergent Auth API error:", response.status);
        return res.status(401).json({ message: "Invalid session" });
      }
      
      const emergentUser = await response.json();
      console.log("Emergent user data received:", emergentUser.email);
      
      // Check if user already exists by email
      let user = await storage.getUserByEmail(emergentUser.email);
      
      if (user) {
        console.log("Existing user found, logging in");
        // Update profile image if changed
        if (emergentUser.picture && emergentUser.picture !== user.profileImage) {
          user = await storage.updateUser(user.id, { profileImage: emergentUser.picture }) || user;
        }
      } else {
        // Create new user from Google profile
        const newUser: InsertUser = {
          username: emergentUser.email.split('@')[0] || `google_${Date.now()}`,
          email: emergentUser.email,
          fullName: emergentUser.name || "Google User",
          password: "", // No password needed for OAuth users
          isMember: false,
          isAdmin: false,
          isDoctor: false,
          profileImage: emergentUser.picture || null,
        };
        
        user = await storage.createUser(newUser);
        console.log("New Google user created");
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
      console.error("Emergent OAuth error:", error);
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
