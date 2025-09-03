import Database from 'better-sqlite3';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.local' });

interface ValidationResult {
  table: string;
  sqliteCount: number;
  supabaseCount: number;
  match: boolean;
  details?: string;
}

async function validateSupabaseMigration() {
  const sqlitePath = process.env.DATABASE_URL || './data/chat.db';
  const supabaseUrl = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT || process.env.DATABASE_URL;
  
  if (!supabaseUrl) {
    console.error('Supabase DATABASE_URL is required');
    process.exit(1);
  }
  
  console.log('🔍 Starting Supabase migration validation...');
  console.log('📦 Project: zxszrqmeqhxazgabaubz');
  console.log('=========================================\n');
  
  const sqlite = new Database(sqlitePath, { readonly: true });
  const sql = postgres(supabaseUrl, {
    max: 1,
    ssl: 'require',
  });
  
  try {
    // Get SQLite tables
    const sqliteTables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE 'drizzle_%'
      ORDER BY name
    `).all() as { name: string }[];
    
    // Get Supabase tables
    const supabaseTables = await sql`
      SELECT tablename as name 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'drizzle_%'
      ORDER BY tablename
    `;
    
    console.log(`📁 SQLite tables: ${sqliteTables.length}`);
    console.log(`☁️  Supabase tables: ${supabaseTables.length}`);
    console.log('');
    
    const results: ValidationResult[] = [];
    let totalSqliteRows = 0;
    let totalSupabaseRows = 0;
    
    for (const table of sqliteTables) {
      const tableName = table.name;
      
      // Check if table exists in Supabase
      const supabaseTable = supabaseTables.find(t => t.name === tableName);
      if (!supabaseTable) {
        results.push({
          table: tableName,
          sqliteCount: -1,
          supabaseCount: 0,
          match: false,
          details: 'Table not found in Supabase'
        });
        continue;
      }
      
      // Count rows in SQLite
      const sqliteResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      const sqliteCount = sqliteResult.count;
      totalSqliteRows += sqliteCount;
      
      // Count rows in Supabase
      const supabaseResult = await sql`SELECT COUNT(*) as count FROM ${sql(tableName)}`;
      const supabaseCount = Number(supabaseResult[0].count);
      totalSupabaseRows += supabaseCount;
      
      const match = sqliteCount === supabaseCount;
      let details = '';
      
      if (!match) {
        const diff = supabaseCount - sqliteCount;
        details = diff > 0 
          ? `Supabase has ${diff} more rows`
          : `SQLite has ${Math.abs(diff)} more rows`;
      }
      
      results.push({
        table: tableName,
        sqliteCount,
        supabaseCount,
        match,
        details
      });
    }
    
    // Display results
    console.log('📊 Validation Results:');
    console.log('─────────────────────────────────────────');
    
    let allMatch = true;
    const tableWidth = 25;
    const countWidth = 12;
    
    console.log(
      'Table'.padEnd(tableWidth) + 
      'SQLite'.padStart(countWidth) + 
      'Supabase'.padStart(countWidth) + 
      '  Status'
    );
    console.log('─'.repeat(tableWidth + countWidth * 2 + 10));
    
    for (const result of results) {
      const status = result.match ? '✅' : '❌';
      
      console.log(
        result.table.padEnd(tableWidth) +
        result.sqliteCount.toString().padStart(countWidth) +
        result.supabaseCount.toString().padStart(countWidth) +
        `  ${status}`
      );
      
      if (result.details) {
        console.log(`  ↳ ${result.details}`);
      }
      
      if (!result.match) {
        allMatch = false;
      }
    }
    
    console.log('─'.repeat(tableWidth + countWidth * 2 + 10));
    console.log(
      'TOTAL'.padEnd(tableWidth) +
      totalSqliteRows.toString().padStart(countWidth) +
      totalSupabaseRows.toString().padStart(countWidth)
    );
    
    console.log('\n=========================================');
    
    if (allMatch) {
      console.log('✅ All tables validated successfully!');
      console.log('✅ Migration data is consistent.');
    } else {
      console.log('❌ Validation failed!');
      console.log('❌ Some tables have inconsistent data.');
    }
    
    // Database size comparison
    console.log('\n📦 Database Sizes:');
    console.log('─────────────────────');
    
    const sqliteSize = sqlite.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
    console.log(`SQLite:   ${(sqliteSize.size / 1024 / 1024).toFixed(2)} MB`);
    
    const supabaseSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log(`Supabase: ${supabaseSize[0].size}`);
    
    // RLS Status
    console.log('\n🔒 Row Level Security Status:');
    console.log('─────────────────────');
    
    const rlsStatus = await sql`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'drizzle_%'
      ORDER BY tablename
    `;
    
    rlsStatus.forEach((row: any) => {
      const status = row.rowsecurity ? '✅ Enabled' : '⚠️  Disabled';
      console.log(`${row.tablename}: ${status}`);
    });
    
    // Performance test
    console.log('\n⚡ Performance Test:');
    console.log('─────────────────────');
    
    const testQuery = 'user';
    
    // SQLite timing
    const sqliteStart = Date.now();
    try {
      sqlite.prepare(`SELECT COUNT(*) FROM ${testQuery}`).get();
      const sqliteTime = Date.now() - sqliteStart;
      console.log(`SQLite query time:   ${sqliteTime}ms`);
    } catch (e) {
      console.log('SQLite: Table "user" not found');
    }
    
    // Supabase timing
    const supabaseStart = Date.now();
    try {
      await sql`SELECT COUNT(*) FROM ${sql(testQuery)}`;
      const supabaseTime = Date.now() - supabaseStart;
      console.log(`Supabase query time: ${supabaseTime}ms`);
    } catch (e) {
      console.log('Supabase: Table "user" not found');
    }
    
    // Connection info
    console.log('\n🔗 Connection Info:');
    console.log('─────────────────────');
    console.log(`Project URL: https://zxszrqmeqhxazgabaubz.supabase.co`);
    console.log(`Region: ${supabaseUrl.includes('aws-0') ? 'AWS' : 'Unknown'}`);
    
    const version = await sql`SELECT version()`;
    console.log(`PostgreSQL: ${version[0].version.split(' ')[1]}`);
    
    process.exit(allMatch ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
    await sql.end();
  }
}

if (require.main === module) {
  validateSupabaseMigration();
}