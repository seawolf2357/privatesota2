/**
 * Enhanced Memory Manager V2 - Complete 5-Phase Integration
 * Implements all advanced memory processing capabilities
 */

import { Message, UserMemory } from './types';
import { randomUUID } from 'crypto';

// ==================== INTERFACES ====================

interface EnhancedMemoryResult {
  shouldSave: boolean;
  processedMemory?: {
    content: string;
    category: string;
    confidence: number;
    emotionalContext?: EmotionalContext;
    temporalMemoryId?: string;
    duplicateStatus: 'new' | 'duplicate' | 'merged' | 'updated';
    reasoning: string[];
    importance: number;
    semanticEmbedding?: number[];
  };
}

interface ImportanceAnalysis {
  importance: number;
  action: 'save' | 'defer' | 'skip';
  suggestedCategory?: string;
  reasoning: string[];
  dimensions: {
    personalInfo: number;
    preferences: number;
    relationships: number;
    skills: number;
    experiences: number;
    goals: number;
  };
}

interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: number;
  similarMemories: Array<{
    memoryId: string;
    similarity: number;
    type: 'exact' | 'semantic' | 'partial';
  }>;
  mergeStrategy?: 'skip' | 'update' | 'merge' | 'versioning';
}

interface CategoryResult {
  primary: string;
  secondary: string[];
  confidence: number;
  isNewCategory: boolean;
  reasoning: string;
}

interface TemporalAnalysis {
  versionHistory: Array<{
    timestamp: Date;
    content: string;
    changeType: 'creation' | 'update' | 'merge';
  }>;
  importanceDecay: number;
  lastAccessed: Date;
  accessFrequency: number;
  temporalRelations: Array<{
    relatedMemoryId: string;
    relationType: 'before' | 'after' | 'concurrent' | 'causal';
  }>;
}

interface EmotionalContext {
  primaryEmotion: string;
  emotionIntensity: number;
  secondaryEmotions: string[];
  sentimentScore: number;
  emotionalEvolution: Array<{
    timestamp: Date;
    emotion: string;
    intensity: number;
  }>;
}

// ==================== PHASE 1: REAL-TIME MEMORY PROCESSING ====================

class RealtimeMemoryProcessor {
  private userThresholds: Map<string, number> = new Map();
  private deferredMessages: Map<string, Message[]> = new Map();
  private readonly DEFAULT_THRESHOLD = 0.2;  // Lower threshold for better memory capture
  private readonly LEARNING_RATE = 0.1;

  async analyzeImportance(message: Message, userId: string): Promise<ImportanceAnalysis> {
    const content = message.content.toLowerCase();
    const dimensions = {
      personalInfo: 0,
      preferences: 0,
      relationships: 0,
      skills: 0,
      experiences: 0,
      goals: 0
    };
    const reasoning: string[] = [];

    // Add base importance for any meaningful content
    let baseImportance = 0.1;
    if (content.length > 20) {
      baseImportance += 0.05;
      reasoning.push('Longer message bonus');
    }

    // Personal Information Detection (English + Korean)
    const personalPatterns = [
      /my name is/i, /i am \w+/i, /i live in/i, /i work at/i,
      /my birthday/i, /my phone/i, /my email/i, /my address/i,
      /제 이름은/i, /제 이름/i, /이름은/i, /이름이/i,
      /저는.*입니다/i, /나는.*입니다/i,
      /살고 있/i, /살고있/i, /에 살/i, /사는/i, /거주/i,
      /서울/i, /부산/i, /대구/i, /인천/i, /광주/i, /대전/i, /울산/i, /제주/i,
      /생일은/i, /생일이/i, /나이는/i, /나이가/i, /세/i,
      /전화번호/i, /이메일/i, /주소는/i, /주소가/i
    ];

    if (personalPatterns.some(p => p.test(content))) {
      dimensions.personalInfo = 0.9;
      reasoning.push('Contains personal identifying information');
    }

    // Preferences Detection (English + Korean)
    const preferenceKeywords = [
      'like', 'prefer', 'favorite', 'love', 'hate', 'dislike', 'enjoy',
      '좋아', '싫어', '사랑', '선호', '즐겨', '좋아하', '싫어하', '즐기'
    ];
    const preferenceCount = preferenceKeywords.filter(k => content.includes(k)).length;
    if (preferenceCount > 0) {
      dimensions.preferences = Math.min(0.8, preferenceCount * 0.3);
      reasoning.push(`Contains ${preferenceCount} preference indicators`);
    }

    // Relationships Detection (English + Korean)
    const relationshipKeywords = [
      'family', 'friend', 'partner', 'wife', 'husband', 'child', 'parent', 'colleague',
      '가족', '친구', '아내', '남편', '자녀', '부모', '동료', '배우자', '아이'
    ];
    if (relationshipKeywords.some(k => content.includes(k))) {
      dimensions.relationships = 0.7;
      reasoning.push('Contains relationship information');
    }

    // Skills Detection (English + Korean)
    const skillPatterns = [
      /i can/i, /i know how to/i, /skilled in/i, /experienced with/i,
      /할 수 있/i, /할 줄 알/i, /잘하/i, /능숙/i, /경험이 있/i
    ];
    if (skillPatterns.some(p => p.test(content))) {
      dimensions.skills = 0.6;
      reasoning.push('Contains skill or capability information');
    }

    // Experience Detection (English + Korean)
    const experiencePatterns = [
      /i have been/i, /i worked/i, /i visited/i, /i studied/i,
      /했습니다/i, /했어요/i, /일했/i, /방문했/i, /공부했/i, /다녀왔/i
    ];
    if (experiencePatterns.some(p => p.test(content))) {
      dimensions.experiences = 0.6;
      reasoning.push('Contains experience information');
    }

    // Goals Detection (English + Korean)
    const goalKeywords = [
      'goal', 'plan', 'want to', 'will', 'going to', 'dream', 'aspire',
      '목표', '계획', '싶어', '싶습니다', '예정', '꿈', '하려고', '할 거'
    ];
    if (goalKeywords.some(k => content.includes(k))) {
      dimensions.goals = 0.7;
      reasoning.push('Contains goals or aspirations');
    }

    // Calculate overall importance (use maximum dimension value instead of average)
    // This ensures that strong signals in any dimension are properly weighted
    const maxDimensionValue = Math.max(...Object.values(dimensions), 0);
    const importance = Math.min(1.0, baseImportance + maxDimensionValue);

    // Determine action based on adaptive threshold
    const threshold = this.userThresholds.get(userId) || this.DEFAULT_THRESHOLD;
    let action: 'save' | 'defer' | 'skip' = 'skip';

    if (importance >= threshold) {
      action = 'save';
    } else if (importance >= threshold * 0.6) {
      action = 'defer';
      this.addToDeferredQueue(userId, message);
    } else {
      action = 'skip';
    }

    // Suggest primary category
    const maxDimension = Object.entries(dimensions).reduce((max, [key, value]) =>
      value > max.value ? { key, value } : max, { key: '', value: 0 });

    const categoryMap: { [key: string]: string } = {
      personalInfo: 'personal_info',
      preferences: 'preferences',
      relationships: 'relationships',
      skills: 'skills',
      experiences: 'experiences',
      goals: 'goals'
    };

    return {
      importance,
      action,
      suggestedCategory: categoryMap[maxDimension.key] || 'general',
      reasoning,
      dimensions
    };
  }

  private addToDeferredQueue(userId: string, message: Message): void {
    const queue = this.deferredMessages.get(userId) || [];
    queue.push(message);
    if (queue.length > 10) {
      queue.shift(); // Remove oldest if queue is too long
    }
    this.deferredMessages.set(userId, queue);
  }

  async processDeferredMessages(userId: string): Promise<Message[]> {
    const deferred = this.deferredMessages.get(userId) || [];
    this.deferredMessages.delete(userId);
    return deferred;
  }

  updateUserThreshold(userId: string, feedback: 'too_sensitive' | 'not_sensitive_enough'): void {
    const currentThreshold = this.userThresholds.get(userId) || this.DEFAULT_THRESHOLD;
    const adjustment = feedback === 'too_sensitive' ? 0.05 : -0.05;
    const newThreshold = Math.max(0.1, Math.min(0.9, currentThreshold + adjustment));
    this.userThresholds.set(userId, newThreshold);
  }
}

// ==================== PHASE 2: INTELLIGENT DUPLICATE DETECTION ====================

class IntelligentDuplicateDetector {
  async detectDuplicates(
    message: Message,
    existingMemories: UserMemory[]
  ): Promise<DuplicateDetectionResult> {
    if (existingMemories.length === 0) {
      return {
        isDuplicate: false,
        confidence: 0,
        similarMemories: []
      };
    }

    const similarities = await Promise.all(
      existingMemories.map(async memory => ({
        memoryId: memory.id,
        ...await this.calculateSimilarity(message.content, memory.content)
      }))
    );

    // Sort by similarity score
    similarities.sort((a, b) => b.similarity - a.similarity);

    const topMatch = similarities[0];
    const isDuplicate = topMatch.similarity > 0.85;

    // Determine merge strategy
    let mergeStrategy: 'skip' | 'update' | 'merge' | 'versioning' = 'skip';
    if (topMatch.similarity > 0.95) {
      mergeStrategy = 'skip';
    } else if (topMatch.similarity > 0.85) {
      mergeStrategy = 'update';
    } else if (topMatch.similarity > 0.7) {
      mergeStrategy = 'merge';
    } else if (topMatch.similarity > 0.5) {
      mergeStrategy = 'versioning';
    }

    return {
      isDuplicate,
      confidence: topMatch.similarity,
      similarMemories: similarities.filter(s => s.similarity > 0.3),
      mergeStrategy
    };
  }

  private async calculateSimilarity(
    text1: string,
    text2: string
  ): Promise<{ similarity: number; type: 'exact' | 'semantic' | 'partial' }> {
    // Exact match
    if (text1 === text2) {
      return { similarity: 1.0, type: 'exact' };
    }

    // Calculate TF-IDF similarity
    const tfidfScore = this.calculateTFIDF(text1, text2);

    // Calculate Jaccard similarity
    const jaccardScore = this.calculateJaccard(text1, text2);

    // Calculate semantic similarity (simplified)
    const semanticScore = this.calculateSemanticSimilarity(text1, text2);

    // Weighted combination
    const finalScore = (tfidfScore * 0.4) + (jaccardScore * 0.3) + (semanticScore * 0.3);

    const type = finalScore > 0.9 ? 'exact' : finalScore > 0.6 ? 'semantic' : 'partial';

    return { similarity: finalScore, type };
  }

  private calculateTFIDF(text1: string, text2: string): number {
    const words1 = text1.toLowerCase().split(/\s+/);
    const words2 = text2.toLowerCase().split(/\s+/);

    const allWords = [...new Set([...words1, ...words2])];

    const vector1 = allWords.map(word => words1.filter(w => w === word).length);
    const vector2 = allWords.map(word => words2.filter(w => w === word).length);

    // Cosine similarity
    const dotProduct = vector1.reduce((sum, val, idx) => sum + val * vector2[idx], 0);
    const magnitude1 = Math.sqrt(vector1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vector2.reduce((sum, val) => sum + val * val, 0));

    return magnitude1 && magnitude2 ? dotProduct / (magnitude1 * magnitude2) : 0;
  }

  private calculateJaccard(text1: string, text2: string): number {
    const set1 = new Set(text1.toLowerCase().split(/\s+/));
    const set2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }

  private calculateSemanticSimilarity(text1: string, text2: string): number {
    // Simplified semantic similarity based on common n-grams
    const ngrams1 = this.getNGrams(text1.toLowerCase(), 2);
    const ngrams2 = this.getNGrams(text2.toLowerCase(), 2);

    const common = ngrams1.filter(ng => ngrams2.includes(ng));
    const total = new Set([...ngrams1, ...ngrams2]).size;

    return total > 0 ? common.length / total : 0;
  }

  private getNGrams(text: string, n: number): string[] {
    const words = text.split(/\s+/);
    const ngrams: string[] = [];

    for (let i = 0; i <= words.length - n; i++) {
      ngrams.push(words.slice(i, i + n).join(' '));
    }

    return ngrams;
  }
}

// ==================== PHASE 3: DYNAMIC CATEGORY MANAGEMENT ====================

class DynamicCategoryManager {
  private categories: Map<string, CategoryMetadata> = new Map();
  private userCategories: Map<string, Set<string>> = new Map();

  constructor() {
    this.initializeDefaultCategories();
  }

  private initializeDefaultCategories(): void {
    const defaults = [
      'personal_info', 'preferences', 'relationships', 'work',
      'health', 'hobbies', 'goals', 'experiences', 'skills',
      'education', 'finance', 'travel', 'food', 'entertainment'
    ];

    defaults.forEach(cat => {
      this.categories.set(cat, {
        name: cat,
        keywords: [],
        frequency: 0,
        lastUsed: new Date()
      });
    });
  }

  async categorizeMemory(
    message: Message,
    existingMemories: UserMemory[],
    userId: string
  ): Promise<CategoryResult> {
    const content = message.content.toLowerCase();
    const scores: Map<string, number> = new Map();
    const reasoning: string[] = [];

    // Score existing categories
    for (const [category, metadata] of this.categories) {
      const score = this.calculateCategoryScore(content, category, metadata);
      if (score > 0) {
        scores.set(category, score);
      }
    }

    // Check if we need a new category
    const maxScore = Math.max(...scores.values(), 0);
    let isNewCategory = false;
    let primaryCategory = 'general';

    if (maxScore < 0.3) {
      // Consider creating a new category
      const newCategory = await this.suggestNewCategory(content, existingMemories);
      if (newCategory) {
        primaryCategory = newCategory;
        isNewCategory = true;
        this.createUserCategory(userId, newCategory, content);
        reasoning.push(`Created new category: ${newCategory}`);
      }
    } else {
      // Use existing category with highest score
      primaryCategory = [...scores.entries()]
        .sort(([, a], [, b]) => b - a)[0][0];
      reasoning.push(`Matched existing category: ${primaryCategory}`);
    }

    // Get secondary categories
    const secondary = [...scores.entries()]
      .filter(([cat]) => cat !== primaryCategory && scores.get(cat)! > 0.2)
      .map(([cat]) => cat)
      .slice(0, 3);

    return {
      primary: primaryCategory,
      secondary,
      confidence: maxScore,
      isNewCategory,
      reasoning: reasoning.join(', ')
    };
  }

  private calculateCategoryScore(content: string, category: string, metadata: CategoryMetadata): number {
    let score = 0;

    // Keyword matching
    const categoryKeywords = this.getCategoryKeywords(category);
    const matchedKeywords = categoryKeywords.filter(k => content.includes(k));
    score += matchedKeywords.length * 0.2;

    // Pattern matching
    const patterns = this.getCategoryPatterns(category);
    const matchedPatterns = patterns.filter(p => p.test(content));
    score += matchedPatterns.length * 0.3;

    // User history bonus
    if (metadata.frequency > 0) {
      score += Math.min(0.2, metadata.frequency / 100);
    }

    return Math.min(1.0, score);
  }

  private getCategoryKeywords(category: string): string[] {
    const keywordMap: { [key: string]: string[] } = {
      personal_info: [
        'name', 'age', 'birthday', 'address', 'phone', 'email',
        '이름', '나이', '생일', '주소', '전화', '이메일', '살고', '사는', '거주',
        '서울', '부산', '대구', '인천', '광주', '대전', '울산', '세'
      ],
      preferences: [
        'like', 'prefer', 'favorite', 'enjoy', 'love', 'hate',
        '좋아', '싫어', '선호', '취향', '좋아하', '싫어하', '마음에'
      ],
      relationships: [
        'family', 'friend', 'partner', 'colleague', 'mother', 'father',
        '가족', '친구', '동료', '아내', '남편', '부모', '자녀', '엄마', '아빠'
      ],
      work: [
        'job', 'work', 'office', 'boss', 'project', 'career',
        '직장', '회사', '업무', '일', '상사', '프로젝트', '근무', '직업'
      ],
      health: [
        'health', 'doctor', 'medicine', 'sick', 'exercise', 'diet',
        '건강', '의사', '병원', '약', '운동', '다이어트', '아프', '치료'
      ],
      hobbies: [
        'hobby', 'fun', 'play', 'game', 'sport', 'music',
        '취미', '재미', '놀이', '게임', '운동', '음악', '여가'
      ],
      goals: [
        'goal', 'plan', 'future', 'dream', 'want', 'will',
        '목표', '계획', '미래', '꿈', '하고 싶', '할 예정', '바람'
      ],
      education: [
        'school', 'study', 'learn', 'degree', 'university', 'course',
        '학교', '공부', '배우', '학위', '대학', '수업', '교육'
      ],
      finance: [
        'money', 'pay', 'cost', 'budget', 'save', 'invest',
        '돈', '돈벌', '비용', '예산', '저축', '투자', '월급'
      ],
      travel: [
        'travel', 'trip', 'visit', 'vacation', 'flight', 'hotel',
        '여행', '여행가', '방문', '휴가', '비행기', '호텔'
      ],
      food: [
        'eat', 'food', 'cook', 'meal', 'restaurant', 'recipe',
        '먹', '음식', '요리', '식사', '식당', '레시피', '맛있'
      ],
      entertainment: [
        'movie', 'show', 'watch', 'listen', 'concert', 'theater',
        '영화', '쇼', '보', '듣', '콘서트', '공연', '드라마'
      ]
    };

    return keywordMap[category] || [];
  }

  private getCategoryPatterns(category: string): RegExp[] {
    const patternMap: { [key: string]: RegExp[] } = {
      personal_info: [
        /my name is/i, /i am \d+ years/i, /born in/i, /i live in/i,
        /이름은/i, /이름이/i, /나이는/i, /살고 있/i, /사는/i, /에 살/i
      ],
      preferences: [
        /i (like|love|prefer)/i, /favorite \w+ is/i,
        /좋아/i, /싫어/i, /선호/i
      ],
      relationships: [
        /my \w+ is/i, /have \d+ children/i,
        /가족/i, /친구/i, /부모/i
      ],
      work: [
        /work at/i, /job is/i, /employed by/i,
        /회사/i, /직장/i, /근무/i
      ],
      health: [
        /diagnosed with/i, /taking medication/i,
        /아프/i, /병원/i, /건강/i
      ],
      goals: [
        /want to/i, /planning to/i, /goal is to/i,
        /하고 싶/i, /목표/i, /계획/i
      ]
    };

    return patternMap[category] || [];
  }

  private async suggestNewCategory(content: string, existingMemories: UserMemory[]): Promise<string | null> {
    // Extract key concepts from content
    const concepts = this.extractKeyConcepts(content);

    if (concepts.length === 0) {
      return null;
    }

    // Generate category name from concepts
    const categoryName = concepts[0].toLowerCase().replace(/\s+/g, '_');

    // Validate it's not too similar to existing categories
    const existingNames = [...this.categories.keys()];
    const tooSimilar = existingNames.some(existing =>
      this.calculateStringSimilarity(categoryName, existing) > 0.7
    );

    if (tooSimilar) {
      return null;
    }

    return categoryName;
  }

  private extractKeyConcepts(content: string): string[] {
    // Simplified concept extraction
    const words = content.split(/\s+/);
    const importantWords = words.filter(word =>
      word.length > 4 && !this.isCommonWord(word.toLowerCase())
    );

    return importantWords.slice(0, 3);
  }

  private isCommonWord(word: string): boolean {
    const common = ['that', 'this', 'have', 'from', 'with', 'about', 'would', 'could', 'should'];
    return common.includes(word);
  }

  private calculateStringSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;

    if (longer.length === 0) {
      return 1.0;
    }

    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private levenshteinDistance(str1: string, str2: string): number {
    const matrix: number[][] = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  private createUserCategory(userId: string, categoryName: string, content: string): void {
    const userCats = this.userCategories.get(userId) || new Set();
    userCats.add(categoryName);
    this.userCategories.set(userId, userCats);

    this.categories.set(categoryName, {
      name: categoryName,
      keywords: content.toLowerCase().split(/\s+/).filter(w => w.length > 4),
      frequency: 1,
      lastUsed: new Date()
    });
  }
}

// ==================== PHASE 4: TEMPORAL MEMORY EVOLUTION ====================

class TemporalMemoryEvolution {
  private memoryVersions: Map<string, MemoryVersion[]> = new Map();
  private temporalRelations: Map<string, Set<TemporalRelation>> = new Map();

  async trackMemoryEvolution(
    memoryId: string,
    newContent: string,
    oldContent?: string
  ): Promise<TemporalAnalysis> {
    const versions = this.memoryVersions.get(memoryId) || [];

    // Add new version
    versions.push({
      timestamp: new Date(),
      content: newContent,
      changeType: oldContent ? 'update' : 'creation'
    });

    this.memoryVersions.set(memoryId, versions);

    // Calculate importance decay
    const creationTime = versions[0]?.timestamp || new Date();
    const ageInDays = (Date.now() - creationTime.getTime()) / (1000 * 60 * 60 * 24);
    const importanceDecay = Math.exp(-ageInDays / 30); // Decay over 30 days

    // Get temporal relations
    const relations = this.temporalRelations.get(memoryId) || new Set();

    return {
      versionHistory: versions,
      importanceDecay,
      lastAccessed: new Date(),
      accessFrequency: versions.length,
      temporalRelations: Array.from(relations)
    };
  }

  async resolveConflicts(
    memoryId: string,
    conflictingVersions: string[]
  ): Promise<string> {
    // Implement conflict resolution strategy
    if (conflictingVersions.length === 0) {
      return '';
    }

    if (conflictingVersions.length === 1) {
      return conflictingVersions[0];
    }

    // Merge strategy: combine unique information
    const allWords = new Set<string>();
    conflictingVersions.forEach(version => {
      version.split(/\s+/).forEach(word => allWords.add(word));
    });

    // Reconstruct merged content
    return Array.from(allWords).join(' ');
  }

  calculateDecayedImportance(originalImportance: number, ageInDays: number): number {
    // Exponential decay with different rates based on importance
    const decayRate = originalImportance > 0.8 ? 0.01 : originalImportance > 0.5 ? 0.03 : 0.05;
    return originalImportance * Math.exp(-decayRate * ageInDays);
  }

  establishTemporalRelation(
    memoryId1: string,
    memoryId2: string,
    relationType: 'before' | 'after' | 'concurrent' | 'causal'
  ): void {
    const relations1 = this.temporalRelations.get(memoryId1) || new Set();
    relations1.add({ relatedMemoryId: memoryId2, relationType });
    this.temporalRelations.set(memoryId1, relations1);

    // Add inverse relation
    const inverseType = relationType === 'before' ? 'after' :
                       relationType === 'after' ? 'before' : relationType;
    const relations2 = this.temporalRelations.get(memoryId2) || new Set();
    relations2.add({ relatedMemoryId: memoryId1, relationType: inverseType });
    this.temporalRelations.set(memoryId2, relations2);
  }
}

// ==================== PHASE 5: EMOTIONAL CONTEXT PROCESSING ====================

class EmotionalContextProcessor {
  private readonly BASIC_EMOTIONS = ['joy', 'sadness', 'anger', 'fear', 'surprise', 'disgust', 'trust'];
  private readonly COMPLEX_EMOTIONS = ['love', 'guilt', 'shame', 'pride', 'envy', 'gratitude', 'hope'];

  async analyzeEmotionalContext(
    message: Message,
    conversationHistory: Array<{ content: string; timestamp: Date }>
  ): Promise<EmotionalContext> {
    const content = message.content.toLowerCase();

    // Detect primary emotion
    const emotionScores = this.calculateEmotionScores(content);
    const primaryEmotion = this.getPrimaryEmotion(emotionScores);

    // Calculate emotion intensity
    const emotionIntensity = this.calculateIntensity(content, primaryEmotion);

    // Detect secondary emotions
    const secondaryEmotions = this.getSecondaryEmotions(emotionScores, primaryEmotion);

    // Calculate sentiment score
    const sentimentScore = this.calculateSentiment(content);

    // Track emotional evolution
    const emotionalEvolution = await this.trackEmotionalEvolution(
      conversationHistory,
      primaryEmotion,
      emotionIntensity
    );

    return {
      primaryEmotion,
      emotionIntensity,
      secondaryEmotions,
      sentimentScore,
      emotionalEvolution
    };
  }

  private calculateEmotionScores(content: string): Map<string, number> {
    const scores = new Map<string, number>();

    const emotionKeywords: { [emotion: string]: string[] } = {
      joy: ['happy', 'glad', 'cheerful', 'delighted', 'excited', 'wonderful',
            '행복', '기쁘', '즐거', '신나', '좋아', '멋지', '훌륭'],
      sadness: ['sad', 'unhappy', 'depressed', 'miserable', 'gloomy', 'sorrowful',
                '슬프', '우울', '속상', '서러', '눈물', '힘들'],
      anger: ['angry', 'mad', 'furious', 'annoyed', 'irritated', 'frustrated',
              '화나', '분노', '짜증', '열받', '답답', '빡치'],
      fear: ['afraid', 'scared', 'terrified', 'anxious', 'worried', 'nervous',
             '무서', '두려', '불안', '걱정', '긴장', '떨리'],
      surprise: ['surprised', 'amazed', 'astonished', 'shocked', 'unexpected',
                 '놀라', '깜짝', '신기', '의외', '뜻밖'],
      disgust: ['disgusted', 'revolted', 'repulsed', 'sick', 'awful',
                '역겨', '싫어', '징그러', '더러', '구역질'],
      trust: ['trust', 'believe', 'confident', 'secure', 'reliable',
              '믿', '신뢰', '확신', '안심', '든든'],
      love: ['love', 'adore', 'cherish', 'affection', 'caring',
             '사랑', '아끼', '소중', '애정', '좋아하'],
      guilt: ['guilty', 'remorse', 'regret', 'sorry', 'ashamed',
              '죄책', '미안', '후회', '죄송', '부끄러'],
      pride: ['proud', 'accomplished', 'successful', 'achieved',
              '자랑', '뿌듯', '성공', '달성', '이루'],
      hope: ['hope', 'optimistic', 'positive', 'looking forward',
             '희망', '기대', '긍정', '바라', '소망']
    };

    for (const [emotion, keywords] of Object.entries(emotionKeywords)) {
      const matches = keywords.filter(k => content.includes(k)).length;
      const score = matches * 0.3;
      scores.set(emotion, score);
    }

    // Analyze punctuation and capitalization for emotion intensity
    if (content.includes('!')) {
      const currentJoy = scores.get('joy') || 0;
      scores.set('joy', currentJoy + 0.1);
    }

    if (content.includes('?') && content.includes('why')) {
      const currentFear = scores.get('fear') || 0;
      scores.set('fear', currentFear + 0.1);
    }

    return scores;
  }

  private getPrimaryEmotion(scores: Map<string, number>): string {
    let maxEmotion = 'neutral';
    let maxScore = 0;

    for (const [emotion, score] of scores) {
      if (score > maxScore) {
        maxScore = score;
        maxEmotion = emotion;
      }
    }

    return maxScore > 0.2 ? maxEmotion : 'neutral';
  }

  private calculateIntensity(content: string, emotion: string): number {
    let intensity = 0.5; // Base intensity

    // Check for intensity modifiers
    const intensifiers = ['very', 'extremely', 'incredibly', 'absolutely', 'totally'];
    const diminishers = ['slightly', 'somewhat', 'a bit', 'a little', 'kind of'];

    intensifiers.forEach(word => {
      if (content.includes(word)) intensity += 0.2;
    });

    diminishers.forEach(word => {
      if (content.includes(word)) intensity -= 0.1;
    });

    // Check for exclamation marks
    const exclamationCount = (content.match(/!/g) || []).length;
    intensity += exclamationCount * 0.1;

    // Check for capitalization
    const capsRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (capsRatio > 0.3) intensity += 0.2;

    return Math.max(0, Math.min(1, intensity));
  }

  private getSecondaryEmotions(scores: Map<string, number>, primaryEmotion: string): string[] {
    return Array.from(scores.entries())
      .filter(([emotion, score]) => emotion !== primaryEmotion && score > 0.1)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([emotion]) => emotion);
  }

  private calculateSentiment(content: string): number {
    const positiveWords = ['good', 'great', 'excellent', 'wonderful', 'amazing', 'happy', 'love'];
    const negativeWords = ['bad', 'terrible', 'awful', 'horrible', 'hate', 'sad', 'angry'];

    const positiveCount = positiveWords.filter(w => content.includes(w)).length;
    const negativeCount = negativeWords.filter(w => content.includes(w)).length;

    if (positiveCount + negativeCount === 0) return 0;

    return (positiveCount - negativeCount) / (positiveCount + negativeCount);
  }

  private async trackEmotionalEvolution(
    history: Array<{ content: string; timestamp: Date }>,
    currentEmotion: string,
    currentIntensity: number
  ): Promise<Array<{ timestamp: Date; emotion: string; intensity: number }>> {
    const evolution: Array<{ timestamp: Date; emotion: string; intensity: number }> = [];

    // Analyze last 5 messages
    const recentHistory = history.slice(-5);

    for (const item of recentHistory) {
      const scores = this.calculateEmotionScores(item.content.toLowerCase());
      const emotion = this.getPrimaryEmotion(scores);
      const intensity = this.calculateIntensity(item.content.toLowerCase(), emotion);

      evolution.push({
        timestamp: item.timestamp,
        emotion,
        intensity
      });
    }

    // Add current emotion
    evolution.push({
      timestamp: new Date(),
      emotion: currentEmotion,
      intensity: currentIntensity
    });

    return evolution;
  }
}

// ==================== MAIN ENHANCED MEMORY MANAGER V2 ====================

export class EnhancedMemoryManagerV2 {
  private realtimeProcessor: RealtimeMemoryProcessor;
  private duplicateDetector: IntelligentDuplicateDetector;
  private categoryManager: DynamicCategoryManager;
  private temporalEvolution: TemporalMemoryEvolution;
  private emotionalProcessor: EmotionalContextProcessor;

  constructor() {
    this.realtimeProcessor = new RealtimeMemoryProcessor();
    this.duplicateDetector = new IntelligentDuplicateDetector();
    this.categoryManager = new DynamicCategoryManager();
    this.temporalEvolution = new TemporalMemoryEvolution();
    this.emotionalProcessor = new EmotionalContextProcessor();

    console.log('[EnhancedMemoryManagerV2] Initialized with all 5 phases');
  }

  /**
   * Main entry point for comprehensive memory processing
   */
  async processMemoryComprehensively(
    message: Message,
    userId: string,
    existingMemories: UserMemory[] = [],
    conversationHistory: Array<{ content: string; timestamp: Date }> = []
  ): Promise<EnhancedMemoryResult> {
    const reasoning: string[] = [];

    try {
      // PHASE 1: Real-time importance analysis
      const importanceAnalysis = await this.realtimeProcessor.analyzeImportance(message, userId);
      reasoning.push(`Phase 1 - Importance: ${importanceAnalysis.importance.toFixed(3)} (${importanceAnalysis.action})`);

      if (importanceAnalysis.action === 'skip') {
        return {
          shouldSave: false,
          processedMemory: {
            content: message.content,
            category: 'skipped',
            confidence: 0,
            duplicateStatus: 'new',
            reasoning: [...reasoning, 'Below importance threshold'],
            importance: importanceAnalysis.importance
          }
        };
      }

      // PHASE 2: Intelligent duplicate detection
      const duplicateResult = await this.duplicateDetector.detectDuplicates(message, existingMemories);
      reasoning.push(`Phase 2 - Duplicate: ${duplicateResult.isDuplicate} (confidence: ${duplicateResult.confidence.toFixed(3)})`);

      if (duplicateResult.isDuplicate && duplicateResult.mergeStrategy === 'skip') {
        return {
          shouldSave: false,
          processedMemory: {
            content: message.content,
            category: importanceAnalysis.suggestedCategory || 'general',
            confidence: duplicateResult.confidence,
            duplicateStatus: 'duplicate',
            reasoning: [...reasoning, 'Duplicate detected - skipping'],
            importance: importanceAnalysis.importance
          }
        };
      }

      // PHASE 3: Dynamic categorization
      const categoryResult = await this.categoryManager.categorizeMemory(message, existingMemories, userId);
      reasoning.push(`Phase 3 - Category: ${categoryResult.primary} (${categoryResult.isNewCategory ? 'new' : 'existing'})`);

      // PHASE 4: Temporal memory evolution
      const memoryId = randomUUID();
      const temporalAnalysis = await this.temporalEvolution.trackMemoryEvolution(
        memoryId,
        message.content
      );
      reasoning.push(`Phase 4 - Temporal: decay ${temporalAnalysis.importanceDecay.toFixed(3)}`);

      // PHASE 5: Emotional context processing
      const emotionalContext = await this.emotionalProcessor.analyzeEmotionalContext(
        message,
        conversationHistory
      );
      reasoning.push(`Phase 5 - Emotion: ${emotionalContext.primaryEmotion} (${emotionalContext.emotionIntensity.toFixed(2)})`);

      // Calculate final confidence
      const finalConfidence = this.calculateFinalConfidence(
        importanceAnalysis.importance,
        duplicateResult.confidence,
        categoryResult.confidence,
        emotionalContext.emotionIntensity
      );

      // Determine duplicate status
      let duplicateStatus: 'new' | 'duplicate' | 'merged' | 'updated' = 'new';
      if (duplicateResult.mergeStrategy === 'merge') {
        duplicateStatus = 'merged';
      } else if (duplicateResult.mergeStrategy === 'update') {
        duplicateStatus = 'updated';
      }

      return {
        shouldSave: importanceAnalysis.action === 'save',
        processedMemory: {
          content: message.content,
          category: categoryResult.primary,
          confidence: finalConfidence,
          emotionalContext,
          temporalMemoryId: memoryId,
          duplicateStatus,
          reasoning,
          importance: importanceAnalysis.importance * temporalAnalysis.importanceDecay
        }
      };

    } catch (error) {
      console.error('[EnhancedMemoryManagerV2] Error in processing:', error);
      reasoning.push(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);

      return {
        shouldSave: false,
        processedMemory: {
          content: message.content,
          category: 'error',
          confidence: 0,
          duplicateStatus: 'new',
          reasoning,
          importance: 0
        }
      };
    }
  }

  /**
   * Process deferred messages for a user
   */
  async processDeferredMessages(userId: string): Promise<Message[]> {
    return await this.realtimeProcessor.processDeferredMessages(userId);
  }

  /**
   * Update user sensitivity threshold
   */
  updateUserSensitivity(userId: string, feedback: 'too_sensitive' | 'not_sensitive_enough'): void {
    this.realtimeProcessor.updateUserThreshold(userId, feedback);
  }

  /**
   * Search memories with advanced filtering
   */
  async searchMemories(
    userId: string,
    query: string,
    options: {
      includeEmotional?: boolean;
      categoryFilter?: string[];
      timeRange?: { start: Date; end: Date };
      minImportance?: number;
    } = {}
  ): Promise<UserMemory[]> {
    // This would integrate with vector database in next phase
    console.log('[EnhancedMemoryManagerV2] Advanced search requested:', { userId, query, options });
    return [];
  }

  /**
   * Get system status and statistics
   */
  getSystemStatus(userId: string): {
    phases: {
      realtime: { status: string; threshold: number };
      duplicate: { status: string };
      category: { status: string; categories: number };
      temporal: { status: string };
      emotional: { status: string };
    };
    statistics: {
      totalMemories: number;
      deferredCount: number;
      categoryDistribution: Map<string, number>;
    };
  } {
    return {
      phases: {
        realtime: { status: 'active', threshold: 0.5 },
        duplicate: { status: 'active' },
        category: { status: 'active', categories: 14 },
        temporal: { status: 'active' },
        emotional: { status: 'active' }
      },
      statistics: {
        totalMemories: 0,
        deferredCount: 0,
        categoryDistribution: new Map()
      }
    };
  }

  /**
   * Calculate final confidence score
   */
  private calculateFinalConfidence(
    importance: number,
    duplicateConfidence: number,
    categoryConfidence: number,
    emotionIntensity: number
  ): number {
    // Weighted average with importance having highest weight
    const weights = {
      importance: 0.4,
      uniqueness: 0.3,
      category: 0.2,
      emotion: 0.1
    };

    const uniqueness = 1 - duplicateConfidence;

    return (
      importance * weights.importance +
      uniqueness * weights.uniqueness +
      categoryConfidence * weights.category +
      emotionIntensity * weights.emotion
    );
  }
}

// ==================== TYPE DEFINITIONS ====================

// Message and UserMemory are imported from './types' at the top

interface CategoryMetadata {
  name: string;
  keywords: string[];
  frequency: number;
  lastUsed: Date;
}

interface MemoryVersion {
  timestamp: Date;
  content: string;
  changeType: 'creation' | 'update' | 'merge';
}

interface TemporalRelation {
  relatedMemoryId: string;
  relationType: 'before' | 'after' | 'concurrent' | 'causal';
}

// ==================== SINGLETON EXPORT ====================

let enhancedMemoryManagerV2: EnhancedMemoryManagerV2 | null = null;

export function getEnhancedMemoryManagerV2(): EnhancedMemoryManagerV2 {
  if (!enhancedMemoryManagerV2) {
    enhancedMemoryManagerV2 = new EnhancedMemoryManagerV2();
  }
  return enhancedMemoryManagerV2;
}

export default EnhancedMemoryManagerV2;