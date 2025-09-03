// Script to check dates in UserMemory table
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'chat.db');
const db = new Database(dbPath);

console.log('📊 Checking memory dates...\n');

try {
  // Get all memories
  const memories = db.prepare(`
    SELECT id, category, content, createdAt, updatedAt 
    FROM UserMemory 
    ORDER BY updatedAt DESC
    LIMIT 10
  `).all();

  console.log(`Found ${memories.length} memories\n`);

  memories.forEach((memory: any) => {
    console.log('---');
    console.log(`ID: ${memory.id}`);
    console.log(`Category: ${memory.category}`);
    console.log(`Content: ${memory.content.substring(0, 50)}...`);
    console.log(`CreatedAt (raw): ${memory.createdAt}`);
    console.log(`UpdatedAt (raw): ${memory.updatedAt}`);
    
    if (memory.createdAt) {
      const createdDate = new Date(memory.createdAt);
      console.log(`CreatedAt (parsed): ${createdDate.toLocaleString('ko-KR')}`);
      console.log(`CreatedAt (ISO): ${createdDate.toISOString()}`);
    }
    
    if (memory.updatedAt) {
      const updatedDate = new Date(memory.updatedAt);
      console.log(`UpdatedAt (parsed): ${updatedDate.toLocaleString('ko-KR')}`);
      console.log(`UpdatedAt (ISO): ${updatedDate.toISOString()}`);
    }
    console.log('');
  });

} catch (error) {
  console.error('Error checking dates:', error);
} finally {
  db.close();
}

console.log('✨ Done!');