import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

// Determine which database to use based on environment
const isProduction = process.env.NODE_ENV === 'production';
const usePostgres = isProduction || process.env.USE_POSTGRES === 'true';

// Database client type
export type DbClient = ReturnType<typeof drizzle> | ReturnType<typeof drizzleSqlite>;

// Create database connection based on environment
function createDbConnection(): DbClient {
  if (usePostgres) {
    // Production: Use PostgreSQL
    console.log('🐘 Using PostgreSQL database');
    
    if (!process.env.POSTGRES_URL) {
      throw new Error(
        'POSTGRES_URL is required for production. ' +
        'For local development, use SQLite by setting NODE_ENV=development'
      );
    }
    
    const client = postgres(process.env.POSTGRES_URL);
    
    return drizzle(client, { schema });
  } else {
    // Development: Use SQLite
    console.log('📦 Using SQLite database (local development)');
    
    const dbPath = process.env.SQLITE_PATH || './data/chat.db';
    
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
    
    return drizzleSqlite(sqlite, { schema });
  }
}

// Export the database client
export const db = createDbConnection() as any;

// Helper to check if using PostgreSQL
export const isUsingPostgres = () => usePostgres;

// Helper to get database type
export const getDatabaseType = () => usePostgres ? 'postgresql' : 'sqlite';