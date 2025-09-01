import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

// SQLite database connection
const sqlite = new Database(process.env.DATABASE_URL || './data/chat.db');

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });

export type DbClient = typeof db;