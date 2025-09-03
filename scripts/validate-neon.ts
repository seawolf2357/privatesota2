import Database from 'better-sqlite3';
import { neon } from '@neondatabase/serverless';
import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.local' });

interface ValidationResult {
  table: string;
  sqliteCount: number;
  neonCount: number;
  match: boolean;
  details?: string;
}

async function validateNeonMigration() {
  const sqlitePath = process.env.DATABASE_URL || './data/chat.db';
  const neonUrl = process.env.POSTGRES_URL;
  
  if (!neonUrl) {
    console.error('POSTGRES_URL environment variable is required');
    process.exit(1);
  }
  
  console.log('🔍 Starting Neon migration validation...');
  console.log('=========================================\n');
  
  const sqlite = new Database(sqlitePath, { readonly: true });
  const sql = neon(neonUrl);
  
  try {
    // Get SQLite tables
    const sqliteTables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE 'drizzle_%'
      ORDER BY name
    `).all() as { name: string }[];
    
    // Get Neon tables
    const neonTables = await sql`
      SELECT tablename as name 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'drizzle_%'
      ORDER BY tablename
    `;
    
    console.log(`📁 SQLite tables: ${sqliteTables.length}`);
    console.log(`☁️  Neon tables: ${neonTables.length}`);
    console.log('');
    
    const results: ValidationResult[] = [];
    let totalSqliteRows = 0;
    let totalNeonRows = 0;
    
    for (const table of sqliteTables) {
      const tableName = table.name;
      
      // Check if table exists in Neon
      const neonTable = neonTables.find(t => t.name === tableName);
      if (!neonTable) {
        results.push({
          table: tableName,
          sqliteCount: -1,
          neonCount: 0,
          match: false,
          details: 'Table not found in Neon'
        });
        continue;
      }
      
      // Count rows in SQLite
      const sqliteResult = sqlite.prepare(`SELECT COUNT(*) as count FROM ${tableName}`).get() as { count: number };
      const sqliteCount = sqliteResult.count;
      totalSqliteRows += sqliteCount;
      
      // Count rows in Neon
      const neonResult = await sql(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const neonCount = Number(neonResult[0].count);
      totalNeonRows += neonCount;
      
      const match = sqliteCount === neonCount;
      let details = '';
      
      if (!match) {
        const diff = neonCount - sqliteCount;
        details = diff > 0 
          ? `Neon has ${diff} more rows`
          : `SQLite has ${Math.abs(diff)} more rows`;
      }
      
      results.push({
        table: tableName,
        sqliteCount,
        neonCount,
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
      'Neon'.padStart(countWidth) + 
      '  Status'
    );
    console.log('─'.repeat(tableWidth + countWidth * 2 + 10));
    
    for (const result of results) {
      const status = result.match ? '✅' : '❌';
      
      console.log(
        result.table.padEnd(tableWidth) +
        result.sqliteCount.toString().padStart(countWidth) +
        result.neonCount.toString().padStart(countWidth) +
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
      totalNeonRows.toString().padStart(countWidth)
    );
    
    console.log('\n=========================================');
    
    if (allMatch) {
      console.log('✅ All tables validated successfully!');
      console.log('✅ Migration data is consistent between SQLite and Neon.');
    } else {
      console.log('❌ Validation failed!');
      console.log('❌ Some tables have inconsistent data.');
      console.log('   Please review the details above.');
    }
    
    // Database size comparison
    console.log('\n📦 Database Sizes:');
    console.log('─────────────────────');
    
    const sqliteSize = sqlite.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
    console.log(`SQLite: ${(sqliteSize.size / 1024 / 1024).toFixed(2)} MB`);
    
    const neonSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log(`Neon:   ${neonSize[0].size}`);
    
    // Performance test
    console.log('\n⚡ Performance Test:');
    console.log('─────────────────────');
    
    const testQuery = 'SELECT COUNT(*) FROM user';
    
    // SQLite timing
    const sqliteStart = Date.now();
    try {
      sqlite.prepare(testQuery).get();
      const sqliteTime = Date.now() - sqliteStart;
      console.log(`SQLite query time: ${sqliteTime}ms`);
    } catch (e) {
      console.log('SQLite query failed (table may not exist)');
    }
    
    // Neon timing
    const neonStart = Date.now();
    try {
      await sql(testQuery);
      const neonTime = Date.now() - neonStart;
      console.log(`Neon query time:   ${neonTime}ms`);
    } catch (e) {
      console.log('Neon query failed (table may not exist)');
    }
    
    process.exit(allMatch ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Validation failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
  }
}

if (require.main === module) {
  validateNeonMigration();
}