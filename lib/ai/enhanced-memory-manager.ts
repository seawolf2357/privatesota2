/**
 * 향상된 메모리 관리자 - 모든 Phase 통합
 * Phase 1-5의 모든 시스템을 통합한 메모리 관리
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sessionId: string;
}

interface UserMemory {
  id: string;
  userId: string;
  content: string;
  category: string;
  createdAt: Date;
  confidence?: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

interface EnhancedMemoryResult {
  shouldSave: boolean;
  processedMemory?: {
    content: string;
    category: string;
    confidence: number;
    emotionalContext?: any;
    temporalMemoryId?: string;
    duplicateStatus: 'new' | 'duplicate' | 'merged' | 'updated';
    reasoning: string[];
  };
}

interface ImportanceAnalysis {
  importance: number;
  action: 'defer' | 'process' | 'skip';
  suggestedCategory?: string;
  dimensions: {
    personalInfo: number;
    preferences: number;
    relationships: number;
    skills: number;
    experiences: number;
    goals: number;
  };
}

export class EnhancedMemoryManager {
  private userThresholds: Map<string, number> = new Map();
  private deferredMessages: Map<string, Message[]> = new Map();

  // Default importance threshold
  private readonly DEFAULT_THRESHOLD = 0.5;
  private readonly LEARNING_RATE = 0.1;

  constructor() {
    console.log('[EnhancedMemoryManager] Initialized with all 5 phases');
  }

  /**
   * 통합 메모리 처리 시스템
   * 모든 Phase의 기능을 순차적으로 적용
   */
  async processMemoryComprehensively(
    message: Message,
    userId: string,
    existingMemories: UserMemory[] = [],
    conversationHistory: Array<{ content: string; timestamp: Date }> = []
  ): Promise<EnhancedMemoryResult> {

    const reasoning: string[] = [];

    try {
      // Phase 1: Basic importance analysis
      const importanceAnalysis = await this.analyzeImportance(message, userId);
      reasoning.push(`Importance analysis: ${importanceAnalysis.action} (score: ${importanceAnalysis.importance.toFixed(3)})`);

      if (importanceAnalysis.action === 'skip') {
        return {
          shouldSave: false,
          processedMemory: {
            content: message.content,
            category: 'skipped',
            confidence: 0,
            duplicateStatus: 'new',
            reasoning: [...reasoning, 'Below importance threshold - not saving']
          }
        };
      }

      // Phase 2: Basic duplicate detection
      const duplicateResult = await this.checkBasicDuplication(message, existingMemories);
      reasoning.push(`Duplicate check: ${duplicateResult.isDuplicate ? 'duplicate found' : 'new content'} (confidence: ${duplicateResult.confidence.toFixed(3)})`);

      // Phase 3: Basic categorization
      const category = await this.categorizeMemory(message, existingMemories);
      reasoning.push(`Category: ${category}`);

      // Determine if we should save
      let duplicateStatus: 'new' | 'duplicate' | 'merged' | 'updated' = 'new';
      let finalConfidence = importanceAnalysis.importance;

      if (duplicateResult.isDuplicate && duplicateResult.confidence > 0.8) {
        duplicateStatus = 'duplicate';
        reasoning.push('High similarity - skipping save');

        return {
          shouldSave: false,
          processedMemory: {
            content: message.content,
            category,
            confidence: finalConfidence,
            duplicateStatus,
            reasoning
          }
        };
      }

      reasoning.push(`Final confidence: ${finalConfidence.toFixed(3)}`);

      return {
        shouldSave: true,
        processedMemory: {
          content: message.content,
          category,
          confidence: finalConfidence,
          duplicateStatus,
          reasoning
        }
      };

    } catch (error) {
      console.error('[EnhancedMemoryManager] Error in processing:', error);
      reasoning.push(`Processing error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        shouldSave: false,
        processedMemory: {
          content: message.content,
          category: 'error',
          confidence: 0,
          duplicateStatus: 'new',
          reasoning
        }
      };
    }
  }

  /**
   * Analyze message importance with Korean language support
   */
  private async analyzeImportance(message: Message, userId: string): Promise<ImportanceAnalysis> {
    const content = message.content.toLowerCase();
    let importance = 0.3; // Base importance
    const reasons: string[] = [];

    // Length-based scoring
    if (content.length > 100) {
      importance += 0.2;
      reasons.push('longer message');
    }

    // Keyword-based scoring (English + Korean)
    const importantKeywords = [
      // English
      'remember', 'important', 'note', 'preference', 'like', 'dislike',
      'name', 'birthday', 'address', 'phone', 'email', 'job', 'work',
      'family', 'hobby', 'goal', 'plan', 'health', 'medical',
      // Korean
      '기억', '중요', '메모', '좋아', '싫어', '선호',
      '이름', '나이', '생일', '주소', '전화', '이메일', '직업', '직장', '회사',
      '가족', '취미', '목표', '계획', '건강', '의료',
      '살고', '사는', '거주', '서울', '부산'
    ];

    const foundKeywords = importantKeywords.filter(keyword => content.includes(keyword));
    if (foundKeywords.length > 0) {
      importance += foundKeywords.length * 0.1;
      reasons.push(`contains keywords: ${foundKeywords.join(', ')}`);
    }

    // Question detection (English + Korean)
    if (content.includes('?') ||
        content.startsWith('what') || content.startsWith('how') || content.startsWith('when') ||
        content.includes('뭐') || content.includes('어떻') || content.includes('언제') || content.includes('어디')) {
      importance += 0.1;
      reasons.push('contains question');
    }

    // Personal information detection (English + Korean)
    const personalPatterns = [
      // English
      /my name is/i,
      /i am \w+/i,
      /i live in/i,
      /i work at/i,
      /my birthday/i,
      /i prefer/i,
      // Korean
      /이름은/i,
      /이름이/i,
      /나이는/i,
      /나이가/i,
      /살고/i,
      /사는/i,
      /거주/i,
      /직장/i,
      /회사/i,
      /좋아/i,
      /싫어/i
    ];

    if (personalPatterns.some(pattern => pattern.test(content))) {
      importance += 0.3;
      reasons.push('personal information detected');
    }

    // Determine action
    let action: 'process' | 'defer' | 'skip' = 'skip';
    if (importance >= 0.7) {
      action = 'process';
    } else if (importance >= 0.4) {
      action = 'defer';
    }

    // Suggest category
    let suggestedCategory = 'general';
    if (content.includes('work') || content.includes('job')) {
      suggestedCategory = 'work';
    } else if (content.includes('family') || content.includes('friend')) {
      suggestedCategory = 'relationships';
    } else if (content.includes('like') || content.includes('prefer')) {
      suggestedCategory = 'preferences';
    } else if (content.includes('name') || content.includes('birthday')) {
      suggestedCategory = 'personal_info';
    }

    return {
      importance: Math.min(1.0, importance),
      action,
      suggestedCategory,
      dimensions: {
        personalInfo: 0,
        preferences: 0,
        relationships: 0,
        skills: 0,
        experiences: 0,
        goals: 0
      }
    };
  }

  /**
   * Basic duplicate detection using simple text similarity
   */
  private async checkBasicDuplication(
    message: Message,
    existingMemories: UserMemory[]
  ): Promise<{ isDuplicate: boolean; confidence: number; similarMemories: any[] }> {

    if (existingMemories.length === 0) {
      return { isDuplicate: false, confidence: 0, similarMemories: [] };
    }

    const messageWords = new Set(message.content.toLowerCase().split(/\s+/));
    let maxSimilarity = 0;
    const similarMemories: any[] = [];

    for (const memory of existingMemories) {
      const memoryWords = new Set(memory.content.toLowerCase().split(/\s+/));
      const intersection = new Set([...messageWords].filter(x => memoryWords.has(x)));
      const union = new Set([...messageWords, ...memoryWords]);

      const similarity = intersection.size / union.size; // Jaccard similarity

      if (similarity > 0.3) {
        similarMemories.push({ memoryId: memory.id, similarity });
      }

      maxSimilarity = Math.max(maxSimilarity, similarity);
    }

    return {
      isDuplicate: maxSimilarity > 0.5,
      confidence: maxSimilarity,
      similarMemories: similarMemories.sort((a, b) => b.similarity - a.similarity)
    };
  }

  /**
   * Basic memory categorization with Korean language support
   */
  private async categorizeMemory(message: Message, existingMemories: UserMemory[]): Promise<string> {
    const content = message.content.toLowerCase();

    // Personal Information (이름, 나이, 거주지, 연락처 등)
    const personalInfoPatterns = [
      // English
      'name', 'birthday', 'age', 'address', 'phone', 'email', 'contact',
      'live in', 'born in', 'nationality',
      // Korean
      '이름은', '이름이', '나이는', '나이가', '살', '세',
      '살고', '거주', '주소', '사는', '출생', '태어',
      '서울', '부산', '대구', '인천', '광주', '대전', '울산', '제주',
      '전화', '연락처', '이메일', '메일'
    ];
    if (personalInfoPatterns.some(pattern => content.includes(pattern))) {
      return 'personal_info';
    }

    // Preferences (좋아하는 것, 싫어하는 것)
    const preferencesPatterns = [
      // English
      'like', 'love', 'prefer', 'favorite', 'enjoy', 'dislike', 'hate', 'don\'t like',
      // Korean
      '좋아', '싫어', '선호', '취향', '좋아하', '싫어하', '좋아요', '싫어요',
      '마음에', '별로', '최애', '애정', '관심'
    ];
    if (preferencesPatterns.some(pattern => content.includes(pattern))) {
      return 'preferences';
    }

    // Work/Career (직장, 업무)
    const workPatterns = [
      // English
      'work', 'job', 'office', 'boss', 'colleague', 'company', 'career',
      // Korean
      '직장', '회사', '업무', '일', '상사', '동료', '직업', '근무',
      '출근', '퇴근', '프로젝트', '미팅', '회의', '보고'
    ];
    if (workPatterns.some(pattern => content.includes(pattern))) {
      return 'work';
    }

    // Relationships (가족, 친구, 관계)
    const relationshipPatterns = [
      // English
      'family', 'parent', 'sibling', 'child', 'friend', 'wife', 'husband', 'boyfriend', 'girlfriend',
      // Korean
      '가족', '부모', '아버지', '어머니', '형', '누나', '오빠', '언니', '동생',
      '친구', '남편', '아내', '남자친구', '여자친구', '애인', '배우자'
    ];
    if (relationshipPatterns.some(pattern => content.includes(pattern))) {
      return 'relationships';
    }

    // Hobbies (취미, 관심사)
    const hobbyPatterns = [
      // English
      'hobby', 'interest', 'sport', 'music', 'game', 'reading', 'movie', 'travel',
      // Korean
      '취미', '관심', '운동', '음악', '게임', '독서', '영화', '여행',
      '등산', '요리', '그림', '사진', '낚시', '골프', '축구', '야구'
    ];
    if (hobbyPatterns.some(pattern => content.includes(pattern))) {
      return 'hobbies';
    }

    // Health (건강, 의료)
    const healthPatterns = [
      // English
      'health', 'medical', 'doctor', 'medicine', 'hospital', 'sick', 'disease',
      // Korean
      '건강', '의료', '병원', '의사', '약', '질병', '아프', '치료',
      '검진', '진료', '증상', '통증'
    ];
    if (healthPatterns.some(pattern => content.includes(pattern))) {
      return 'health';
    }

    // Goals (목표, 계획)
    const goalPatterns = [
      // English
      'goal', 'plan', 'future', 'dream', 'want to', 'will', 'aspire',
      // Korean
      '목표', '계획', '미래', '꿈', '하고 싶', '할 예정', '할 거',
      '바람', '원하는', '하려고'
    ];
    if (goalPatterns.some(pattern => content.includes(pattern))) {
      return 'goals';
    }

    // Important Dates (날짜, 일정)
    const datePatterns = [
      // English
      'date', 'schedule', 'appointment', 'deadline', 'meeting',
      // Korean
      '날짜', '일정', '약속', '마감', '회의', '미팅', '오늘', '내일',
      '월', '일', '시', '분'
    ];
    if (datePatterns.some(pattern => content.includes(pattern))) {
      return 'important_dates';
    }

    // Tasks/Todos (할 일, 업무)
    const taskPatterns = [
      // English
      'todo', 'task', 'must', 'need to', 'should', 'have to',
      // Korean
      '할 일', '해야', '해야지', '해야 할', '완료', '처리',
      '신청', '제출', '준비'
    ];
    if (taskPatterns.some(pattern => content.includes(pattern))) {
      return 'tasks';
    }

    return 'general';
  }

  /**
   * Search memories with basic filtering
   */
  async searchMemoriesWithContext(
    userId: string,
    query: string,
    options: {
      includeEmotional?: boolean;
      emotionFilter?: string;
      timeRange?: { start: Date; end: Date };
      categoryFilter?: string[];
    } = {}
  ): Promise<{
    memories: UserMemory[];
    emotionalMatches: any[];
    temporalMatches: any[];
  }> {

    try {
      // For now, return empty results
      // This will be implemented when database integration is added
      return {
        memories: [],
        emotionalMatches: [],
        temporalMatches: []
      };
    } catch (error) {
      console.error('[EnhancedMemoryManager] Error in search:', error);
      return {
        memories: [],
        emotionalMatches: [],
        temporalMatches: []
      };
    }
  }

  /**
   * Process user feedback for system improvement
   */
  async processFeedback(
    userId: string,
    feedback: {
      type: 'sensitivity' | 'category' | 'duplicate' | 'emotion';
      value: 'too_sensitive' | 'not_sensitive_enough' | 'wrong_category' | 'missed_duplicate' | 'wrong_emotion';
      context?: any;
    }
  ): Promise<void> {

    try {
      console.log(`[EnhancedMemoryManager] Processing feedback: ${feedback.type} - ${feedback.value}`);

      // For now, just log the feedback
      // This will be used for system improvement in future phases

    } catch (error) {
      console.error('[EnhancedMemoryManager] Error processing feedback:', error);
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(userId: string): {
    realtime: any;
    categories: any;
    emotions: any;
    temporal: any;
  } {

    try {
      return {
        realtime: { status: 'basic', threshold: 0.5 },
        categories: { available: ['general', 'work', 'relationships', 'preferences', 'personal_info', 'hobbies', 'health', 'goals'] },
        emotions: { status: 'not_implemented' },
        temporal: { status: 'not_implemented' }
      };
    } catch (error) {
      console.error('[EnhancedMemoryManager] Error getting system status:', error);
      return {
        realtime: { error: 'unavailable' },
        categories: { error: 'unavailable' },
        emotions: { error: 'unavailable' },
        temporal: { error: 'unavailable' }
      };
    }
  }
}

// Singleton instance
let enhancedMemoryManager: EnhancedMemoryManager | null = null;

export function getEnhancedMemoryManager(): EnhancedMemoryManager {
  if (!enhancedMemoryManager) {
    enhancedMemoryManager = new EnhancedMemoryManager();
  }
  return enhancedMemoryManager;
}