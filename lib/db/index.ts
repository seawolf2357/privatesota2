import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Determine which database to use based on environment
const isProduction = process.env.NODE_ENV === 'production';
const isVercel = process.env.VERCEL === '1';
const useSupabase = process.env.USE_SUPABASE === 'true';
const usePostgres = isProduction || process.env.USE_POSTGRES === 'true' || useSupabase || isVercel;

// Database client type
export type DbClient = ReturnType<typeof drizzle> | ReturnType<typeof drizzleSqlite>;

// Create database connection based on environment
function createDbConnection(): DbClient {
  // Priority: Supabase > PostgreSQL > SQLite
  if (useSupabase || isVercel) {
    // Use Supabase PostgreSQL
    console.log('🚀 Using Supabase PostgreSQL database');
    
    const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL;
    if (!dbUrl) {
      throw new Error(
        'DATABASE_URL is required for Supabase. ' +
        'Please check your .env.local file'
      );
    }
    
    const client = postgres(dbUrl, {
      prepare: false, // Required for Supabase pooler
      ssl: 'require',
    });
    
    return drizzle(client, { schema });
  } else if (usePostgres) {
    // Production: Use PostgreSQL
    console.log('🐘 Using PostgreSQL database');
    
    if (!process.env.POSTGRES_URL) {
      throw new Error(
        'POSTGRES_URL is required for production. ' +
        'For local development, use SQLite by setting USE_SUPABASE=false'
      );
    }
    
    const client = postgres(process.env.POSTGRES_URL);
    
    return drizzle(client, { schema });
  } else {
    // Development: Use SQLite
    console.log('📦 Using SQLite database (local development)');
    
    const dbPath = process.env.DATABASE_URL_SQLITE || process.env.SQLITE_PATH || './data/chat.db';
    
    // Ensure data directory exists
    const fs = require('fs');
    const path = require('path');
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    const sqlite = new Database(dbPath);
    
    // Enable WAL mode for better performance
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('cache_size = -20000');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('temp_store = MEMORY');
    
    return drizzleSqlite(sqlite, { schema });
  }
}

// Export the database client
export const db = createDbConnection() as any;

// Helper to check if using PostgreSQL
export const isUsingPostgres = () => usePostgres;

// Helper to get database type
export const getDatabaseType = () => {
  if (useSupabase) return 'supabase';
  if (usePostgres) return 'postgresql';
  return 'sqlite';
};

// Get database info for debugging
export async function getDatabaseInfo() {
  const dbType = getDatabaseType();
  
  return {
    type: dbType,
    environment: process.env.NODE_ENV || 'development',
    isVercel: process.env.VERCEL === '1',
    useSupabase: process.env.USE_SUPABASE === 'true',
    connectionString: dbType === 'supabase' || dbType === 'postgresql'
      ? (process.env.DATABASE_URL || process.env.POSTGRES_URL || '').replace(/:[^:]*@/, ':***@') // Hide password
      : process.env.DATABASE_URL_SQLITE || './data/chat.db',
  };
}