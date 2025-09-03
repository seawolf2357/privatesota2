import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

async function importJsonToSupabase() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    console.error('DATABASE_URL_NON_POOLED or DATABASE_URL_DIRECT is required');
    process.exit(1);
  }
  
  const exportDir = './data/export';
  
  if (!fs.existsSync(exportDir)) {
    console.error(`Export directory not found: ${exportDir}`);
    console.log('Please run "npm run db:export:sqlite" first');
    process.exit(1);
  }
  
  const files = fs.readdirSync(exportDir).filter(f => f.startsWith('data-') && f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error('No export files found in ./data/export');
    process.exit(1);
  }
  
  const latestFile = files.sort().pop()!;
  const dataPath = path.join(exportDir, latestFile);
  
  console.log(`📁 Using export file: ${dataPath}`);
  console.log('🚀 Starting Supabase import...');
  console.log('📦 Project: zxszrqmeqhxazgabaubz');
  
  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require',
  });
  
  try {
    const exportData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    console.log('📊 Tables to import:', Object.keys(exportData).join(', '));
    
    // Start transaction
    await sql`BEGIN`;
    
    // Disable RLS temporarily for import
    const tables = Object.keys(exportData);
    for (const table of tables) {
      await sql`ALTER TABLE ${sql(table)} DISABLE ROW LEVEL SECURITY`;
    }
    
    for (const [tableName, rows] of Object.entries(exportData)) {
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`⏭️  Skipping empty table: ${tableName}`);
        continue;
      }
      
      console.log(`\n📥 Importing table: ${tableName}`);
      
      // Clear existing data
      await sql`DELETE FROM ${sql(tableName)}`;
      console.log(`   ✓ Cleared existing data`);
      
      // Import in batches
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          
          // Process values for PostgreSQL
          const processedValues = values.map(value => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object') return JSON.stringify(value);
            if (typeof value === 'boolean') return value;
            return value;
          });
          
          try {
            // Build dynamic insert query
            const columnList = columns.map(col => `"${col}"`).join(', ');
            const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
            
            await sql.unsafe(
              `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
              processedValues
            );
          } catch (error: any) {
            console.error(`   ❌ Failed to insert row:`, error.message);
            console.log(`      Columns: ${columns.join(', ')}`);
            console.log(`      Values: ${processedValues.slice(0, 3).join(', ')}...`);
          }
        }
        
        imported = Math.min(i + batchSize, rows.length);
        console.log(`   ✓ Imported ${imported}/${rows.length} rows`);
      }
      
      // Reset sequences for auto-increment columns
      const sequences = await sql`
        SELECT 
          column_name, 
          column_default
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        AND table_schema = 'public'
        AND column_default LIKE 'nextval%'
      `;
      
      for (const seq of sequences) {
        const columnName = seq.column_name;
        const result = await sql`
          SELECT MAX(${sql(columnName)}) as max_val
          FROM ${sql(tableName)}
        `;
        
        const maxVal = result[0]?.max_val;
        if (maxVal) {
          const seqMatch = seq.column_default.match(/nextval\('(.+?)'/);
          if (seqMatch) {
            const seqName = seqMatch[1];
            await sql`SELECT setval(${seqName}, ${maxVal})`;
            console.log(`   ✓ Reset sequence for ${columnName}`);
          }
        }
      }
    }
    
    // Re-enable RLS
    console.log('\n🔒 Re-enabling Row Level Security...');
    for (const table of tables) {
      await sql`ALTER TABLE ${sql(table)} ENABLE ROW LEVEL SECURITY`;
      console.log(`   ✓ RLS enabled for ${table}`);
    }
    
    // Commit transaction
    await sql`COMMIT`;
    
    console.log('\n✅ ================================');
    console.log('✅ Import completed successfully!');
    console.log('✅ ================================');
    
    // Show summary
    const summary = await sql`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log('\n📊 Database Summary:');
    console.log('─────────────────────');
    let totalRows = 0;
    summary.forEach((table: any) => {
      console.log(`${table.tablename}: ${table.row_count} rows`);
      totalRows += parseInt(table.row_count);
    });
    console.log('─────────────────────');
    console.log(`Total: ${totalRows} rows`);
    
    // Show database size
    const dbSize = await sql`
      SELECT pg_size_pretty(pg_database_size(current_database())) as size
    `;
    console.log(`\n💾 Database size: ${dbSize[0].size}`);
    
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  importJsonToSupabase();
}