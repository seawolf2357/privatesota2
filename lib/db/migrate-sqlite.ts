import 'dotenv/config';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as fs from 'fs';
import * as path from 'path';

async function runMigrate() {
  console.log('⏳ Running SQLite migrations...');
  
  const dbPath = process.env.SQLITE_PATH || './data/chat.db';
  
  // Ensure data directory exists
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
  
  // Create SQLite connection
  const sqlite = new Database(dbPath);
  const db = drizzle(sqlite);
  
  // Enable WAL mode
  sqlite.pragma('journal_mode = WAL');
  
  try {
    // Run migrations
    await migrate(db, { 
      migrationsFolder: './lib/db/migrations-sqlite' 
    });
    
    console.log('✅ SQLite migrations completed successfully');
    console.log(`📦 Database location: ${dbPath}`);
  } catch (error) {
    console.error('❌ Migration failed');
    console.error(error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

runMigrate().catch((err) => {
  console.error('Migration error:', err);
  process.exit(1);
});