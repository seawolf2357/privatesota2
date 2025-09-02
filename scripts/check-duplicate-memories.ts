import { db } from '../lib/db';
import { userMemory } from '../lib/db/schema';
import { sql } from 'drizzle-orm';

async function checkDuplicates() {
  try {
    // Get all memories for demo-user
    const result = await db.all(sql`
      SELECT category, content, COUNT(*) as count 
      FROM UserMemory 
      WHERE userId = 'demo-user' 
      GROUP BY category, content 
      HAVING count > 1
    `);
    
    if (result.length > 0) {
      console.log('Found duplicate memories:');
      result.forEach((row: any) => {
        console.log(`- Category: ${row.category}, Content: "${row.content.substring(0, 50)}...", Count: ${row.count}`);
      });
      
      // Clean up duplicates - keep only one of each
      console.log('\nCleaning up duplicates...');
      
      for (const row of result) {
        const duplicates = await db.all(sql`
          SELECT id 
          FROM UserMemory 
          WHERE userId = 'demo-user' 
          AND category = ${row.category} 
          AND content = ${row.content}
          ORDER BY updatedAt DESC
        `);
        
        // Keep the most recent one, delete the rest
        if (duplicates.length > 1) {
          const idsToDelete = duplicates.slice(1).map((d: any) => d.id);
          for (const id of idsToDelete) {
            await db.run(sql`DELETE FROM UserMemory WHERE id = ${id}`);
            console.log(`  Deleted duplicate memory: ${id}`);
          }
        }
      }
      
      console.log('\nDuplicate cleanup complete!');
    } else {
      console.log('No duplicate memories found.');
    }
    
    // Show current memory count
    const count = await db.get(sql`
      SELECT COUNT(*) as total 
      FROM UserMemory 
      WHERE userId = 'demo-user'
    `);
    
    console.log(`\nTotal memories for demo-user: ${count?.total || 0}`);
    
  } catch (error) {
    console.error('Error checking duplicates:', error);
  }
}

checkDuplicates();