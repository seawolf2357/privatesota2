import postgres from 'postgres';
import fs from 'fs';
import path from 'path';
import { config } from 'dotenv';

config({ path: '.env.local' });

async function simpleImport() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    console.error('DATABASE_URL_NON_POOLED is required');
    process.exit(1);
  }
  
  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require',
  });
  
  try {
    console.log('🚀 Simple import to Supabase...\n');
    
    // 1. Create demo user first
    const demoUserId = '00000000-0000-0000-0000-000000000001';
    await sql`
      INSERT INTO "User" (id, email, password)
      VALUES (${demoUserId}, 'demo@example.com', null)
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Created demo user');
    
    // 2. Create demo chats
    const chat1Id = '4e9ac0a2-a7ef-43ab-965d-855f3d1f2106';
    const chat2Id = 'b87cefcf-de34-4d9d-af8a-59c8847a2220';
    
    await sql`
      INSERT INTO "Chat" (id, "createdAt", title, "userId", visibility)
      VALUES 
        (${chat1Id}, ${new Date('2025-09-03T02:42:16.718Z')}, 'AI 소개 및 인사', ${demoUserId}, 'private'),
        (${chat2Id}, ${new Date('2025-09-03T03:17:03.596Z')}, 'jetXA 소개', ${demoUserId}, 'private')
      ON CONFLICT (id) DO NOTHING
    `;
    console.log('✅ Created 2 chats');
    
    // 3. Create messages
    const messages = [
      {
        id: '5054f0f4-8cc8-42e5-9b36-9a58e9e91b12',
        chatId: chat1Id,
        role: 'user',
        parts: JSON.stringify([{type: 'text', text: '안녕?'}]),
        attachments: JSON.stringify([]),
        createdAt: new Date('2025-09-03T02:42:16.718Z')
      },
      {
        id: '92fb6d08-ef88-4f57-901b-24d9f982d623',
        chatId: chat1Id,
        role: 'assistant',
        parts: JSON.stringify([{type: 'text', text: '안녕하세요! 만나서 반갑습니다.'}]),
        attachments: JSON.stringify([]),
        createdAt: new Date('2025-09-03T02:42:26.308Z')
      }
    ];
    
    for (const msg of messages) {
      await sql`
        INSERT INTO "Message_v2" (id, "chatId", role, parts, attachments, "createdAt")
        VALUES (${msg.id}, ${msg.chatId}, ${msg.role}, ${msg.parts}, ${msg.attachments}, ${msg.createdAt})
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log('✅ Created 2 messages');
    
    // 4. Create user memories (without foreign key to Chat)
    const memories = [
      {
        id: '4ef8f375-e9fc-49a5-8eee-1cbf3eda700c',
        userId: demoUserId,
        category: 'important_dates',
        content: '현재 날짜: 2025년 9월 3일',
        confidence: JSON.stringify(1),
        metadata: JSON.stringify({source: 'demo'}),
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSessionId: null  // Avoid foreign key issue
      },
      {
        id: '45e92a15-cf31-4709-8550-35275f234ad9',
        userId: demoUserId,
        category: 'preferences',
        content: '사용자는 노래 듣기를 선호함',
        confidence: JSON.stringify(0.8),
        metadata: JSON.stringify({source: 'demo'}),
        createdAt: new Date(),
        updatedAt: new Date(),
        sourceSessionId: null
      }
    ];
    
    for (const mem of memories) {
      await sql`
        INSERT INTO "UserMemory" (
          id, "userId", category, content, confidence, 
          metadata, "createdAt", "updatedAt", "sourceSessionId"
        )
        VALUES (
          ${mem.id}, ${mem.userId}, ${mem.category}, ${mem.content}, 
          ${mem.confidence}, ${mem.metadata}, ${mem.createdAt}, 
          ${mem.updatedAt}, ${mem.sourceSessionId}
        )
        ON CONFLICT (id) DO NOTHING
      `;
    }
    console.log('✅ Created 2 user memories');
    
    // 5. Verify
    console.log('\n📊 Verification:');
    
    const userCount = await sql`SELECT COUNT(*) as count FROM "User"`;
    console.log(`   Users: ${userCount[0].count}`);
    
    const chatCount = await sql`SELECT COUNT(*) as count FROM "Chat"`;
    console.log(`   Chats: ${chatCount[0].count}`);
    
    const msgCount = await sql`SELECT COUNT(*) as count FROM "Message_v2"`;
    console.log(`   Messages: ${msgCount[0].count}`);
    
    const memCount = await sql`SELECT COUNT(*) as count FROM "UserMemory"`;
    console.log(`   Memories: ${memCount[0].count}`);
    
    console.log('\n✅ Import completed successfully!');
    
  } catch (error) {
    console.error('❌ Import failed:', error);
  } finally {
    await sql.end();
  }
}

if (require.main === module) {
  simpleImport();
}