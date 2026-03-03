import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and } from 'drizzle-orm';
import { pgTable, text, serial, integer, boolean, timestamp } from 'drizzle-orm/pg-core';

// Schema
const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email").notNull().unique(),
  fullName: text("full_name").notNull(),
  isMember: boolean("is_member").default(false).notNull(),
  isAdmin: boolean("is_admin").default(false).notNull(),
  isDoctor: boolean("is_doctor").default(false).notNull(),
  doctorTitle: text("doctor_title"),
  doctorSpecialty: text("doctor_specialty"),
  doctorBio: text("doctor_bio"),
  profileImage: text("profile_image"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  price: integer("price").notNull(),
  imageUrl: text("image_url"),
  visibility: text("visibility").notNull(),
  categoryId: integer("category_id").notNull(),
  stockQuantity: integer("stock_quantity").notNull().default(0),
  featured: boolean("featured").default(false).notNull(),
  doctorIds: text("doctor_ids").array(),
  createdAt: timestamp("created_at").defaultNow().notNull()
});

const categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  productCount: integer("product_count").default(0).notNull()
});

const testimonials = pgTable("testimonials", {
  id: serial("id").primaryKey(),
  author: text("author").notNull(),
  role: text("role").notNull(),
  content: text("content").notNull(),
  imageUrl: text("image_url"),
  featured: boolean("featured").default(false).notNull()
});

// Database connection
let pool;
let db;

function getDb() {
  if (!pool) {
    pool = new pg.Pool({ 
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }
    });
    db = drizzle(pool);
  }
  return db;
}

export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const db = getDb();
  const url = new URL(req.url, `http://${req.headers.host}`);
  const path = url.pathname.replace('/api', '');

  try {
    // Health check
    if (path === '/health' || path === '/health/') {
      return res.json({ status: 'ok', timestamp: new Date().toISOString() });
    }

    // Products
    if (path === '/products' || path === '/products/') {
      if (req.method === 'GET') {
        const featured = url.searchParams.get('featured');
        const categoryId = url.searchParams.get('categoryId');
        
        let query = db.select().from(products);
        const conditions = [];
        
        if (featured === 'true') conditions.push(eq(products.featured, true));
        if (categoryId) conditions.push(eq(products.categoryId, parseInt(categoryId)));
        
        if (conditions.length > 0) {
          query = query.where(and(...conditions));
        }
        
        const result = await query;
        return res.json(result);
      }
    }

    // Single product
    const productMatch = path.match(/^\/products\/(\d+)$/);
    if (productMatch) {
      const [product] = await db.select().from(products).where(eq(products.id, parseInt(productMatch[1])));
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.json(product);
    }

    // Categories
    if (path === '/categories' || path === '/categories/') {
      if (req.method === 'GET') {
        const result = await db.select().from(categories);
        return res.json(result);
      }
    }

    // Single category
    const categoryMatch = path.match(/^\/categories\/(\d+)$/);
    if (categoryMatch) {
      const [category] = await db.select().from(categories).where(eq(categories.id, parseInt(categoryMatch[1])));
      if (!category) return res.status(404).json({ error: 'Category not found' });
      return res.json(category);
    }

    // Doctors
    if (path === '/doctors' || path === '/doctors/') {
      if (req.method === 'GET') {
        const result = await db.select().from(users).where(eq(users.isDoctor, true));
        const doctorsWithoutPasswords = result.map(({ password, ...rest }) => rest);
        return res.json(doctorsWithoutPasswords);
      }
    }

    // Single doctor
    const doctorMatch = path.match(/^\/doctors\/(\d+)$/);
    if (doctorMatch) {
      const [doctor] = await db.select().from(users).where(and(eq(users.id, parseInt(doctorMatch[1])), eq(users.isDoctor, true)));
      if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
      const { password, ...doctorWithoutPassword } = doctor;
      return res.json(doctorWithoutPassword);
    }

    // Testimonials
    if (path === '/testimonials' || path === '/testimonials/') {
      if (req.method === 'GET') {
        const featured = url.searchParams.get('featured');
        let query = db.select().from(testimonials);
        if (featured === 'true') {
          query = query.where(eq(testimonials.featured, true));
        }
        const result = await query;
        return res.json(result);
      }
    }

    // Firebase Auth
    if (path === '/auth/firebase' || path === '/auth/firebase/') {
      if (req.method === 'POST') {
        const { idToken, email, fullName, profileImage } = req.body;
        if (!idToken || !email) {
          return res.status(400).json({ error: 'Missing required fields' });
        }

        // Verify Firebase token
        const firebaseApiKey = process.env.FIREBASE_API_KEY;
        const response = await fetch(
          `https://www.googleapis.com/identitytoolkit/v3/relyingparty/getAccountInfo?key=${firebaseApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken }),
          }
        );

        if (!response.ok) {
          return res.status(401).json({ error: 'Invalid Firebase token' });
        }

        // Check if user exists
        const [existingUser] = await db.select().from(users).where(eq(users.email, email));
        
        if (existingUser) {
          const { password, ...userWithoutPassword } = existingUser;
          return res.json(userWithoutPassword);
        }

        // Create new user
        const [newUser] = await db.insert(users).values({
          username: email.split('@')[0] || `user_${Date.now()}`,
          email,
          fullName: fullName || 'User',
          password: '',
          isMember: false,
          isAdmin: false,
          isDoctor: false,
          profileImage: profileImage || null,
        }).returning();

        const { password, ...userWithoutPassword } = newUser;
        return res.json(userWithoutPassword);
      }
    }

    // User (no session in serverless)
    if (path === '/user' || path === '/user/') {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Default 404
    return res.status(404).json({ error: 'Not found', path });

  } catch (error) {
    console.error('API Error:', error);
    return res.status(500).json({ error: 'Internal server error', message: error.message });
  }
}
