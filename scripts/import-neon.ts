import { neon } from '@neondatabase/serverless';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

async function importJsonToNeon() {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    console.error('POSTGRES_URL environment variable is required');
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
  
  const sql = neon(connectionString);
  
  try {
    const exportData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    console.log('🚀 Starting Neon import...');
    console.log('📊 Tables to import:', Object.keys(exportData).join(', '));
    
    // Start transaction
    await sql('BEGIN');
    
    for (const [tableName, rows] of Object.entries(exportData)) {
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`⏭️  Skipping empty table: ${tableName}`);
        continue;
      }
      
      console.log(`\n📥 Importing table: ${tableName}`);
      
      // Clear existing data
      await sql(`DELETE FROM ${tableName}`);
      console.log(`   ✓ Cleared existing data`);
      
      // Import in batches
      const batchSize = 100;
      let imported = 0;
      
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          
          // Process values
          const processedValues = values.map(value => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          });
          
          // Build parameterized query
          const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
          const columnList = columns.map(col => `"${col}"`).join(', ');
          
          const query = `
            INSERT INTO "${tableName}" (${columnList})
            VALUES (${placeholders})
          `;
          
          await sql(query, processedValues);
        }
        
        imported = Math.min(i + batchSize, rows.length);
        console.log(`   ✓ Imported ${imported}/${rows.length} rows`);
      }
      
      // Reset sequences for auto-increment columns
      const sequences = await sql(`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = '${tableName}'
        AND column_default LIKE 'nextval%'
      `);
      
      for (const seq of sequences) {
        const columnName = seq.column_name;
        const result = await sql(`
          SELECT MAX("${columnName}") as max_val
          FROM "${tableName}"
        `);
        
        const maxVal = result[0]?.max_val;
        if (maxVal) {
          const seqMatch = seq.column_default.match(/nextval\('(.+?)'/);
          if (seqMatch) {
            const seqName = seqMatch[1];
            await sql(`SELECT setval('${seqName}', ${maxVal})`);
            console.log(`   ✓ Reset sequence for ${columnName}`);
          }
        }
      }
    }
    
    // Commit transaction
    await sql('COMMIT');
    
    console.log('\n✅ ================================');
    console.log('✅ Import completed successfully!');
    console.log('✅ ================================');
    
    // Show summary
    const summary = await sql(`
      SELECT 
        schemaname,
        tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `);
    
    console.log('\n📊 Database Summary:');
    console.log('─────────────────────');
    summary.forEach((table: any) => {
      console.log(`${table.tablename}: ${table.row_count} rows`);
    });
    
  } catch (error) {
    await sql('ROLLBACK');
    console.error('❌ Import failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  importJsonToNeon();
}