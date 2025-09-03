import Database from 'better-sqlite3';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env' });
config({ path: '.env.local' });

async function exportSqliteToJson() {
  const dbPath = process.env.DATABASE_URL_SQLITE || process.env.DATABASE_URL || './data/chat.db';
  const exportDir = './data/export';
  
  if (!fs.existsSync(dbPath)) {
    console.error(`Database file not found: ${dbPath}`);
    process.exit(1);
  }
  
  if (!fs.existsSync(exportDir)) {
    fs.mkdirSync(exportDir, { recursive: true });
  }
  
  const db = new Database(dbPath, { readonly: true });
  
  try {
    console.log('Starting SQLite export...');
    console.log(`Source database: ${dbPath}`);
    
    const tables = db.prepare(`
      SELECT name FROM sqlite_master 
      WHERE type='table' 
      AND name NOT LIKE 'sqlite_%'
      AND name NOT LIKE 'drizzle_%'
    `).all() as { name: string }[];
    
    const exportData: Record<string, any[]> = {};
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    for (const table of tables) {
      const tableName = table.name;
      console.log(`Exporting table: ${tableName}`);
      
      const rows = db.prepare(`SELECT * FROM ${tableName}`).all();
      exportData[tableName] = rows;
      
      console.log(`  - Exported ${rows.length} rows`);
    }
    
    const metadata = {
      exportDate: new Date().toISOString(),
      sourceDatabase: dbPath,
      tables: Object.keys(exportData).map(name => ({
        name,
        rowCount: exportData[name].length
      })),
      totalRows: Object.values(exportData).reduce((sum, rows) => sum + rows.length, 0)
    };
    
    const metadataPath = path.join(exportDir, `metadata-${timestamp}.json`);
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));
    console.log(`\nMetadata saved to: ${metadataPath}`);
    
    const dataPath = path.join(exportDir, `data-${timestamp}.json`);
    fs.writeFileSync(dataPath, JSON.stringify(exportData, null, 2));
    console.log(`Data saved to: ${dataPath}`);
    
    const compactDataPath = path.join(exportDir, `data-${timestamp}.min.json`);
    fs.writeFileSync(compactDataPath, JSON.stringify(exportData));
    console.log(`Compact data saved to: ${compactDataPath}`);
    
    console.log('\n=================================');
    console.log('Export Summary:');
    console.log(`Tables exported: ${metadata.tables.length}`);
    console.log(`Total rows: ${metadata.totalRows}`);
    console.log('=================================');
    
  } catch (error) {
    console.error('Export failed:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

if (require.main === module) {
  exportSqliteToJson();
}