import { drizzle as drizzleSqlite } from 'drizzle-orm/better-sqlite3';
import { drizzle as drizzlePostgres } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import Database from 'better-sqlite3';
import * as schema from './schema';

export type DbClient = ReturnType<typeof drizzleSqlite> | ReturnType<typeof drizzlePostgres>;

let dbInstance: DbClient | null = null;

export function getDbClient() {
  if (dbInstance) {
    return dbInstance;
  }

  const usePostgres = process.env.USE_POSTGRES === 'true';
  
  if (usePostgres) {
    const connectionString = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('PostgreSQL connection string not provided');
    }
    
    const client = postgres(connectionString, {
      max: 20,
      idle_timeout: 30,
      connect_timeout: 10,
      ssl: process.env.NODE_ENV === 'production' ? 'require' : false,
    });
    
    dbInstance = drizzlePostgres(client, { schema });
    console.log('Using PostgreSQL database');
  } else {
    const dbPath = process.env.DATABASE_URL || './data/chat.db';
    const sqlite = new Database(dbPath);
    
    sqlite.pragma('journal_mode = WAL');
    sqlite.pragma('busy_timeout = 5000');
    sqlite.pragma('synchronous = NORMAL');
    sqlite.pragma('cache_size = -20000');
    sqlite.pragma('foreign_keys = ON');
    sqlite.pragma('temp_store = MEMORY');
    
    dbInstance = drizzleSqlite(sqlite, { schema });
    console.log(`Using SQLite database at ${dbPath}`);
  }
  
  return dbInstance;
}

export function closeDbConnection() {
  if (dbInstance) {
    const usePostgres = process.env.USE_POSTGRES === 'true';
    if (!usePostgres) {
      (dbInstance as any).close();
    }
    dbInstance = null;
  }
}

export function getDatabaseType(): 'postgres' | 'sqlite' {
  return process.env.USE_POSTGRES === 'true' ? 'postgres' : 'sqlite';
}