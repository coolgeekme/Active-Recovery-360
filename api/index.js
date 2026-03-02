// Vercel Serverless API Entry Point
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { eq, and, sql, asc } from 'drizzle-orm';
import Stripe from 'stripe';
import { pgTable, text, serial, integer, boolean, jsonb, timestamp } from 'drizzle-orm/pg-core';
import { createInsertSchema } from 'drizzle-zod';
import { z } from 'zod';

// Schema definitions
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
const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});
const db = drizzle(pool);

// Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2023-10-16'
});

// Create Express app
const app = express();

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true
}));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Products
app.get('/api/products', async (req, res) => {
  try {
    const { featured, categoryId, visibility } = req.query;
    let query = db.select().from(products);
    
    const conditions = [];
    if (featured === 'true') conditions.push(eq(products.featured, true));
    if (categoryId) conditions.push(eq(products.categoryId, parseInt(categoryId)));
    if (visibility) conditions.push(eq(products.visibility, visibility));
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }
    
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error('Error fetching products:', error);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});

app.get('/api/products/:id', async (req, res) => {
  try {
    const [product] = await db.select().from(products).where(eq(products.id, parseInt(req.params.id)));
    if (!product) return res.status(404).json({ error: 'Product not found' });
    res.json(product);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch product' });
  }
});

// Categories
app.get('/api/categories', async (req, res) => {
  try {
    const result = await db.select().from(categories);
    res.json(result);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Failed to fetch categories' });
  }
});

app.get('/api/categories/:id', async (req, res) => {
  try {
    const [category] = await db.select().from(categories).where(eq(categories.id, parseInt(req.params.id)));
    if (!category) return res.status(404).json({ error: 'Category not found' });
    res.json(category);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch category' });
  }
});

// Doctors
app.get('/api/doctors', async (req, res) => {
  try {
    const result = await db.select().from(users).where(eq(users.isDoctor, true));
    const doctorsWithoutPasswords = result.map(({ password, ...rest }) => rest);
    res.json(doctorsWithoutPasswords);
  } catch (error) {
    console.error('Error fetching doctors:', error);
    res.status(500).json({ error: 'Failed to fetch doctors' });
  }
});

app.get('/api/doctors/:id', async (req, res) => {
  try {
    const [doctor] = await db.select().from(users).where(and(eq(users.id, parseInt(req.params.id)), eq(users.isDoctor, true)));
    if (!doctor) return res.status(404).json({ error: 'Doctor not found' });
    const { password, ...doctorWithoutPassword } = doctor;
    res.json(doctorWithoutPassword);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch doctor' });
  }
});

// Testimonials
app.get('/api/testimonials', async (req, res) => {
  try {
    const { featured } = req.query;
    let query = db.select().from(testimonials);
    if (featured === 'true') {
      query = query.where(eq(testimonials.featured, true));
    }
    const result = await query;
    res.json(result);
  } catch (error) {
    console.error('Error fetching testimonials:', error);
    res.status(500).json({ error: 'Failed to fetch testimonials' });
  }
});

// Firebase Auth
app.post('/api/auth/firebase', async (req, res) => {
  try {
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
    res.json(userWithoutPassword);
  } catch (error) {
    console.error('Firebase auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

// User endpoint (returns 401 for unauthenticated - sessions don't persist in serverless)
app.get('/api/user', (req, res) => {
  res.status(401).json({ error: 'Not authenticated' });
});

// Stripe payment intent
app.post('/api/create-payment-intent', async (req, res) => {
  try {
    const { amount } = req.body;
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(amount * 100),
      currency: 'usd',
      metadata: { type: 'membership' }
    });
    res.json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error('Stripe error:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Discount code validation
app.post('/api/discount-codes/validate', async (req, res) => {
  try {
    const { code } = req.body;
    // For now, return not found - implement discount codes table if needed
    res.status(404).json({ message: 'Invalid discount code' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to validate discount code' });
  }
});

export default app;
