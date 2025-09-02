import { sql } from 'drizzle-orm';
import { db } from '../lib/db';

async function initializeDatabase() {
  try {
    console.log('Creating User table...');
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS User (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        email TEXT NOT NULL,
        password TEXT
      )
    `);
    
    console.log('Creating Chat table...');
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Chat (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        title TEXT NOT NULL,
        userId TEXT NOT NULL,
        visibility TEXT DEFAULT 'private'
      )
    `);
    
    console.log('Creating Message_v2 table...');
    
    await db.run(sql`
      CREATE TABLE IF NOT EXISTS Message_v2 (
        id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
        chatId TEXT NOT NULL,
        role TEXT NOT NULL,
        parts TEXT NOT NULL,
        attachments TEXT DEFAULT '[]',
        createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (chatId) REFERENCES Chat(id)
      )
    `);
    
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