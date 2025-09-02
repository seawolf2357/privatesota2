import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';

// Simple memory extraction without database
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    const isDemoMode = request.headers.get('x-demo-mode') === 'true';
    
    if (!isDemoMode && !session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { messages: conversationMessages, sessionId, userId, forceSave = false } = body;
    
    if (!conversationMessages || conversationMessages.length < 2) {
      return NextResponse.json({ 
        error: 'Not enough messages to extract memories',
        count: 0 
      }, { status: 400 });
    }

    // Build conversation text for extraction
    const conversationText = conversationMessages
      .map((msg: any) => `${msg.role === 'user' ? '사용자' : 'AI'}: ${msg.content}`)
      .join('\n');
    
    console.log('[Memory Extract API] === DEBUG START ===');
    console.log('[Memory Extract API] Session ID:', sessionId);
    console.log('[Memory Extract API] User ID:', userId);
    console.log('[Memory Extract API] Number of messages:', conversationMessages.length);
    console.log('[Memory Extract API] Conversation text preview:', conversationText.substring(0, 200) + '...');

    // Use AI to extract memories
    const extractionPrompt = `You are a memory extraction system. Extract personal information from conversations.
      
IMPORTANT: Extract ONLY factual information that the user explicitly states or requests to remember.
Focus on:
- Personal information (name, age, job, location)
- Preferences (likes, dislikes)
- Important dates and deadlines
- Tasks or todos mentioned
- Any information the user asks to remember

Categories to use:
- personal_info: 이름, 나이, 직업, 거주지 등
- preferences: 좋아하는 것, 싫어하는 것
- important_dates: 날짜, 마감일, 일정
- tasks: 할 일, 신청해야 할 것
- notes: 기타 중요한 정보

Return as JSON array. Example:
[
  {
    "category": "personal_info",
    "content": "사용자 이름: 홍길동",
    "confidence": 0.9
  }
]

Be specific and include context. Extract ALL important information.

대화 내용:
${conversationText}`;

    try {
      // Call Friendli AI directly
      const FRIENDLI_API_KEY = process.env.FRIENDLI_API_KEY || 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
      const FRIENDLI_BASE_URL = 'https://api.friendli.ai/dedicated/v1/chat/completions';
      const FRIENDLI_MODEL = 'dep86pjolcjjnv8';
      
      const aiResponse = await fetch(FRIENDLI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        },
        body: JSON.stringify({
          model: FRIENDLI_MODEL,
          messages: [
            { role: 'system', content: extractionPrompt },
            { role: 'user', content: '위 대화에서 기억해야 할 정보를 추출하세요.' }
          ],
          temperature: 0.3,
          max_tokens: 1000,
        }),
      });

      if (!aiResponse.ok) {
        throw new Error(`Friendli AI error: ${aiResponse.status}`);
      }

      const aiData = await aiResponse.json();
      const responseText = aiData.choices?.[0]?.message?.content || '';
      
      console.log('[Memory Extract API] AI Response received');
      console.log('[Memory Extract API] Response text:', responseText);
      
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        console.log('[Memory Extract API] No valid JSON found in AI response');
        return NextResponse.json({ 
          success: false,
          count: 0,
          message: 'No memories extracted'
        });
      }

      const extractedMemories = JSON.parse(jsonMatch[0]);
      
      console.log('[Memory Extract API] Extracted memories:', JSON.stringify(extractedMemories, null, 2));
      console.log('[Memory Extract API] Number of memories extracted:', extractedMemories.length);
      
      // Save memories directly to the database
      const { db } = await import('@/lib/db');
      const { userMemory } = await import('@/lib/db/schema');
      const { eq, and } = await import('drizzle-orm');
      
      const actualUserId = userId || session?.user?.id || 'demo-user';
      console.log('[Memory Extract API] Actual User ID for saving:', actualUserId);
      let savedCount = 0;

      for (const memory of extractedMemories) {
        console.log(`[Memory Extract API] Processing memory: ${memory.category} - ${memory.content}`);
        console.log(`[Memory Extract API] Checking for duplicates with userId: ${actualUserId}`);
        
        try {
          // Check if similar memory exists (relaxed duplicate check)
          // Only check for exact content match within the same category
          const existing = await db
            .select()
            .from(userMemory)
            .where(
              and(
                eq(userMemory.userId, actualUserId),
                eq(userMemory.category, memory.category),
                eq(userMemory.content, memory.content)
              )
            )
            .limit(1);
          
          console.log(`[Memory Extract API] Duplicate check query result:`, existing.length > 0 ? `Found ${existing.length} duplicate(s)` : 'No duplicates found');
          if (existing.length > 0) {
            console.log(`[Memory Extract API] Existing memory:`, JSON.stringify(existing[0], null, 2));
          }

          if (existing.length === 0 || forceSave) {
            // Generate UUID for SQLite
            const memoryId = crypto.randomUUID();
            const now = new Date();
            
            // If forceSave and duplicate exists, add timestamp to make it unique
            const contentToSave = (forceSave && existing.length > 0) 
              ? `${memory.content} [${now.toISOString()}]`
              : memory.content;
            
            // Insert new memory with explicit ID and timestamps
            await db.insert(userMemory).values({
              id: memoryId,
              userId: actualUserId,
              category: memory.category,
              content: contentToSave,
              confidence: memory.confidence || 1.0,
              sourceSessionId: sessionId,
              metadata: {
                extractedFrom: 'conversation',
                source: 'jetXA',
                forceSaved: forceSave && existing.length > 0,
              },
              createdAt: now,
              updatedAt: now,
            });
            savedCount++;
            console.log(`[Memory Extract API] ✅ Successfully saved: ${memory.category} - ${contentToSave.substring(0, 50)}...`);
            console.log(`[Memory Extract API] Memory ID: ${memoryId}`);
            if (forceSave && existing.length > 0) {
              console.log(`[Memory Extract API] ℹ️ Force-saved with timestamp to avoid duplicate`);
            }
          } else {
            console.log(`[Memory Extract API] ⚠️ Duplicate skipped: ${memory.content.substring(0, 50)}...`);
            console.log(`[Memory Extract API] 💡 Tip: Add 'forceSave: true' to save anyway`);
          }
        } catch (error) {
          console.error('[Memory Extract API] ❌ Error saving individual memory:', error);
          console.error('[Memory Extract API] Memory data:', JSON.stringify(memory, null, 2));
        }
      }

      console.log('[Memory Extract API] === SUMMARY ===');
      console.log(`[Memory Extract API] Total extracted: ${extractedMemories.length}`);
      console.log(`[Memory Extract API] New saved: ${savedCount}`);
      console.log(`[Memory Extract API] Duplicates skipped: ${extractedMemories.length - savedCount}`);
      console.log('[Memory Extract API] === DEBUG END ===');

      return NextResponse.json({ 
        success: true,
        count: savedCount,
        extracted: extractedMemories.length
      });

    } catch (error) {
      console.error('Error calling AI for extraction:', error);
      return NextResponse.json({ 
        success: false,
        count: 0,
        message: 'Failed to extract memories from AI'
      });
    }
    
  } catch (error) {
    console.error('Error in memory extraction:', error);
    return NextResponse.json(
      { error: 'Failed to extract memories' },
      { status: 500 }
    );
  }
}