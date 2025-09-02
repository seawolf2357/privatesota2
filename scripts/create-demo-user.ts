import { sql } from 'drizzle-orm';
import { db } from '../lib/db';

async function createDemoUser() {
  try {
    console.log('Creating demo user...');
    
    await db.run(sql`
      INSERT OR IGNORE INTO User (id, email)
      VALUES ('demo-user', 'demo@example.com')
    `);
    
    console.log('Demo user created successfully!');
  } catch (error) {
    console.error('Error creating demo user:', error);
  }
}

createDemoUser();