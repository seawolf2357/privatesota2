import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';
import { getEnhancedMemoryManager } from '@/lib/ai/enhanced-memory-manager';

// Simple memory extraction without database
export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    // Allow both regular users and demo mode for testing
    // Check if user has a valid session and ID
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }
    
    // For production, only allow regular users to save memories
    // For testing, we'll allow both regular and guest types
    const isRegularUser = session?.user?.type === 'regular';
    
    if (!isRegularUser) {
      console.log('[Memory Extract API] User type not regular:', session?.user?.type);
      return NextResponse.json({ error: 'Regular user account required for memory extraction' }, { status: 403 });
    }

    const body = await request.json();
    const { messages: conversationMessages, sessionId, forceSave = false } = body;
    
    // Always use the authenticated user's ID
    const userId = session.user.id;
    
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
    console.log('[Memory Extract API] Session info:', {
      userID: session?.user?.id,
      userType: session?.user?.type,
      userEmail: session?.user?.email
    });
    console.log('[Memory Extract API] Request info:', {
      sessionId,
      userId,
      messagesCount: conversationMessages.length,
      forceSave
    });
    console.log('[Memory Extract API] Conversation text preview:', conversationText.substring(0, 200) + '...');

    // Use Enhanced Memory Manager for intelligent processing
    const memoryManager = getEnhancedMemoryManager();
    const allMemoryResults: any[] = [];

    console.log('[Memory Extract API] Using Enhanced Memory Manager');

    // Get existing memories for context
    const { db } = await import('@/lib/db');
    const { userMemory } = await import('@/lib/db/schema');
    const { eq } = await import('drizzle-orm');

    const existingMemories = await (db as any)
      .select()
      .from(userMemory)
      .where(eq(userMemory.userId, userId))
      .limit(50); // Get recent memories for context

    console.log(`[Memory Extract API] Found ${existingMemories.length} existing memories for context`);

    // Build conversation history for context
    const conversationHistory = conversationMessages.map((msg: any) => ({
      content: msg.content,
      timestamp: new Date()
    }));

    // Process each user message with Enhanced Memory Manager
    const userMessages = conversationMessages.filter((m: any) => m.role === 'user');

    for (const message of userMessages) {
      const messageObj = {
        role: 'user' as const,
        content: message.content,
        timestamp: new Date(),
        sessionId: sessionId || crypto.randomUUID()
      };

      try {
        const result = await memoryManager.processMemoryComprehensively(
          messageObj,
          userId,
          existingMemories,
          conversationHistory
        );

        console.log(`[Memory Extract API] Enhanced processing result:`, {
          shouldSave: result.shouldSave,
          category: result.processedMemory?.category,
          confidence: result.processedMemory?.confidence,
          duplicateStatus: result.processedMemory?.duplicateStatus,
          reasoning: result.processedMemory?.reasoning
        });

        if (result.shouldSave && result.processedMemory) {
          allMemoryResults.push({
            category: result.processedMemory.category,
            content: result.processedMemory.content,
            confidence: result.processedMemory.confidence,
            reasoning: result.processedMemory.reasoning,
            duplicateStatus: result.processedMemory.duplicateStatus
          });
        }
      } catch (error) {
        console.error('[Memory Extract API] Enhanced processing failed for message:', error);
        // Fallback to simple processing
        allMemoryResults.push({
          category: 'general',
          content: message.content,
          confidence: 0.5,
          reasoning: ['Fallback processing due to error'],
          duplicateStatus: 'new'
        });
      }
    }

    console.log(`[Memory Extract API] Enhanced Memory Manager processed ${allMemoryResults.length} memories`);

    // Use traditional AI extraction as additional fallback if Enhanced Manager found nothing
    let responseText = '';
    let fallbackMemories: any[] = [];

    if (allMemoryResults.length === 0) {
      console.log('[Memory Extract API] No memories from Enhanced Manager, trying AI extraction');

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
        const FRIENDLI_API_KEY = process.env.FRIENDLI_API_KEY || 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc';
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
        responseText = aiData.choices?.[0]?.message?.content || '';

        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
          fallbackMemories = JSON.parse(jsonMatch[0]);
          console.log(`[Memory Extract API] AI extraction found ${fallbackMemories.length} memories`);
        }
      } catch (aiError) {
        console.log('[Memory Extract API] AI extraction also failed, using final fallback');
        fallbackMemories = [{
          category: 'general',
          content: `대화 내용: ${conversationText.substring(0, 100)}...`,
          confidence: 0.3
        }];
      }
    }
    
    try {

      // Use results from Enhanced Memory Manager or fallback
      const extractedMemories = allMemoryResults.length > 0 ? allMemoryResults : fallbackMemories;

      console.log('[Memory Extract API] Processing memories from Enhanced Memory Manager');
      console.log('[Memory Extract API] Extracted memories:', JSON.stringify(extractedMemories, null, 2));
      console.log('[Memory Extract API] Number of memories extracted:', extractedMemories.length);

      if (extractedMemories.length === 0) {
        console.log('[Memory Extract API] No memories to save');
        return NextResponse.json({
          success: false,
          count: 0,
          message: 'No memories extracted by Enhanced Memory Manager'
        });
      }
      
      // Save memories directly to the database
      const { db } = await import('@/lib/db');
      const { userMemory } = await import('@/lib/db/schema');
      const { eq, and } = await import('drizzle-orm');
      
      console.log('[Memory Extract API] User ID for saving:', userId);
      let savedCount = 0;

      for (const memory of extractedMemories) {
        console.log(`[Memory Extract API] Processing memory: ${memory.category} - ${memory.content}`);
        console.log(`[Memory Extract API] Checking for duplicates with userId: ${userId}`);
        
        try {
          // Check if similar memory exists (relaxed duplicate check)
          // Only check for exact content match within the same category
          const existing = await (db as any)
            .select()
            .from(userMemory)
            .where(
              and(
                eq(userMemory.userId, userId),
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
            // sourceSessionId should be a conversation ID (UUID), not session ID
            // If sessionId starts with 'demo-session-' or is empty/null, set to null
            const sourceId = (sessionId && sessionId.trim() && !sessionId.startsWith('demo-session-')) 
              ? sessionId 
              : null;
            
            await (db as any).insert(userMemory).values({
              id: memoryId,
              userId: userId,
              category: memory.category,
              content: contentToSave,
              confidence: memory.confidence || 1.0,
              sourceSessionId: sourceId, // Can be null, it's optional
              metadata: {
                extractedFrom: 'conversation',
                source: 'enhanced-memory-manager',
                forceSaved: forceSave && existing.length > 0,
                originalSessionId: sessionId,
                reasoning: memory.reasoning || [],
                duplicateStatus: memory.duplicateStatus || 'new',
                processingEngine: 'enhanced'
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
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Failed to extract memories',
        details: error instanceof Error ? error.message : 'Unknown error',
        success: false,
        count: 0
      },
      { status: 500 }
    );
  }
}