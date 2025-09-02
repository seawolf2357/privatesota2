import { sql } from 'drizzle-orm';
import { db } from '../lib/db';

async function initializeDatabase() {
  try {
    console.log('Creating UserMemory table...');
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS UserMemory (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        userId TEXT NOT NULL,
        category TEXT NOT NULL CHECK(category IN ('personal_info', 'preferences', 'important_dates', 'tasks', 'notes', 'general')),
        content TEXT NOT NULL,
        confidence REAL DEFAULT 1.0,
        sourceSessionId TEXT,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id)
      )
    `);

    console.log('Creating UploadedFile table...');
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS UploadedFile (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        userId TEXT NOT NULL,
        filename TEXT NOT NULL,
        fileType TEXT NOT NULL,
        originalContent TEXT NOT NULL,
        processedContent TEXT NOT NULL,
        metadata TEXT,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (userId) REFERENCES User(id)
      )
    `);

    console.log('Creating SearchCache table...');
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS SearchCache (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        query TEXT NOT NULL UNIQUE,
        results TEXT NOT NULL,
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('Database tables created successfully!');
  } catch (error) {
    console.error('Error creating database tables:', error);
  }
}

initializeDatabase();