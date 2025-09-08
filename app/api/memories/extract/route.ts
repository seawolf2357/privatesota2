import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';

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

    // Simple fallback extraction if AI fails
    let responseText = '';
    
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
    } catch (aiError) {
      console.log('[Memory Extract API] AI failed, using simple extraction');
      // Simple rule-based extraction as fallback
      const extractedMemories: any[] = [];
      
      // Extract user message from conversationMessages
      const userMessages = conversationMessages.filter((m: any) => m.role === 'user').map((m: any) => m.content);
      
      // Get the LATEST user message(s) - focus on new content in continued conversations
      if (userMessages.length > 0) {
        // Take the last 2 user messages (most recent interactions)
        const recentMessages = userMessages.slice(-2);
        
        for (let i = 0; i < recentMessages.length; i++) {
          const message = recentMessages[i].trim();
          if (message.length > 0) {
            // Check for specific patterns to categorize better
            let category = 'general';
            let content = '';
            
            // Check for dates/appointments
            if (message.match(/\d{1,2}[월일]/i) || message.includes('내일') || message.includes('오늘')) {
              category = 'important_dates';
              content = `일정 관련: ${message}`;
            }
            // Check for tasks
            else if (message.includes('해야') || message.includes('할 일') || message.includes('신청')) {
              category = 'tasks';
              content = `할 일: ${message}`;
            }
            // Check for questions about files
            else if (message.includes('파일') || message.includes('첨부') || message.includes('문서')) {
              category = 'notes';
              content = `파일 관련 질문: ${message}`;
            }
            // Default: save as general but with context
            else {
              const messageIndex = userMessages.indexOf(message);
              const conversationContext = messageIndex > 0 ? '(대화 중)' : '(대화 시작)';
              content = `사용자 메시지 ${conversationContext}: "${message}"`;
            }
            
            // Only add if we don't already have a very similar memory
            const isDuplicate = extractedMemories.some(m => 
              m.content.includes(message.substring(0, 20))
            );
            
            if (!isDuplicate) {
              extractedMemories.push({
                category,
                content,
                confidence: i === recentMessages.length - 1 ? 0.9 : 0.7 // Latest message has higher confidence
              });
            }
          }
        }
      }
      
      // Extract AI responses that might contain important information
      const aiMessages = conversationMessages.filter((m: any) => m.role === 'assistant').map((m: any) => m.content);
      if (aiMessages.length > 0) {
        // Focus on the LATEST AI response (most relevant)
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        // Extract specific information patterns from AI response
        if (lastAiMessage.includes('분석 결과') || lastAiMessage.includes('파일')) {
          extractedMemories.push({
            category: 'notes',
            content: `AI 파일 분석: ${lastAiMessage.substring(0, 150)}...`,
            confidence: 0.6
          });
        } else if (lastAiMessage.includes('날짜') || lastAiMessage.includes('2025년')) {
          // Extract date-related information
          const dateMatch = lastAiMessage.match(/\d{4}년.*?[월일]/);
          if (dateMatch) {
            extractedMemories.push({
              category: 'important_dates',
              content: `날짜 정보: ${dateMatch[0]}`,
              confidence: 0.8
            });
          }
        } else if (lastAiMessage.length > 50) {
          // For other substantial responses, save a summary
          extractedMemories.push({
            category: 'notes',
            content: `최근 대화 요약: ${lastAiMessage.substring(0, 100)}...`,
            confidence: 0.5
          });
        }
      }
      
      responseText = JSON.stringify(extractedMemories);
    }
    
    try {
      
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
                source: 'jetXA',
                forceSaved: forceSave && existing.length > 0,
                originalSessionId: sessionId, // Store original session ID in metadata
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