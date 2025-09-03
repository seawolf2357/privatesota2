import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function importJsonToPostgres() {
  const connectionString = process.env.POSTGRES_URL;
  
  if (!connectionString) {
    console.error('POSTGRES_URL environment variable is required');
    process.exit(1);
  }
  
  const exportDir = './data/export';
  const files = fs.readdirSync(exportDir).filter(f => f.startsWith('data-') && f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error('No export files found in ./data/export');
    process.exit(1);
  }
  
  const latestFile = files.sort().pop()!;
  const dataPath = path.join(exportDir, latestFile);
  
  console.log(`Using export file: ${dataPath}`);
  
  const sql = postgres(connectionString, {
    max: 5,
    idle_timeout: 30,
  });
  
  try {
    const exportData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    console.log('Starting PostgreSQL import...');
    console.log('Tables to import:', Object.keys(exportData).join(', '));
    
    await sql`BEGIN`;
    
    for (const [tableName, rows] of Object.entries(exportData)) {
      if (!Array.isArray(rows) || rows.length === 0) {
        console.log(`Skipping empty table: ${tableName}`);
        continue;
      }
      
      console.log(`\nImporting table: ${tableName}`);
      
      await sql`DELETE FROM ${sql(tableName)}`;
      console.log(`  - Cleared existing data`);
      
      const batchSize = 1000;
      for (let i = 0; i < rows.length; i += batchSize) {
        const batch = rows.slice(i, i + batchSize);
        
        for (const row of batch) {
          const columns = Object.keys(row);
          const values = Object.values(row);
          
          const processedValues = values.map(value => {
            if (value === null || value === undefined) return null;
            if (typeof value === 'object') return JSON.stringify(value);
            return value;
          });
          
          const query = `
            INSERT INTO ${tableName} (${columns.join(', ')})
            VALUES (${columns.map((_, idx) => `$${idx + 1}`).join(', ')})
          `;
          
          await sql.unsafe(query, processedValues);
        }
        
        console.log(`  - Imported ${Math.min(i + batchSize, rows.length)}/${rows.length} rows`);
      }
      
      const sequences = await sql`
        SELECT column_name, column_default
        FROM information_schema.columns
        WHERE table_name = ${tableName}
        AND column_default LIKE 'nextval%'
      `;
      
      for (const seq of sequences) {
        const columnName = seq.column_name;
        const maxVal = await sql`
          SELECT MAX(${sql(columnName)}) as max_val
          FROM ${sql(tableName)}
        `;
        
        if (maxVal[0].max_val) {
          const seqName = seq.column_default.match(/nextval\('(.+?)'/)[1];
          await sql`SELECT setval(${seqName}, ${maxVal[0].max_val})`;
          console.log(`  - Reset sequence for ${columnName}`);
        }
      }
    }
    
    await sql`COMMIT`;
    
    console.log('\n=================================');
    console.log('Import completed successfully!');
    console.log('=================================');
    
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  importJsonToPostgres();
}