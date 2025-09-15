/**
 * Enhanced Memory Manager - Phase 1 Implementation
 * Core memory processing system for PrivateSOTA2
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
  action: 'save' | 'defer' | 'skip';
  suggestedCategory?: string;
  reasoning: string;
}

export class EnhancedMemoryManager {

  constructor() {
    console.log('[EnhancedMemoryManager] Initialized');
  }

  /**
   * Basic memory processing with importance analysis
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
   * Analyze message importance
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

    // Keyword-based scoring
    const importantKeywords = [
      'remember', 'important', 'note', 'preference', 'like', 'dislike',
      'name', 'birthday', 'address', 'phone', 'email', 'job', 'work',
      'family', 'hobby', 'goal', 'plan', 'health', 'medical'
    ];

    const foundKeywords = importantKeywords.filter(keyword => content.includes(keyword));
    if (foundKeywords.length > 0) {
      importance += foundKeywords.length * 0.1;
      reasons.push(`contains keywords: ${foundKeywords.join(', ')}`);
    }

    // Question detection
    if (content.includes('?') || content.startsWith('what') || content.startsWith('how') || content.startsWith('when')) {
      importance += 0.1;
      reasons.push('contains question');
    }

    // Personal information detection
    const personalPatterns = [
      /my name is/i,
      /i am \w+/i,
      /i live in/i,
      /i work at/i,
      /my birthday/i,
      /i prefer/i
    ];

    if (personalPatterns.some(pattern => pattern.test(content))) {
      importance += 0.3;
      reasons.push('personal information detected');
    }

    // Determine action
    let action: 'save' | 'defer' | 'skip' = 'skip';
    if (importance >= 0.7) {
      action = 'save';
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
      reasoning: reasons.join(', ')
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
   * Basic memory categorization
   */
  private async categorizeMemory(message: Message, existingMemories: UserMemory[]): Promise<string> {
    const content = message.content.toLowerCase();

    // Rule-based categorization
    if (content.includes('work') || content.includes('job') || content.includes('office') || content.includes('boss')) {
      return 'work';
    }

    if (content.includes('family') || content.includes('parent') || content.includes('sibling') || content.includes('child')) {
      return 'relationships';
    }

    if (content.includes('like') || content.includes('prefer') || content.includes('favorite') || content.includes('enjoy')) {
      return 'preferences';
    }

    if (content.includes('name') || content.includes('birthday') || content.includes('age') || content.includes('address')) {
      return 'personal_info';
    }

    if (content.includes('hobby') || content.includes('interest') || content.includes('sport') || content.includes('music')) {
      return 'hobbies';
    }

    if (content.includes('health') || content.includes('medical') || content.includes('doctor') || content.includes('medicine')) {
      return 'health';
    }

    if (content.includes('goal') || content.includes('plan') || content.includes('future') || content.includes('dream')) {
      return 'goals';
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