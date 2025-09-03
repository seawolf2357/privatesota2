import { config } from 'dotenv';
import postgres from 'postgres';

// Load environment variables
config({ path: '.env.local' });

async function testSupabaseConnection() {
  console.log('🚀 Testing Supabase connection...');
  console.log('📦 Project: zxszrqmeqhxazgabaubz');
  console.log('🌏 Region: ap-northeast-2 (Seoul)');
  console.log('=========================================\n');

  // Test pooled connection (for app)
  const pooledUrl = process.env.DATABASE_URL;
  if (!pooledUrl) {
    console.error('❌ DATABASE_URL not found in .env.local');
    process.exit(1);
  }

  console.log('1️⃣  Testing pooled connection (Transaction mode)...');
  const pooledClient = postgres(pooledUrl, {
    prepare: false, // Required for pgbouncer
    ssl: 'require',
    max: 1,
  });

  try {
    const result = await pooledClient`SELECT version()`;
    console.log('✅ Pooled connection successful!');
    console.log(`   PostgreSQL ${result[0].version.split(' ')[1]}`);
  } catch (error) {
    console.error('❌ Pooled connection failed:', error);
  } finally {
    await pooledClient.end();
  }

  // Test direct connection (for migrations)
  const directUrl = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  if (!directUrl) {
    console.error('❌ DATABASE_URL_NON_POOLED not found in .env.local');
    process.exit(1);
  }

  console.log('\n2️⃣  Testing direct connection (for migrations)...');
  const directClient = postgres(directUrl, {
    ssl: 'require',
    max: 1,
  });

  try {
    const result = await directClient`SELECT current_database(), current_user`;
    console.log('✅ Direct connection successful!');
    console.log(`   Database: ${result[0].current_database}`);
    console.log(`   User: ${result[0].current_user}`);

    // Check tables
    const tables = await directClient`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;

    console.log(`\n📊 Existing tables: ${tables.length}`);
    if (tables.length > 0) {
      tables.forEach(t => console.log(`   - ${t.table_name}`));
    } else {
      console.log('   (No tables found - run migrations first)');
    }

    // Check database size
    const size = await directClient`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log(`\n💾 Database size: ${size[0].size}`);

    // Check extensions
    const extensions = await directClient`
      SELECT extname FROM pg_extension WHERE extname != 'plpgsql'
    `;
    if (extensions.length > 0) {
      console.log('\n🔧 Installed extensions:');
      extensions.forEach(e => console.log(`   - ${e.extname}`));
    }

  } catch (error) {
    console.error('❌ Direct connection failed:', error);
  } finally {
    await directClient.end();
  }

  console.log('\n=========================================');
  console.log('✅ Connection test completed!');
  console.log('\nNext steps:');
  console.log('1. Run: npm run supabase:setup');
  console.log('2. Run: npm run db:migrate:supabase');
  console.log('3. Visit: https://supabase.com/dashboard/project/zxszrqmeqhxazgabaubz');
}

if (require.main === module) {
  testSupabaseConnection().catch(console.error);
}