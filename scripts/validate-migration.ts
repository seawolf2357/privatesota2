import Database from 'better-sqlite3';
import postgres from 'postgres';
import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.local' });

interface TableInfo {
  name: string;
  rowCount: number;
  checksum?: string;
}

interface ValidationResult {
  table: string;
  sqliteCount: number;
  postgresCount: number;
  match: boolean;
  details?: string;
}

async function getTableHash(rows: any[]): Promise<string> {
  const crypto = await import('crypto');
  const sortedRows = rows.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const content = JSON.stringify(sortedRows);
  return crypto.createHash('md5').update(content).digest('hex');
}

async function validateMigration() {
  const sqlitePath = process.env.DATABASE_URL || './data/chat.db';
  const postgresUrl = process.env.POSTGRES_URL;
  
  if (!postgresUrl) {
    console.error('POSTGRES_URL environment variable is required');
    process.exit(1);
  }
  
  console.log('Starting migration validation...');
  console.log('=================================');
  
  const sqlite = new Database(sqlitePath, { readonly: true });
  const sql = postgres(postgresUrl, {
    max: 5,
    idle_timeout: 30,
  });
  
  try {
    const sqliteTables = sqlite.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE 'drizzle_%'
      ORDER BY name
    `).all() as { name: string }[];
    
    const postgresTables = await sql`
      SELECT tablename as name 
      FROM pg_tables 
      WHERE schemaname = 'public'
      AND tablename NOT LIKE 'drizzle_%'
      ORDER BY tablename
    `;
    
    console.log(`SQLite tables: ${sqliteTables.length}`);
    console.log(`PostgreSQL tables: ${postgresTables.length}`);
    console.log('');
    
    const results: ValidationResult[] = [];
    
    for (const table of sqliteTables) {
      const tableName = table.name;
      
      const postgresTable = postgresTables.find(t => t.name === tableName);
      if (!postgresTable) {
        results.push({
          table: tableName,
          sqliteCount: -1,
          postgresCount: 0,
          match: false,
          details: 'Table not found in PostgreSQL'
        });
        continue;
      }
      
      const sqliteRows = sqlite.prepare(`SELECT * FROM ${tableName}`).all();
      const postgresRows = await sql.unsafe(`SELECT * FROM ${tableName}`);
      
      const sqliteCount = sqliteRows.length;
      const postgresCount = postgresRows.length;
      
      let match = sqliteCount === postgresCount;
      let details = '';
      
      if (match && sqliteCount > 0) {
        const sqliteHash = await getTableHash(sqliteRows);
        const postgresHash = await getTableHash(postgresRows);
        
        if (sqliteHash !== postgresHash) {
          match = false;
          details = 'Row counts match but data differs';
          
          const sampleSize = Math.min(5, sqliteCount);
          const sqliteSample = sqliteRows.slice(0, sampleSize).map(r => r.id || r.uuid || JSON.stringify(r).substring(0, 50));
          const postgresSample = postgresRows.slice(0, sampleSize).map(r => r.id || r.uuid || JSON.stringify(r).substring(0, 50));
          
          details += `\n  SQLite sample IDs: ${sqliteSample.join(', ')}`;
          details += `\n  PostgreSQL sample IDs: ${postgresSample.join(', ')}`;
        }
      }
      
      results.push({
        table: tableName,
        sqliteCount,
        postgresCount,
        match,
        details
      });
    }
    
    console.log('Validation Results:');
    console.log('=================================');
    
    let allMatch = true;
    
    for (const result of results) {
      const status = result.match ? '✓' : '✗';
      const counts = `SQLite: ${result.sqliteCount}, PostgreSQL: ${result.postgresCount}`;
      
      console.log(`${status} ${result.table}: ${counts}`);
      
      if (result.details) {
        console.log(`  ${result.details}`);
      }
      
      if (!result.match) {
        allMatch = false;
      }
    }
    
    console.log('');
    console.log('=================================');
    
    if (allMatch) {
      console.log('✓ All tables validated successfully!');
      console.log('Migration data is consistent between SQLite and PostgreSQL.');
    } else {
      console.log('✗ Validation failed!');
      console.log('Some tables have inconsistent data. Please review the details above.');
      process.exit(1);
    }
    
    const sqliteSize = sqlite.prepare("SELECT page_count * page_size as size FROM pragma_page_count(), pragma_page_size()").get() as { size: number };
    const postgresSize = await sql`
      SELECT pg_database_size(current_database()) as size
    `;
    
    console.log('');
    console.log('Database Sizes:');
    console.log(`SQLite: ${(sqliteSize.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`PostgreSQL: ${(postgresSize[0].size / 1024 / 1024).toFixed(2)} MB`);
    
  } catch (error) {
    console.error('Validation failed:', error);
    process.exit(1);
  } finally {
    sqlite.close();
    await sql.end();
  }
}

if (require.main === module) {
  validateMigration();
}