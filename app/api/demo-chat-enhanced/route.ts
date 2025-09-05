// Enhanced Friendli AI integration with memory and web search
import { getBraveSearchClient } from '@/lib/ai/brave-search';
import { MemoryManager } from '@/lib/ai/memory-manager';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';

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
      userId = DEMO_USER_ID,
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

    // Advanced language detection function
    function detectLanguage(text: string): string {
      // Korean (Hangul)
      if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return 'ko';
      
      // Japanese (Hiragana, Katakana, Kanji)
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
      
      // Chinese (CJK Unified Ideographs) - but exclude if already detected as Japanese/Korean
      if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'zh';
      
      // Russian (Cyrillic)
      if (/[\u0400-\u04FF]/.test(text)) return 'ru';
      
      // Arabic
      if (/[\u0600-\u06FF]/.test(text)) return 'ar';
      
      // Thai
      if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
      
      // Vietnamese (has diacritics)
      if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(text)) return 'vi';
      
      // Spanish (ñ and common accents)
      if (/[ñáéíóúü]/.test(text.toLowerCase())) return 'es';
      
      // French (common accents)
      if (/[àâäéèêëîïôöùûüÿç]/.test(text.toLowerCase())) return 'fr';
      
      // German (umlauts and ß)
      if (/[äöüß]/.test(text.toLowerCase())) return 'de';
      
      // Italian (common accents)
      if (/[àèéìíîòóù]/.test(text.toLowerCase())) return 'it';
      
      // Portuguese (ã, õ, ç)
      if (/[ãõçáàâéêíóôúü]/.test(text.toLowerCase())) return 'pt';
      
      // Default to English if Latin alphabet
      if (/[a-zA-Z]/.test(text)) return 'en';
      
      // Fallback to Korean for unknown scripts
      return 'ko';
    }
    
    // Detect input language
    const detectedLanguage = detectLanguage(message.content);
    const isEnglish = detectedLanguage === 'en';
    
    // Debug: Log detected language
    console.log(`[Language Detection] Input: "${message.content.substring(0, 50)}" → Detected: ${detectedLanguage}`);
    
    // Generate system prompt based on detected language
    function getSystemPrompt(language: string): string {
      const basePrompt = {
        ko: `당신의 이름은 jetXA입니다. 전 세계 언어를 유창하게 구사하는 고급 AI 어시스턴트입니다.

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
4. 모든 언어로 자연스러운 대화
5. 웹 검색을 통한 최신 정보 제공
6. 사용자 정보 기억 및 개인화된 대화

중요한 언어 규칙:
- 핵심: 항상 사용자 입력과 동일한 언어로 응답하세요
- 사용자의 언어를 감지하고 그 언어로만 응답
- 전체 응답에서 일관된 언어를 유지하세요

중요: 
- 사용자가 파일을 업로드했다면, 파일 내용을 인지하고 관련 질문에 답변하세요.
- 웹 검색 결과를 사용할 때는 반드시 [출처: 번호] 형식으로 출처를 명시하세요.
- 기억된 정보를 활용하여 더 개인화된 답변을 제공하세요.`,

        en: `Your name is jetXA. You are an advanced multilingual AI assistant fluent in all world languages.

${timeInfo}

Key Features:
- Name: jetXA
- Role: Advanced multimodal AI assistant
- Personality: Professional, accurate, and friendly conversational style
- Specialties: Image analysis, document processing, data analysis, multilingual conversation, web search, memory management

Functions:
1. Analyze and describe uploaded images
2. Process various file formats including PDF, CSV, TXT
3. Answer questions based on file content
4. Natural conversation in any language
5. Provide latest information through web search
6. Remember user information for personalized conversations

Important Language Rules:
- CRITICAL: Always respond in the SAME LANGUAGE as the user's input
- Detect the user's language and respond ONLY in that language
- Maintain consistent language throughout your entire response

Important:
- If user uploaded files, acknowledge the file content and answer related questions.
- When using web search results, always cite sources in [Source: number] format.
- Use remembered information to provide more personalized responses.`,

        // Add support for other major languages
        ja: `あなたの名前はjetXAです。世界中の言語に堪能な高度なAIアシスタントです。

${timeInfo}

重要な言語ルール:
- 重要: 常にユーザーの入力と同じ言語で応答してください
- ユーザーの言語を検出し、その言語のみで応答してください
- 応答全体を通して一貫した言語を維持してください

主な機能: 画像分析、文書処理、多言語対話、ウェブ検索、メモリ管理

重要:
- ユーザーの言語で応答する
- ウェブソースを[出典: 番号]形式で引用する
- 記憶された情報を個人化に活用する`,

        zh: `您的名字是jetXA。您是一位精通世界各国语言的高级AI助手。

${timeInfo}

重要的语言规则:
- 关键: 始终用与用户输入相同的语言回应
- 检测用户的语言并仅用该语言回应
- 在整个回应中保持一致的语言

主要能力: 图像分析、文档处理、多语言对话、网络搜索、记忆管理

重要提示:
- 用用户的语言回应
- 以[来源: 数字]格式引用网络来源
- 使用记忆信息进行个性化`,

        es: `Tu nombre es jetXA. Eres un asistente de IA avanzado multilingüe fluido en todos los idiomas del mundo.

${timeInfo}

Reglas importantes de idioma:
- CRÍTICO: Siempre responde en el MISMO IDIOMA que la entrada del usuario
- Detecta el idioma del usuario y responde SOLO en ese idioma
- Mantén un idioma consistente en toda tu respuesta

Habilidades principales: Análisis de imágenes, procesamiento de documentos, conversación multilingüe, búsqueda web, gestión de memoria

Importante:
- Responde en el idioma del usuario
- Cita fuentes web como [Fuente: número]
- Usa información recordada para personalización`,

        fr: `Votre nom est jetXA. Vous êtes un assistant IA avancé multilingue maîtrisant toutes les langues du monde.

${timeInfo}

Règles linguistiques importantes:
- CRITIQUE: Répondez toujours dans la MÊME LANGUE que l'entrée de l'utilisateur
- Détectez la langue de l'utilisateur et répondez UNIQUEMENT dans cette langue
- Maintenez une langue cohérente tout au long de votre réponse

Capacités principales: Analyse d'images, traitement de documents, conversation multilingue, recherche web, gestion de mémoire

Important:
- Répondre dans la langue de l'utilisateur
- Citer les sources web comme [Source: numéro]
- Utiliser les informations mémorisées pour la personnalisation`,

        default: `Your name is jetXA. You are an advanced multilingual AI assistant.

${timeInfo}

CRITICAL: Always respond in the SAME LANGUAGE as the user's input. Detect their language and maintain it throughout your response.

Key abilities: Image analysis, document processing, multilingual conversation, web search, memory management.

Important:
- Respond in the user's language
- Cite web sources as [Source: number]
- Use remembered information for personalization`
      };

      return basePrompt[language as keyof typeof basePrompt] || basePrompt.default;
    }

    // Base system prompt with language detection  
    let systemPrompt = getSystemPrompt(detectedLanguage);

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
        
        // Map detected language to search language
        function getSearchLanguage(detectedLang: string): string {
          const langMap = {
            'ko': 'ko', 'ja': 'ja', 'zh': 'zh-cn', 'ru': 'ru',
            'ar': 'ar', 'es': 'es', 'fr': 'fr', 'de': 'de', 
            'it': 'it', 'pt': 'pt', 'th': 'th', 'vi': 'vi',
            'en': 'en'
          };
          return langMap[detectedLang as keyof typeof langMap] || 'en';
        }
        
        // Perform multi-search with detected language
        const results = await searchClient.multiSearch(queries, {
          count: 10,
          lang: getSearchLanguage(detectedLanguage)
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