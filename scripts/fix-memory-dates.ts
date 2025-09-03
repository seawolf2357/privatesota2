// Script to fix invalid dates in UserMemory table
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'chat.db');
const db = new Database(dbPath);

console.log('🔧 Fixing memory dates...');

try {
  // Check current dates
  const memories = db.prepare(`
    SELECT id, createdAt, updatedAt 
    FROM UserMemory 
    WHERE createdAt IS NULL 
       OR updatedAt IS NULL 
       OR createdAt < 1000000000000
       OR updatedAt < 1000000000000
  `).all();

  console.log(`Found ${memories.length} memories with invalid dates`);

  if (memories.length > 0) {
    // Update invalid dates to current timestamp
    const now = new Date().toISOString();
    
    const updateStmt = db.prepare(`
      UPDATE UserMemory 
      SET createdAt = ?, updatedAt = ? 
      WHERE id = ?
    `);

    const updateTransaction = db.transaction((memories) => {
      for (const memory of memories) {
        updateStmt.run(now, now, memory.id);
      }
    });

    updateTransaction(memories);
    
    console.log(`✅ Fixed ${memories.length} memory dates`);
  }

  // Verify the fix
  const verifyCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM UserMemory 
    WHERE createdAt IS NULL 
       OR updatedAt IS NULL 
       OR createdAt < 1000000000000
       OR updatedAt < 1000000000000
  `).get();

  console.log(`Remaining invalid dates: ${verifyCount.count}`);

} catch (error) {
  console.error('Error fixing dates:', error);
} finally {
  db.close();
}

console.log('✨ Done!');