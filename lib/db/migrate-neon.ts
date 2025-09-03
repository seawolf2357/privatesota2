import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/neon-http/migrator';
import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function runMigration() {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    throw new Error('POSTGRES_URL is not defined');
  }
  
  console.log('🔄 Starting Neon migration...');
  console.log(`📦 Database: ${connectionString.split('@')[1]?.split('/')[0] || 'unknown'}`);
  
  try {
    const sql = neon(connectionString);
    const db = drizzle(sql);
    
    await migrate(db, {
      migrationsFolder: './lib/db/migrations-neon',
    });
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables
    const result = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name
    `;
    
    console.log('\n📊 Created tables:');
    result.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigration();