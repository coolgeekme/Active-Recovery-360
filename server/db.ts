import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Configure for Supabase Transaction Pooler
export const pool = new pg.Pool({ 
  connectionString: process.env.DATABASE_URL,
  // Disable prepared statements for Supabase Transaction Pooler compatibility
  statement_timeout: 30000,
  query_timeout: 30000,
});

export const db = drizzle(pool, { schema });