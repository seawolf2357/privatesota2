const postgres = require('postgres');

const dbUrl = 'postgresql://postgres.zxszrqmeqhxazgabaubz:hvKnFCSYZ1al15X6@aws-1-ap-northeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true';

const sql = postgres(dbUrl, {
  prepare: false,
  ssl: 'require',
});

async function testEncoding() {
  try {
    // Get recent messages
    const messages = await sql`
      SELECT id, role, parts, "createdAt" 
      FROM "Message_v2" 
      WHERE "chatId" = '467bf3e2-ca29-4064-992f-39380a155653'
      ORDER BY "createdAt" ASC
      LIMIT 2
    `;
    
    console.log('Raw messages from database:');
    messages.forEach((msg, i) => {
      console.log(`\nMessage ${i + 1}:`);
      console.log('ID:', msg.id);
      console.log('Role:', msg.role);
      console.log('Parts (raw):', msg.parts);
      console.log('Parts (JSON stringified):', JSON.stringify(msg.parts));
      
      // Try to extract text
      if (msg.parts && Array.isArray(msg.parts) && msg.parts[0]) {
        console.log('Extracted text:', msg.parts[0].text);
        
        // Check encoding
        const text = msg.parts[0].text || '';
        console.log('Text length:', text.length);
        console.log('First 50 chars:', text.substring(0, 50));
        
        // Convert to buffer and back
        const buffer = Buffer.from(text, 'utf8');
        console.log('Buffer:', buffer.toString('hex').substring(0, 100));
        console.log('Buffer as UTF-8:', buffer.toString('utf8').substring(0, 50));
      }
    });
    
    // Test if we can save Korean text correctly
    console.log('\n\n=== Testing Korean text save ===');
    const testId = 'test-' + Date.now();
    const koreanText = '안녕하세요! 한글 테스트입니다.';
    
    // Create test chat first
    await sql`
      INSERT INTO "Chat" (id, "userId", title, "createdAt", visibility)
      VALUES (${testId}, '00000000-0000-0000-0000-000000000001', '테스트', NOW(), 'private')
    `;
    
    // Insert test message
    await sql`
      INSERT INTO "Message_v2" (id, "chatId", role, parts, attachments, "createdAt")
      VALUES (
        ${testId + '-msg'},
        ${testId},
        'user',
        ${JSON.stringify([{ type: 'text', text: koreanText }])}::jsonb,
        '[]'::jsonb,
        NOW()
      )
    `;
    
    // Read it back
    const testMsg = await sql`
      SELECT parts FROM "Message_v2" WHERE id = ${testId + '-msg'}
    `;
    
    console.log('Original text:', koreanText);
    console.log('Saved and retrieved:', testMsg[0].parts[0].text);
    console.log('Match:', koreanText === testMsg[0].parts[0].text);
    
    // Clean up
    await sql`DELETE FROM "Message_v2" WHERE "chatId" = ${testId}`;
    await sql`DELETE FROM "Chat" WHERE id = ${testId}`;
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

testEncoding();