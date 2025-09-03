import { config } from 'dotenv';
import postgres from 'postgres';

config({ path: '.env.local' });

async function checkSupabaseData() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL_NON_POOLED is required');
  }
  
  console.log('📊 Checking Supabase data...');
  console.log('=========================================\n');
  
  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require',
  });
  
  try {
    // Check each table
    const tables = ['User', 'Chat', 'Message', 'Message_v2', 'UserMemory'];
    
    for (const table of tables) {
      const result = await sql`
        SELECT COUNT(*) as count FROM ${sql(table)}
      `;
      
      const count = parseInt(result[0].count);
      
      if (count > 0) {
        console.log(`✅ ${table}: ${count} rows`);
        
        // Show sample data
        const sample = await sql`
          SELECT * FROM ${sql(table)} LIMIT 2
        `;
        
        if (sample.length > 0) {
          console.log(`   Sample data:`);
          sample.forEach((row: any) => {
            const preview = Object.entries(row)
              .slice(0, 3)
              .map(([k, v]) => `${k}: ${JSON.stringify(v).substring(0, 50)}`)
              .join(', ');
            console.log(`   - ${preview}`);
          });
        }
      } else {
        console.log(`⚠️  ${table}: empty`);
      }
      console.log('');
    }
    
    // Check relationships
    console.log('🔗 Checking relationships:');
    
    const chats = await sql`
      SELECT c.id, c.title, u.email 
      FROM "Chat" c
      JOIN "User" u ON c."userId" = u.id
      LIMIT 5
    `;
    
    if (chats.length > 0) {
      console.log('✅ Chat-User relationship working');
      chats.forEach((chat: any) => {
        console.log(`   - ${chat.title} (${chat.email})`);
      });
    }
    
    const messages = await sql`
      SELECT m.id, m.role, c.title 
      FROM "Message_v2" m
      JOIN "Chat" c ON m."chatId" = c.id
      LIMIT 5
    `;
    
    if (messages.length > 0) {
      console.log('\n✅ Message-Chat relationship working');
      messages.forEach((msg: any) => {
        console.log(`   - ${msg.role} message in "${msg.title}"`);
      });
    }
    
    console.log('\n=========================================');
    console.log('✅ Data check completed!');
    
  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  checkSupabaseData().catch(console.error);
}