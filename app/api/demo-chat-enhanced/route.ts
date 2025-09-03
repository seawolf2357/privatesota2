// Enhanced Friendli AI integration with memory and web search
import { getBraveSearchClient } from '@/lib/ai/brave-search';
import { MemoryManager } from '@/lib/ai/memory-manager';

const FRIENDLI_API_KEY = 'flp_ZMMUt1CuH2dy0RLXxnbjwsfiZufsVqRu6w6ko2d3mrHc4';
const FRIENDLI_BASE_URL = 'https://api.friendli.ai/dedicated/v1/chat/completions';
const FRIENDLI_MODEL = 'dep86pjolcjjnv8';

// Korean Standard Time
function getCurrentTimeKST() {
  // Create a date object with the current time
  const now = new Date();
  
  // Format to KST using Intl.DateTimeFormat
  // This will automatically handle timezone conversion
  return now;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const { 
      message, 
      webSearchEnabled = false,
      userId = 'demo-user',
      sessionId,
      includeMemories = false
    } = json;

    if (!message || !message.content) {
      return new Response('Message content is required', { status: 400 });
    }

    console.log('Enhanced demo chat request:', {
      message: message.content.substring(0, 100),
      webSearchEnabled,
      includeMemories
    });

    // Get current time info
    const currentTime = getCurrentTimeKST();
    const kstString = currentTime.toLocaleString('ko-KR', { 
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      weekday: 'long'
    });
    const timeInfo = `
현재 시간 정보:
- 한국 표준시(KST): ${kstString}
`;

    // Base system prompt
    let systemPrompt = `당신의 이름은 jetXA입니다. 한국어와 영어를 유창하게 구사하는 고급 AI 어시스턴트입니다.

${timeInfo}

주요 특징:
- 이름: jetXA (제트엑스에이)
- 역할: 고급 멀티모달 AI 어시스턴트
- 성격: 전문적이고 정확하며, 친근한 대화 가능
- 특기: 이미지 분석, 문서 처리, 데이터 분석, 다국어 대화, 웹 검색, 메모리 관리

기능:
1. 업로드된 이미지를 분석하고 설명할 수 있음
2. PDF, CSV, TXT 등 다양한 파일 형식 처리
3. 파일 내용을 기반으로 질문에 답변
4. 한국어와 영어를 자유롭게 전환하며 대화
5. 웹 검색을 통한 최신 정보 제공
6. 사용자 정보 기억 및 개인화된 대화

중요: 
- 사용자가 파일을 업로드했다면, 파일 내용을 인지하고 관련 질문에 답변하세요.
- 웹 검색 결과를 사용할 때는 반드시 [출처: 번호] 형식으로 출처를 명시하세요.
- 기억된 정보를 활용하여 더 개인화된 답변을 제공하세요.`;

    // Add memories if enabled
    if (includeMemories && userId) {
      try {
        const memoryManager = new MemoryManager(userId);
        const memoriesText = await memoryManager.formatMemoriesForPrompt();
        if (memoriesText) {
          systemPrompt += memoriesText;
        }
      } catch (error) {
        console.error('Error loading memories:', error);
      }
    }

    // Perform web search if enabled
    let searchResults = null;
    let searchContext = '';
    if (webSearchEnabled) {
      try {
        const searchClient = getBraveSearchClient();
        
        // Generate multiple search queries for better results
        const queries = searchClient.generateSearchQueries(message.content);
        console.log('[WebSearch] Generated queries:', queries);
        
        // Perform multi-search
        const results = await searchClient.multiSearch(queries, {
          count: 10,
          lang: 'ko'
        });

        if (results.length > 0) {
          searchResults = results;
          
          // Format search results for inclusion in system prompt
          searchContext = searchClient.formatResultsForPrompt(results);
          console.log(`[WebSearch] Found ${results.length} results`);
        }
      } catch (error) {
        console.error('Web search error:', error);
      }
    }

    // Combine system prompt with search results
    const fullSystemPrompt = systemPrompt + (searchContext ? '\n\n' + searchContext : '');

    const messages = [
      {
        role: 'system',
        content: fullSystemPrompt
      },
      {
        role: 'user',
        content: message.content
      }
    ];

    // Prepare the payload for Friendli AI
    const payload = {
      model: FRIENDLI_MODEL,
      messages,
      stream: true,
      temperature: 0.8,
      max_tokens: 2000
    };

    // Call Friendli AI
    const response = await fetch(FRIENDLI_BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
        'Accept': 'text/event-stream'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Friendli AI error:', errorText);
      return new Response(JSON.stringify({ error: 'AI service error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // If we have search results, append citations after the stream
    if (searchResults && response.body) {
      const reader = response.body.getReader();
      const encoder = new TextEncoder();
      
      const stream = new ReadableStream({
        async start(controller) {
          // Pass through the original response
          while (true) {
            const { done, value } = await reader.read();
            
            if (done) {
              // Add search citations at the end
              const searchClient = getBraveSearchClient();
              const citations = searchClient.createSourceCitations(searchResults);
              
              if (citations) {
                const citationEvent = `data: {"choices":[{"delta":{"content":"${citations.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}}]}\n\n`;
                controller.enqueue(encoder.encode(citationEvent));
              }
              
              controller.close();
              break;
            }
            
            controller.enqueue(value);
          }
        }
      });

      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      });
    }

    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
    
  } catch (error) {
    console.error('Enhanced Demo Chat API error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}