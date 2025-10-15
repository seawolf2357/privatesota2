// Enhanced Friendli AI integration with memory, web search, and shopping
import { getBraveSearchClient } from '@/lib/ai/brave-search';
import { MemoryManager } from '@/lib/ai/memory-manager';
import { getEnhancedMemoryManagerV2 } from '@/lib/ai/enhanced-memory-manager-v2';
import type { Message as MemoryMessage, UserMemory } from '@/lib/ai/types';
import { DEMO_USER_ID } from '@/lib/constants/demo-user';
import { getShoppingAPIClient } from '@/lib/api/shopping-api';
import { getVectorMemoryManager } from '@/lib/ai/vector-memory-manager';
import { getModelById } from '@/lib/ai/models-config';

// Use environment variables for Friendli AI
const FRIENDLI_API_KEY = process.env.FRIENDLI_API_KEY || '';
const FRIENDLI_BASE_URL = process.env.FRIENDLI_URL || 'https://api.friendli.ai/dedicated/v1/chat/completions';
const FRIENDLI_MODEL = process.env.FRIENDLI_MODEL || 'dep86pjolcjjnv8';

// xAI Grok as fallback
const XAI_API_KEY = process.env.XAI_API_KEY || '';
const XAI_BASE_URL = 'https://api.x.ai/v1/chat/completions';
const XAI_MODEL = 'grok-beta';

// Fireworks AI as secondary fallback
const FIREWORKS_API_KEY = process.env.FIREWORKS_API_KEY || '';
const FIREWORKS_BASE_URL = 'https://api.fireworks.ai/inference/v1/chat/completions';
const FIREWORKS_MODEL = 'accounts/fireworks/models/qwen3-235b-a22b-instruct-2507';

// Korean Standard Time and Context
function getCurrentTimeKST() {
  const now = new Date();
  const kstOffset = 9 * 60; // KST is UTC+9
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const kstTime = new Date(utcTime + (kstOffset * 60000));
  return kstTime;
}

function getTimeContext(): string {
  const hour = getCurrentTimeKST().getHours();
  if (hour >= 5 && hour < 10) return '아침';
  if (hour >= 10 && hour < 14) return '점심';
  if (hour >= 14 && hour < 18) return '오후';
  if (hour >= 18 && hour < 22) return '저녁';
  return '야식';
}

function getSeasonContext(): string {
  const month = getCurrentTimeKST().getMonth() + 1;
  if (month >= 3 && month <= 5) return '봄';
  if (month >= 6 && month <= 8) return '여름';
  if (month >= 9 && month <= 11) return '가을';
  return '겨울';
}

function getMoodFromMessage(message: string): string | undefined {
  const moods: Record<string, string[]> = {
    '스트레스': ['스트레스', '짜증', '힘들', '피곤'],
    '우울': ['우울', '슬퍼', '외로워', '쓸쓸'],
    '기쁨': ['기뻐', '좋아', '신나', '행복'],
    '피곤': ['피곤', '졸려', '지쳐', '나른'],
    '건강관심': ['다이어트', '건강', '운동', '살빼기']
  };

  for (const [mood, keywords] of Object.entries(moods)) {
    if (keywords.some(k => message.includes(k))) {
      return mood;
    }
  }
  return undefined;
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const {
      message,
      selectedModelId = 'jetxa-model',
      webSearchEnabled = false,
      userId = DEMO_USER_ID,
      sessionId,
      includeMemories = false,
      shoppingEnabled = true
    } = json;

    if (!message || !message.content) {
      return new Response('Message content is required', { status: 400 });
    }

    console.log('Enhanced demo chat request:', {
      message: message.content.substring(0, 100),
      selectedModelId,
      webSearchEnabled,
      includeMemories
    });

    // Get contextual information
    const timeContext = getTimeContext();
    const seasonContext = getSeasonContext();
    const detectedMood = getMoodFromMessage(message.content);
    const dayOfWeek = getCurrentTimeKST().getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    // Process message with Enhanced Memory Manager V2
    const enhancedMemoryManager = getEnhancedMemoryManagerV2();

    // Load existing memories for context
    let memoriesContext = '';
    let relatedMemoriesContext = '';
    if (includeMemories) {
      try {
        const memoryManager = new MemoryManager(userId);
        const memories = await memoryManager.getAllMemories();

        if (memories.length > 0) {
          console.log(`[MemoryLoader] Found ${memories.length} memories for user ${userId}`);

          // Group memories by category for better organization
          const categorizedMemories: Record<string, string[]> = {};
          memories.forEach(memory => {
            if (!categorizedMemories[memory.category]) {
              categorizedMemories[memory.category] = [];
            }
            categorizedMemories[memory.category].push(memory.content);
          });

          // Format memories for prompt
          memoriesContext = '\n\n📚 기억된 정보:\n';
          for (const [category, items] of Object.entries(categorizedMemories)) {
            const categoryName = category.replace('_', ' ').toUpperCase();
            memoriesContext += `\n[${categoryName}]\n`;
            items.forEach(item => {
              memoriesContext += `• ${item}\n`;
            });
          }

          console.log('[MemoryLoader] Memories loaded and formatted for context');

          // Try vector search for related memories
          try {
            const vectorManager = getVectorMemoryManager();
            relatedMemoriesContext = await vectorManager.getRelatedMemories(
              message.content,
              userId,
              3
            );
            if (relatedMemoriesContext) {
              console.log('[VectorSearch] Found related memories via semantic search');
              memoriesContext += relatedMemoriesContext;
            }
          } catch (error) {
            console.log('[VectorSearch] Vector search error:', error);
            console.log('[VectorSearch] Falling back to basic memory only');
          }
        } else {
          console.log('[MemoryLoader] No memories found for user');
        }
      } catch (error) {
        console.error('[MemoryLoader] Error loading memories:', error);
      }
    }

    // Create memory message object
    const memoryMessage: MemoryMessage = {
      role: 'user',
      content: message.content,
      timestamp: new Date(),
      sessionId: sessionId || 'demo-session'
    };

    // Process memory asynchronously (don't block the response)
    const processMemory = async () => {
      try {
        const memoryResult = await enhancedMemoryManager.processMemoryComprehensively(
          memoryMessage,
          userId,
          [], // TODO: Load existing memories from database
          [] // TODO: Load conversation history
        );

        console.log('[EnhancedMemory] Processing result:', {
          shouldSave: memoryResult.shouldSave,
          category: memoryResult.processedMemory?.category,
          importance: memoryResult.processedMemory?.importance,
          emotion: memoryResult.processedMemory?.emotionalContext?.primaryEmotion
        });

        // If memory should be saved, store it in the database
        if (memoryResult.shouldSave && memoryResult.processedMemory) {
          // Initialize MemoryManager with userId
          const memoryManager = new MemoryManager(userId);

          // Extract confidence value (default to 1.0 if not provided)
          const confidence = memoryResult.processedMemory.confidence || 1.0;

          // Save memory with correct parameters - ensure sessionId is valid UUID format
          const validSessionId = sessionId && sessionId.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)
            ? sessionId
            : null;

          await memoryManager.saveMemory(
            memoryResult.processedMemory.category || 'general',
            memoryResult.processedMemory.content || '',
            confidence,
            validSessionId
          );

          console.log('[EnhancedMemory] Memory saved successfully with:', {
            category: memoryResult.processedMemory.category,
            content: memoryResult.processedMemory.content?.substring(0, 50) + '...' || 'N/A',
            confidence: confidence,
            sessionId: validSessionId
          });
        }
      } catch (error) {
        console.error('[EnhancedMemory] Error processing memory:', error);
      }
    };

    // Start memory processing in background
    processMemory();

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

    // Enhanced language detection function
    function detectLanguage(text: string): string {
      // Clean text for better detection
      const cleanText = text.trim().toLowerCase();
      
      // Korean (Hangul) - highest priority for Korean characters
      if (/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return 'ko';
      
      // Japanese (Hiragana, Katakana, Kanji)
      if (/[\u3040-\u309F\u30A0-\u30FF]/.test(text)) return 'ja';
      
      // Chinese (CJK Unified Ideographs) - but exclude if already detected as Japanese/Korean
      if (/[\u4E00-\u9FFF]/.test(text) && !/[\u3040-\u309F\u30A0-\u30FF]/.test(text) && !/[ㄱ-ㅎㅏ-ㅣ가-힣]/.test(text)) return 'zh';
      
      // Russian (Cyrillic)
      if (/[\u0400-\u04FF]/.test(text)) return 'ru';
      
      // Arabic
      if (/[\u0600-\u06FF]/.test(text)) return 'ar';
      
      // Thai
      if (/[\u0E00-\u0E7F]/.test(text)) return 'th';
      
      // Vietnamese (has diacritics) - more comprehensive check
      if (/[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/.test(cleanText)) return 'vi';
      
      // Spanish detection - improved with common words and patterns
      if (/[ñ]/.test(cleanText) || /\b(el|la|los|las|un|una|de|en|y|que|es|por|para|con|hola|gracias|español)\b/.test(cleanText)) return 'es';
      
      // French detection - improved with common words
      if (/[àâäéèêëîïôöùûüÿç]/.test(cleanText) || /\b(le|la|les|un|une|de|du|des|et|que|est|pour|avec|bonjour|merci|français)\b/.test(cleanText)) return 'fr';
      
      // German detection - improved
      if (/[äöüß]/.test(cleanText) || /\b(der|die|das|und|ist|mit|für|auf|ich|sie|es|hallo|danke|deutsch)\b/.test(cleanText)) return 'de';
      
      // Italian detection - improved
      if (/\b(il|la|lo|gli|le|un|una|di|in|da|per|con|che|è|sono|ciao|grazie|italiano)\b/.test(cleanText)) return 'it';
      
      // Portuguese detection - improved
      if (/[ãõ]/.test(cleanText) || /\b(o|a|os|as|um|uma|de|em|para|com|que|é|são|olá|obrigado|português)\b/.test(cleanText)) return 'pt';
      
      // Default to English if Latin alphabet
      if (/[a-zA-Z]/.test(text)) return 'en';
      
      // Fallback
      return 'en';
    }
    
    // Detect input language
    const detectedLanguage = detectLanguage(message.content);
    const isEnglish = detectedLanguage === 'en';
    
    // Debug: Log detected language
    console.log(`[Language Detection] Input: "${message.content.substring(0, 50)}" → Detected: ${detectedLanguage}`);

    // Get selected model configuration
    const selectedModel = getModelById(selectedModelId);
    console.log('\n🎯 [Demo Chat API] Selected Model:', {
      id: selectedModelId,
      name: selectedModel?.name || 'Unknown',
      category: selectedModel?.category || 'Unknown',
      hasPersona: !!selectedModel?.persona,
    });

    // Generate system prompt based on detected language and selected model
    function getSystemPrompt(language: string, modelId: string): string {
      // Get model persona or use default
      const model = getModelById(modelId);
      const modelPersona = model?.persona || 'You are an advanced AI assistant.';

      const basePrompt = {
        ko: `${modelPersona}

${timeInfo}

추가 기능:
- 업로드된 이미지를 분석하고 설명할 수 있음
- PDF, CSV, TXT 등 다양한 파일 형식 처리
- 파일 내용을 기반으로 질문에 답변
- 모든 언어로 자연스러운 대화
- 웹 검색을 통한 최신 정보 제공
- 사용자 정보 기억 및 개인화된 대화
${memoriesContext}

**매우 중요한 언어 규칙:**
- 🚨 절대적으로 중요: 반드시 한국어로만 응답하세요
- 사용자가 한국어로 질문하면 무조건 한국어로 답변
- 영어 또는 다른 언어는 절대 사용하지 마세요
- 한국어가 아닌 언어로 응답하는 것은 금지됩니다
- 웹 검색 결과가 영어라도 한국어로 번역해서 답변하세요

중요:
- 사용자가 파일을 업로드했다면, 파일 내용을 인지하고 관련 질문에 답변하세요.
- 웹 검색 결과를 사용할 때는 반드시 [출처: 번호] 형식으로 출처를 명시하세요.
- 기억된 정보를 활용하여 더 개인화된 답변을 제공하세요.
- 모든 응답은 반드시 한국어로 작성하세요.`,

        en: `${modelPersona}

${timeInfo}

Additional Functions:
- Analyze and describe uploaded images
- Process various file formats including PDF, CSV, TXT
- Answer questions based on file content
- Natural conversation in any language
- Provide latest information through web search
- Remember user information for personalized conversations
${memoriesContext}

Important Language Rules:
- CRITICAL: Always respond in the SAME LANGUAGE as the user's input
- Detect the user's language and respond ONLY in that language
- Maintain consistent language throughout your entire response

Important:
- If user uploaded files, acknowledge the file content and answer related questions.
- When using web search results, always cite sources in [Source: number] format.
- Use remembered information to provide more personalized responses.`,

        // Add support for other major languages
        ja: `${modelPersona}

${timeInfo}

追加機能:
- 画像分析、文書処理、多言語対話、ウェブ検索、メモリ管理
${memoriesContext}

重要な言語ルール:
- 重要: 常にユーザーの入力と同じ言語で応答してください
- ユーザーの言語を検出し、その言語のみで応答してください
- 応答全体を通して一貫した言語を維持してください

重要:
- ユーザーの言語で応答する
- ウェブソースを[出典: 番号]形式で引用する
- 記憶された情報を個人化に活用する`,

        zh: `${modelPersona}

${timeInfo}

追加功能:
- 图像分析、文档处理、多语言对话、网络搜索、记忆管理
${memoriesContext}

重要的语言规则:
- 关键: 始终用与用户输入相同的语言回应
- 检测用户的语言并仅用该语言回应
- 在整个回应中保持一致的语言

重要提示:
- 用用户的语言回应
- 以[来源: 数字]格式引用网络来源
- 使用记忆信息进行个性化`,

        es: `${modelPersona}

${timeInfo}

Funciones adicionales:
- Análisis de imágenes, procesamiento de documentos, conversación multilingüe, búsqueda web, gestión de memoria
${memoriesContext}

Reglas importantes de idioma:
- CRÍTICO: Siempre responde en el MISMO IDIOMA que la entrada del usuario
- Detecta el idioma del usuario y responde SOLO en ese idioma
- Mantén un idioma consistente en toda tu respuesta

Importante:
- Responde en el idioma del usuario
- Cita fuentes web como [Fuente: número]
- Usa información recordada para personalización`,

        fr: `${modelPersona}

${timeInfo}

Fonctions supplémentaires:
- Analyse d'images, traitement de documents, conversation multilingue, recherche web, gestion de mémoire
${memoriesContext}

Règles linguistiques importantes:
- CRITIQUE: Répondez toujours dans la MÊME LANGUE que l'entrée de l'utilisateur
- Détectez la langue de l'utilisateur et répondez UNIQUEMENT dans cette langue
- Maintenez une langue cohérente tout au long de votre réponse

Important:
- Répondre dans la langue de l'utilisateur
- Citer les sources web comme [Source: numéro]
- Utiliser les informations mémorisées pour la personnalisation`,

        default: `${modelPersona}

${timeInfo}

Additional capabilities:
- Image analysis, document processing, multilingual conversation, web search, memory management
${memoriesContext}

CRITICAL: Always respond in the SAME LANGUAGE as the user's input. Detect their language and maintain it throughout your response.

Important:
- Respond in the user's language
- Cite web sources as [Source: number]
- Use remembered information for personalization`
      };

      return basePrompt[language as keyof typeof basePrompt] || basePrompt.default;
    }

    // Base system prompt with language detection and model persona
    let systemPrompt = getSystemPrompt(detectedLanguage, selectedModelId);
    const promptPreview = systemPrompt.substring(0, 200);
    console.log(`[System Prompt] Using prompt for language: ${detectedLanguage}`);
    console.log(`📝 [Demo Chat API] System Prompt Preview:`, promptPreview + '...\n');

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

    // Check for shopping intent and get recommendations
    let shoppingContext = '';
    if (shoppingEnabled) {
      try {
        const shoppingClient = getShoppingAPIClient();
        const shoppingIntent = shoppingClient.detectShoppingIntent(message.content);

        console.log('[Shopping] Intent detection:', shoppingIntent);

        if (shoppingIntent.hasIntent) {
          // Enhanced user profiling based on context
          const userProfile = {
            demographics: {
              lifestyle: '1인가구' as const, // TODO: Extract from memory
              budgetLevel: 'standard' as const,
              ageGroup: '30대' as const // TODO: Infer from conversation
            },
            purchaseBehavior: {
              priceSensitivity: detectedMood === '스트레스' ? 0.3 : 0.6, // Lower when stressed
              brandLoyalty: 0.5,
              varietySeeking: detectedMood === '우울' ? 0.3 : 0.7, // Comfort food when sad
              bulkBuying: isWeekend // Bulk buy on weekends
            },
            foodPreferences: {
              spicyLevel: 3 as const,
              favoriteCategories: ['식품', '간식'],
              avoidCategories: [],
              dietaryRestrictions: [] // TODO: Extract from memory
            },
            contextualNeeds: {
              currentMood: detectedMood || shoppingIntent.mood,
              healthGoals: [], // TODO: Extract from memory
              upcomingEvents: isWeekend ? ['주말'] : [],
              seasonalPreferences: new Map([[seasonContext, []]])
            }
          };

          // Enhanced context with time, mood, and season
          const enhancedContext = {
            mood: detectedMood || shoppingIntent.mood,
            timeOfDay: timeContext,
            season: seasonContext,
            isWeekend,
            query: shoppingIntent.searchQuery || message.content
          };

          // Determine search query based on context if not explicitly provided
          let searchQuery = shoppingIntent.searchQuery;
          if (!searchQuery) {
            // Context-based query generation
            if (enhancedContext.mood === '스트레스') {
              searchQuery = '초콜릿';
            } else if (enhancedContext.timeOfDay === '야식') {
              searchQuery = '라면';
            } else if (enhancedContext.timeOfDay === '아침') {
              searchQuery = '빵';
            } else if (enhancedContext.isWeekend) {
              searchQuery = '과자';
            } else {
              searchQuery = '간식';
            }
          }
          // Use personalized recommendations with enhanced context
          const recommendations = await shoppingClient.getPersonalizedRecommendations(
            searchQuery,
            userProfile,
            enhancedContext
          );

          if (recommendations.products.length > 0) {
            shoppingContext = shoppingClient.formatProductsForChat(
              recommendations.products,
              recommendations.reasoning
            );
            console.log('[Shopping] Found products:', recommendations.products.length);
          }
        }
      } catch (error) {
        console.error('[Shopping] Error getting recommendations:', error);
      }
    }

    // Combine system prompt with search results and shopping recommendations
    let shoppingInstructions = '';
    if (shoppingContext && detectedLanguage === 'ko') {
      // Add personalized shopping instructions for Korean users
      if (detectedMood) {
        const moodMessages: Record<string, string> = {
          '스트레스': '\n힘든 하루였군요. 달콤한 간식으로 기분을 풀어보세요!',
          '피곤': '\n피곤하시네요. 에너지를 충전할 수 있는 제품들이에요.',
          '우울': '\n마음이 힘드신가요? 행복한 맛으로 기분을 달래보세요.',
          '기쁨': '\n기분 좋은 날이네요! 특별한 간식으로 더 행복해지세요!'
        };
        shoppingInstructions = moodMessages[detectedMood] || '';
      }

      if (isWeekend) {
        shoppingInstructions += '\n주말 특별 할인 상품도 포함했어요!';
      }

      if (timeContext === '야식') {
        shoppingInstructions += '\n야식으로 딱 좋은 상품들이에요. 배송비가 무료인 것들 위주로 골라봤어요!';
      }
    }

    const fullSystemPrompt = systemPrompt +
      (searchContext ? '\n\n' + searchContext : '') +
      (shoppingContext ? '\n\n쇼핑 추천 정보입니다. 아래 내용을 그대로 전달하되, 자연스럽게 대화체로 응답해주세요. 특히 이미지 마크다운(![상품명](URL))은 반드시 유지해야 합니다:\n' + shoppingInstructions + '\n' + shoppingContext : '');

    // Add language-specific instruction to enforce correct response language
    let userContent = message.content;
    const languageInstructions = {
      ko: "반드시 한국어로만 답변하세요. 영어 금지.",
      ja: "必ず日本語のみで回答してください。",
      zh: "请务必只用中文回答。",
      es: "Responde solo en español.",
      fr: "Répondez uniquement en français.",
      de: "Antworten Sie nur auf Deutsch.",
      ru: "Отвечайте только на русском языке.",
      it: "Rispondi solo in italiano.",
      pt: "Responda apenas em português.",
      ar: "أجب باللغة العربية فقط.",
      th: "ตอบเป็นภาษาไทยเท่านั้น",
      vi: "Chỉ trả lời bằng tiếng Việt."
    };

    if (languageInstructions[detectedLanguage as keyof typeof languageInstructions]) {
      userContent = `${languageInstructions[detectedLanguage as keyof typeof languageInstructions]}

${message.content}`;
    }

    const messages = [
      {
        role: 'system',
        content: fullSystemPrompt
      },
      {
        role: 'user',
        content: userContent
      }
    ];

    // Prepare the payload for Friendli AI
    const payload = {
      model: FRIENDLI_MODEL,
      messages,
      stream: true,
      temperature: detectedLanguage === 'ko' ? 0.3 : 0.8, // Lower temperature for Korean to ensure consistency
      max_tokens: 2000
    };

    // Try Friendli AI first, then fallback to xAI Grok
    let response: Response;
    let usingFallback = false;

    try {
      console.log('[AI API] Attempting Friendli AI...');
      response = await fetch(FRIENDLI_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${FRIENDLI_API_KEY}`,
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Friendli AI error: ${response.status}`);
      }
      console.log('[AI API] Friendli AI successful');
    } catch (friendliError) {
      console.error('[AI API] Friendli AI failed:', friendliError);
      console.log('[AI API] Falling back to xAI Grok...');

      if (!XAI_API_KEY) {
        console.error('[AI API] No xAI API key available');
        return new Response(JSON.stringify({ error: 'AI service unavailable' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Prepare payload for xAI Grok
      const xaiPayload = {
        model: XAI_MODEL,
        messages: payload.messages,
        stream: true,
        temperature: payload.temperature,
        max_tokens: payload.max_tokens
      };

      try {
        response = await fetch(XAI_BASE_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${XAI_API_KEY}`,
            'Accept': 'text/event-stream'
          },
          body: JSON.stringify(xaiPayload)
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.error('[AI API] xAI Grok error:', errorText);
          throw new Error(`xAI error: ${response.status}`);
        }

        console.log('[AI API] xAI Grok successful');
        usingFallback = true;
      } catch (xaiError) {
        console.error('[AI API] xAI also failed:', xaiError);
        console.log('[AI API] Trying Fireworks AI as final fallback...');

        if (!FIREWORKS_API_KEY) {
          console.error('[AI API] No Fireworks API key available');
          return new Response(JSON.stringify({ error: 'All AI services unavailable' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Prepare payload for Fireworks AI
        const fireworksPayload = {
          model: FIREWORKS_MODEL,
          messages: payload.messages,
          stream: true,
          temperature: payload.temperature,
          max_tokens: payload.max_tokens
        };

        try {
          response = await fetch(FIREWORKS_BASE_URL, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${FIREWORKS_API_KEY}`,
              'Accept': 'text/event-stream'
            },
            body: JSON.stringify(fireworksPayload)
          });

          if (!response.ok) {
            const errorText = await response.text();
            console.error('[AI API] Fireworks error:', errorText);
            throw new Error(`Fireworks error: ${response.status}`);
          }

          console.log('[AI API] Fireworks AI successful');
          usingFallback = true;
        } catch (fireworksError) {
          console.error('[AI API] All AI services failed:', fireworksError);

          // Fallback to mock response for testing when all AI services fail
          if (shoppingContext) {
            // If we have shopping recommendations, return them as a simple response
            const mockResponse = `data: {"choices":[{"delta":{"content":"${shoppingContext.replace(/"/g, '\\"').replace(/\n/g, '\\n')}"}}]}\n\ndata: [DONE]\n\n`;

            return new Response(mockResponse, {
              headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
              }
            });
          }

          return new Response(JSON.stringify({ error: 'All AI services unavailable' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
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
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type'
        },
      });
    }

    // Return the streaming response directly
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
    });
    
  } catch (error) {
    console.error('Enhanced Demo Chat API error:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, Authorization',
      'Access-Control-Max-Age': '86400',
    }
  });
}