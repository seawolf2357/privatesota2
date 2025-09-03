import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

config({ path: '.env.local' });
config({ path: '.env' });

// Map demo users to actual UUIDs
const USER_ID_MAP: Record<string, string> = {
  'demo-user': '00000000-0000-0000-0000-000000000001',
  'demo-session-1756867320747': '00000000-0000-0000-0000-000000000002',
};

function fixUserId(id: any): string {
  if (typeof id === 'string') {
    // Check if it's already a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (uuidRegex.test(id)) {
      return id;
    }
    // Map known demo IDs or generate new UUID
    return USER_ID_MAP[id] || uuidv4();
  }
  return id;
}

async function importWithFixes() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    console.error('DATABASE_URL_NON_POOLED or DATABASE_URL_DIRECT is required');
    process.exit(1);
  }
  
  const exportDir = './data/export';
  const files = fs.readdirSync(exportDir).filter(f => f.startsWith('data-') && f.endsWith('.json'));
  
  if (files.length === 0) {
    console.error('No export files found');
    process.exit(1);
  }
  
  const latestFile = files.sort().pop()!;
  const dataPath = path.join(exportDir, latestFile);
  
  console.log(`📁 Using export file: ${dataPath}`);
  console.log('🔧 Fixing and importing to Supabase...');
  
  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require',
  });
  
  try {
    const exportData = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));
    
    // Start transaction
    await sql`BEGIN`;
    
    // First, create the demo user if needed
    const demoUserId = USER_ID_MAP['demo-user'];
    await sql`
      INSERT INTO "User" (id, email, password)
      VALUES (${demoUserId}, 'demo@example.com', null)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Demo user created/verified');
    
    // Import tables in correct order (respecting foreign keys)
    const tableOrder = ['Chat', 'Message', 'Message_v2', 'UserMemory', 'UploadedFile', 'SearchCache', 
                       'Document', 'Suggestion', 'Stream', 'Vote', 'Vote_v2'];
    
    for (const tableName of tableOrder) {
      const rows = exportData[tableName];
      if (!rows || rows.length === 0) {
        console.log(`⏭️  Skipping empty table: ${tableName}`);
        continue;
      }
      
      console.log(`\n📥 Importing table: ${tableName} (${rows.length} rows)`);
      
      // Clear existing data
      await sql`DELETE FROM ${sql(tableName)}`;
      
      for (const row of rows) {
        const fixedRow = { ...row };
        
        // Fix UUID fields based on table
        if ('userId' in fixedRow) {
          fixedRow.userId = fixUserId(fixedRow.userId);
        }
        if ('chatId' in fixedRow && typeof fixedRow.chatId === 'string' && !fixedRow.chatId.includes('-')) {
          fixedRow.chatId = fixUserId(fixedRow.chatId);
        }
        if ('sourceSessionId' in fixedRow) {
          fixedRow.sourceSessionId = fixUserId(fixedRow.sourceSessionId);
        }
        if ('messageId' in fixedRow) {
          fixedRow.messageId = fixUserId(fixedRow.messageId);
        }
        if ('documentId' in fixedRow) {
          fixedRow.documentId = fixUserId(fixedRow.documentId);
        }
        
        // Fix JSON fields
        if (typeof fixedRow.metadata === 'string') {
          try {
            fixedRow.metadata = JSON.parse(fixedRow.metadata);
          } catch {
            // Keep as is if not valid JSON
          }
        }
        
        if (typeof fixedRow.content === 'string' && tableName === 'Message') {
          try {
            fixedRow.content = JSON.parse(fixedRow.content);
          } catch {
            // Keep as is
          }
        }
        
        if (typeof fixedRow.parts === 'string') {
          try {
            fixedRow.parts = JSON.parse(fixedRow.parts);
          } catch {
            fixedRow.parts = [];
          }
        }
        
        if (typeof fixedRow.attachments === 'string') {
          try {
            fixedRow.attachments = JSON.parse(fixedRow.attachments);
          } catch {
            fixedRow.attachments = [];
          }
        }
        
        const columns = Object.keys(fixedRow);
        const values = Object.values(fixedRow);
        
        try {
          const columnList = columns.map(col => `"${col}"`).join(', ');
          const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
          
          await sql.unsafe(
            `INSERT INTO "${tableName}" (${columnList}) VALUES (${placeholders})`,
            values
          );
        } catch (error: any) {
          console.error(`   ⚠️  Failed to insert row:`, error.message);
        }
      }
      
      console.log(`   ✅ Imported ${tableName}`);
    }
    
    // Commit transaction
    await sql`COMMIT`;
    
    console.log('\n✅ Import completed with fixes!');
    
    // Show summary
    const summary = await sql`
      SELECT 
        tablename,
        n_live_tup as row_count
      FROM pg_stat_user_tables
      WHERE schemaname = 'public'
      ORDER BY tablename
    `;
    
    console.log('\n📊 Database Summary:');
    summary.forEach((table: any) => {
      if (parseInt(table.row_count) > 0) {
        console.log(`   ${table.tablename}: ${table.row_count} rows`);
      }
    });
    
  } catch (error) {
    await sql`ROLLBACK`;
    console.error('❌ Import failed:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  importWithFixes();
}