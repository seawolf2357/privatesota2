/**
 * Type definitions for AI and Memory systems
 */

// ==================== BASE TYPES ====================

export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  sessionId: string;
  metadata?: Record<string, any>;
}

export interface UserMemory {
  id: string;
  userId: string;
  content: string;
  category: string;
  createdAt: Date;
  updatedAt?: Date;
  confidence?: number;
  sessionId?: string;
  importance?: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  emotionalContext?: EmotionalContext;
  temporalData?: TemporalData;
}

// ==================== MEMORY PROCESSING TYPES ====================

export interface MemoryProcessingResult {
  shouldSave: boolean;
  processedMemory?: ProcessedMemory;
  reasoning?: string[];
  error?: string;
}

export interface ProcessedMemory {
  content: string;
  category: string;
  confidence: number;
  importance: number;
  duplicateStatus: 'new' | 'duplicate' | 'merged' | 'updated';
  emotionalContext?: EmotionalContext;
  temporalMemoryId?: string;
  semanticEmbedding?: number[];
  reasoning: string[];
  metadata?: Record<string, any>;
}

// ==================== IMPORTANCE ANALYSIS TYPES ====================

export interface ImportanceAnalysis {
  importance: number;
  action: 'save' | 'defer' | 'skip';
  suggestedCategory?: string;
  reasoning: string[];
  dimensions: ImportanceDimensions;
}

export interface ImportanceDimensions {
  personalInfo: number;
  preferences: number;
  relationships: number;
  skills: number;
  experiences: number;
  goals: number;
}

// ==================== DUPLICATE DETECTION TYPES ====================

export interface DuplicateDetectionResult {
  isDuplicate: boolean;
  confidence: number;
  similarMemories: SimilarMemory[];
  mergeStrategy?: 'skip' | 'update' | 'merge' | 'versioning';
  reasoning?: string;
}

export interface SimilarMemory {
  memoryId: string;
  similarity: number;
  type: 'exact' | 'semantic' | 'partial';
  content?: string;
}

// ==================== CATEGORY MANAGEMENT TYPES ====================

export interface CategoryResult {
  primary: string;
  secondary: string[];
  confidence: number;
  isNewCategory: boolean;
  reasoning: string;
}

export interface CategoryMetadata {
  name: string;
  keywords: string[];
  patterns?: RegExp[];
  frequency: number;
  lastUsed: Date;
  userCreated?: boolean;
  description?: string;
}

export interface CategoryCluster {
  centroid: string;
  members: string[];
  cohesion: number;
  createdAt: Date;
}

// ==================== TEMPORAL TYPES ====================

export interface TemporalAnalysis {
  versionHistory: MemoryVersion[];
  importanceDecay: number;
  lastAccessed: Date;
  accessFrequency: number;
  temporalRelations: TemporalRelation[];
}

export interface MemoryVersion {
  timestamp: Date;
  content: string;
  changeType: 'creation' | 'update' | 'merge' | 'deletion';
  author?: string;
  confidence?: number;
}

export interface TemporalRelation {
  relatedMemoryId: string;
  relationType: 'before' | 'after' | 'concurrent' | 'causal' | 'derived';
  confidence: number;
}

export interface TemporalData {
  createdAt: Date;
  lastModified: Date;
  accessCount: number;
  decayFactor: number;
  lifespan?: number; // in days
}

// ==================== EMOTIONAL CONTEXT TYPES ====================

export interface EmotionalContext {
  primaryEmotion: string;
  emotionIntensity: number;
  secondaryEmotions: string[];
  sentimentScore: number;
  emotionalEvolution: EmotionalEvolution[];
  arousal?: number;
  valence?: number;
}

export interface EmotionalEvolution {
  timestamp: Date;
  emotion: string;
  intensity: number;
  trigger?: string;
}

export interface EmotionAnalysis {
  emotions: Map<string, number>;
  dominant: string;
  intensity: number;
  sentiment: 'positive' | 'negative' | 'neutral' | 'mixed';
  confidence: number;
}

// ==================== VECTOR DATABASE TYPES ====================

export interface VectorSearchQuery {
  query: string;
  embedding?: number[];
  topK?: number;
  threshold?: number;
  filters?: SearchFilters;
  includeMetadata?: boolean;
}

export interface VectorSearchResult {
  id: string;
  content: string;
  score: number;
  embedding?: number[];
  metadata?: Record<string, any>;
  category?: string;
}

export interface SearchFilters {
  userId?: string;
  categories?: string[];
  timeRange?: TimeRange;
  minImportance?: number;
  emotionFilter?: string[];
  excludeIds?: string[];
}

export interface TimeRange {
  start: Date;
  end: Date;
}

// ==================== EMBEDDING TYPES ====================

export interface EmbeddingRequest {
  text: string;
  model?: string;
  dimension?: number;
  normalize?: boolean;
}

export interface EmbeddingResponse {
  embedding: number[];
  model: string;
  dimension: number;
  tokensUsed?: number;
}

export interface BatchEmbeddingRequest {
  texts: string[];
  model?: string;
  dimension?: number;
  normalize?: boolean;
}

export interface BatchEmbeddingResponse {
  embeddings: number[][];
  model: string;
  dimension: number;
  totalTokensUsed?: number;
}

// ==================== SEARCH ENGINE TYPES ====================

export interface HybridSearchRequest {
  query: string;
  searchType?: 'semantic' | 'keyword' | 'hybrid';
  limit?: number;
  userId: string;
  filters?: SearchFilters;
  weights?: {
    semantic: number;
    keyword: number;
    temporal: number;
  };
}

export interface HybridSearchResult {
  memories: UserMemory[];
  scores: Map<string, number>;
  searchMetadata: {
    queryTime: number;
    resultCount: number;
    searchType: string;
    confidence: number;
  };
}

// ==================== API TYPES ====================

export interface MemoryExtractionRequest {
  messages: Message[];
  userId: string;
  sessionId: string;
  options?: {
    realtime?: boolean;
    includeDuplicates?: boolean;
    minImportance?: number;
  };
}

export interface MemoryExtractionResponse {
  extractedMemories: ProcessedMemory[];
  statistics: {
    processed: number;
    saved: number;
    duplicates: number;
    deferred: number;
  };
  processingTime: number;
}

export interface MemoryFeedback {
  memoryId: string;
  userId: string;
  type: 'sensitivity' | 'category' | 'duplicate' | 'emotion' | 'relevance';
  value: string;
  context?: any;
  timestamp: Date;
}

export interface MemoryClusterRequest {
  userId: string;
  algorithm?: 'kmeans' | 'dbscan' | 'hierarchical';
  numClusters?: number;
  minClusterSize?: number;
}

export interface MemoryClusterResponse {
  clusters: MemoryCluster[];
  unclustered: string[];
  metadata: {
    algorithm: string;
    parameters: Record<string, any>;
    quality: number;
  };
}

export interface MemoryCluster {
  id: string;
  name: string;
  memories: UserMemory[];
  centroid?: number[];
  keywords: string[];
  summary?: string;
  createdAt: Date;
}

// ==================== SYSTEM STATUS TYPES ====================

export interface SystemStatus {
  phases: {
    realtime: PhaseStatus;
    duplicate: PhaseStatus;
    category: PhaseStatus;
    temporal: PhaseStatus;
    emotional: PhaseStatus;
    vector: PhaseStatus;
    search: PhaseStatus;
  };
  statistics: SystemStatistics;
  health: SystemHealth;
}

export interface PhaseStatus {
  status: 'active' | 'inactive' | 'error' | 'initializing';
  message?: string;
  lastUpdate?: Date;
  metrics?: Record<string, any>;
}

export interface SystemStatistics {
  totalMemories: number;
  totalUsers: number;
  deferredCount: number;
  categoryDistribution: Map<string, number>;
  averageImportance: number;
  averageConfidence: number;
  processingRate: number; // memories per second
  errorRate: number;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  memoryUsage: number;
  cpuUsage: number;
  lastError?: {
    message: string;
    timestamp: Date;
    component: string;
  };
}

// ==================== CONFIGURATION TYPES ====================

export interface MemorySystemConfig {
  importance: {
    defaultThreshold: number;
    learningRate: number;
    dimensionWeights: ImportanceDimensions;
  };
  duplicate: {
    similarityThreshold: number;
    mergeThreshold: number;
    algorithms: string[];
  };
  category: {
    defaultCategories: string[];
    maxUserCategories: number;
    autoCreateThreshold: number;
  };
  temporal: {
    decayRate: number;
    versionLimit: number;
    relationshipWindow: number; // in days
  };
  emotional: {
    emotions: string[];
    intensityThreshold: number;
    evolutionWindow: number; // in messages
  };
  vector: {
    dimension: number;
    model: string;
    indexType: string;
    provider: 'chromadb' | 'pgvector' | 'pinecone';
  };
  search: {
    defaultLimit: number;
    minScore: number;
    hybridWeights: {
      semantic: number;
      keyword: number;
      temporal: number;
    };
  };
}

// ==================== ERROR TYPES ====================

export class MemorySystemError extends Error {
  constructor(
    message: string,
    public code: string,
    public component: string,
    public details?: any
  ) {
    super(message);
    this.name = 'MemorySystemError';
  }
}

export class VectorDatabaseError extends Error {
  constructor(
    message: string,
    public provider: string,
    public operation: string,
    public details?: any
  ) {
    super(message);
    this.name = 'VectorDatabaseError';
  }
}

// ==================== UTILITY TYPES ====================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type AsyncFunction<T = any, R = any> = (arg: T) => Promise<R>;

export type Callback<T = any> = (error: Error | null, result?: T) => void;

export interface CacheEntry<T> {
  value: T;
  timestamp: Date;
  ttl: number;
  hits: number;
}

export interface Logger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
}

// ==================== ENUMS ====================

export enum MemoryPriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

export enum ProcessingMode {
  REALTIME = 'realtime',
  BATCH = 'batch',
  DEFERRED = 'deferred'
}

export enum EmotionType {
  JOY = 'joy',
  SADNESS = 'sadness',
  ANGER = 'anger',
  FEAR = 'fear',
  SURPRISE = 'surprise',
  DISGUST = 'disgust',
  TRUST = 'trust',
  ANTICIPATION = 'anticipation'
}

export enum CategoryType {
  SYSTEM = 'system',
  USER = 'user',
  AUTO = 'auto',
  SUGGESTED = 'suggested'
}