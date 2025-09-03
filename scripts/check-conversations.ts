// Script to check dates in Chat table
import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'chat.db');
const db = new Database(dbPath);

console.log('📊 Checking conversation dates...\n');

try {
  // Get all conversations
  const conversations = db.prepare(`
    SELECT id, title, createdAt
    FROM Chat 
    WHERE userId = 'demo-user'
    ORDER BY createdAt DESC
    LIMIT 10
  `).all();

  console.log(`Found ${conversations.length} conversations\n`);

  conversations.forEach((conv: any) => {
    console.log('---');
    console.log(`ID: ${conv.id}`);
    console.log(`Title: ${conv.title}`);
    console.log(`CreatedAt (raw): ${conv.createdAt}`);
    
    if (conv.createdAt) {
      const createdDate = new Date(conv.createdAt);
      console.log(`CreatedAt (parsed): ${createdDate.toLocaleString('ko-KR')}`);
      console.log(`CreatedAt (ISO): ${createdDate.toISOString()}`);
      console.log(`Is valid date: ${!isNaN(createdDate.getTime())}`);
    }
    console.log('');
  });

} catch (error) {
  console.error('Error checking dates:', error);
} finally {
  db.close();
}

console.log('✨ Done!');