import { config } from 'dotenv';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

async function runSupabaseMigration() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL_NON_POOLED or DATABASE_URL_DIRECT is required for migrations');
  }
  
  console.log('🚀 Starting Supabase migration...');
  console.log('📦 Project: zxszrqmeqhxazgabaubz');
  
  // Use direct connection for migrations
  const migrationClient = postgres(connectionString, { 
    max: 1,
    ssl: 'require',
  });
  
  const db = drizzle(migrationClient);
  
  try {
    await migrate(db, {
      migrationsFolder: './lib/db/migrations-supabase',
    });
    
    console.log('✅ Migration completed successfully!');
    
    // Verify tables
    const result = await migrationClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log('\n📊 Created tables:');
    result.forEach((row: any) => {
      console.log(`   - ${row.table_name}`);
    });
    
    // Check RLS status
    const rlsStatus = await migrationClient`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log('\n🔒 Row Level Security status:');
    rlsStatus.forEach((row: any) => {
      const status = row.rowsecurity ? '✅ Enabled' : '⚠️  Disabled';
      console.log(`   - ${row.tablename}: ${status}`);
    });
    
    await migrationClient.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    await migrationClient.end();
    process.exit(1);
  }
}

runSupabaseMigration();