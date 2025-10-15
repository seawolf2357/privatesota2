import { pipeline, Pipeline } from '@xenova/transformers';
import { db } from '@/lib/db';
import { userMemory } from '@/lib/db/schema';
import { eq, sql } from 'drizzle-orm';
import type { UserMemory } from '@/lib/db/schema';
import crypto from 'crypto';

export interface VectorSearchResult {
  id: string;
  content: string;
  category: string;
  similarity: number;
  metadata?: any;
}

export class VectorMemoryManager {
  private embeddingPipeline: Pipeline | null = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private embeddingCache: Map<string, number[]> = new Map();
  private readonly CACHE_SIZE = 10000;
  private readonly EMBEDDING_DIM = 384;

  constructor() {
    // Initialize model lazily
    this.initPromise = this.initializeModel();
  }

  // Initialize the embedding model
  private async initializeModel(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('[VectorMemory] Loading local embedding model...');

      // Use the same model as Discord bot
      // paraphrase-multilingual-MiniLM-L12-v2 (384 dimensions, multilingual)
      this.embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/paraphrase-multilingual-MiniLM-L12-v2',
        {
          revision: 'main',
          quantized: true, // Use quantized version for smaller size
        }
      );

      this.isInitialized = true;
      console.log('[VectorMemory] Local embedding model loaded successfully');
    } catch (error) {
      console.error('[VectorMemory] Error loading embedding model:', error);
      console.log('[VectorMemory] Will use fallback hash-based embeddings');
      this.embeddingPipeline = null;
      this.isInitialized = true;
    }
  }

  // Generate embeddings using local model
  async generateEmbedding(text: string): Promise<number[]> {
    // Ensure model is initialized
    if (!this.isInitialized && this.initPromise) {
      await this.initPromise;
    }

    // Check cache first
    if (this.embeddingCache.has(text)) {
      return this.embeddingCache.get(text)!;
    }

    let embedding: number[];

    if (this.embeddingPipeline) {
      try {
        // Generate embedding using Transformers.js
        const output = await this.embeddingPipeline(text, {
          pooling: 'mean',
          normalize: true,
        });

        // Convert to array
        embedding = Array.from(output.data);

        console.log(`[VectorMemory] Generated embedding (${embedding.length}D) for text: "${text.substring(0, 50)}..."`);
      } catch (error) {
        console.error('[VectorMemory] Error generating embedding, using fallback:', error);
        embedding = this.generateFallbackEmbedding(text);
      }
    } else {
      // Use fallback hash-based embedding
      embedding = this.generateFallbackEmbedding(text);
    }

    // Cache the embedding
    if (this.embeddingCache.size < this.CACHE_SIZE) {
      this.embeddingCache.set(text, embedding);
    }

    return embedding;
  }

  // Fallback hash-based embedding (same as Discord bot)
  private generateFallbackEmbedding(text: string): number[] {
    const hash = crypto.createHash('sha256').update(text).digest();
    const embedding: number[] = [];

    for (let i = 0; i < Math.min(hash.length, this.EMBEDDING_DIM); i++) {
      embedding.push((hash[i] - 128) / 128.0);
    }

    // Pad to correct dimension
    while (embedding.length < this.EMBEDDING_DIM) {
      embedding.push(0.0);
    }

    return embedding.slice(0, this.EMBEDDING_DIM);
  }

  // Add memory to vector database
  async addMemory(memory: UserMemory, userId: string): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(memory.content);

      // Update the memory with embedding using raw SQL for vector type
      await db.execute(sql`
        UPDATE "UserMemory"
        SET embedding = ${JSON.stringify(embedding)}::vector
        WHERE id = ${memory.id}
      `);

      console.log(`[VectorMemory] Added embedding for memory ${memory.id}`);
    } catch (error) {
      console.error('[VectorMemory] Error adding memory embedding:', error);
    }
  }

  // Batch add embeddings for existing memories
  async addMemories(memories: UserMemory[], userId: string): Promise<void> {
    try {
      console.log(`[VectorMemory] Generating embeddings for ${memories.length} memories...`);

      for (const memory of memories) {
        await this.addMemory(memory, userId);
      }

      console.log(`[VectorMemory] Added embeddings for ${memories.length} memories`);
    } catch (error) {
      console.error('[VectorMemory] Error batch adding memories:', error);
    }
  }

  // Search similar memories using pgvector cosine similarity
  async searchSimilarMemories(
    query: string,
    userId: string,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<VectorSearchResult[]> {
    try {
      const queryEmbedding = await this.generateEmbedding(query);

      // Use pgvector's cosine distance operator (<=>)
      // Cosine similarity = 1 - cosine distance
      const results = await db.execute(sql`
        SELECT
          id,
          content,
          category,
          metadata,
          1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) as similarity
        FROM "UserMemory"
        WHERE
          "userId" = ${userId}
          AND embedding IS NOT NULL
          AND 1 - (embedding <=> ${JSON.stringify(queryEmbedding)}::vector) >= ${minSimilarity}
        ORDER BY embedding <=> ${JSON.stringify(queryEmbedding)}::vector
        LIMIT ${limit}
      `) as any[];

      const formattedResults: VectorSearchResult[] = results.map((row: any) => ({
        id: row.id,
        content: row.content,
        category: row.category,
        similarity: parseFloat(row.similarity),
        metadata: row.metadata,
      }));

      console.log(`[VectorMemory] Found ${formattedResults.length} similar memories (min similarity: ${minSimilarity})`);

      return formattedResults;
    } catch (error) {
      console.error('[VectorMemory] Error searching similar memories:', error);
      return [];
    }
  }

  // Update memory embedding in database
  async updateMemory(memory: UserMemory, userId: string): Promise<void> {
    try {
      const embedding = await this.generateEmbedding(memory.content);

      await db.execute(sql`
        UPDATE "UserMemory"
        SET embedding = ${JSON.stringify(embedding)}::vector
        WHERE id = ${memory.id}
      `);

      console.log(`[VectorMemory] Updated embedding for memory ${memory.id}`);
    } catch (error) {
      console.error('[VectorMemory] Error updating memory embedding:', error);
    }
  }

  // Delete memory (no need to delete embedding separately, CASCADE will handle it)
  async deleteMemory(memoryId: string, userId: string): Promise<void> {
    try {
      await db.delete(userMemory).where(eq(userMemory.id, memoryId));
      console.log(`[VectorMemory] Deleted memory ${memoryId}`);
    } catch (error) {
      console.error('[VectorMemory] Error deleting memory:', error);
    }
  }

  // Get related memories for context
  async getRelatedMemories(
    query: string,
    userId: string,
    limit: number = 3
  ): Promise<string> {
    const relatedMemories = await this.searchSimilarMemories(query, userId, limit, 0.6);

    if (relatedMemories.length === 0) {
      return '';
    }

    let context = '\n\n🔍 관련 기억들:\n';
    for (const memory of relatedMemories) {
      context += `• [${memory.category.toUpperCase()}] ${memory.content} (유사도: ${(memory.similarity * 100).toFixed(0)}%)\n`;
    }

    return context;
  }

  // Backfill embeddings for existing memories without embeddings
  async backfillEmbeddings(userId: string): Promise<number> {
    try {
      // Find memories without embeddings
      const memoriesWithoutEmbeddings = await db.execute(sql`
        SELECT id, content, category
        FROM "UserMemory"
        WHERE "userId" = ${userId}
        AND embedding IS NULL
      `) as any[];

      const count = memoriesWithoutEmbeddings.length;

      if (count === 0) {
        console.log('[VectorMemory] No memories need backfilling');
        return 0;
      }

      console.log(`[VectorMemory] Backfilling embeddings for ${count} memories...`);

      for (const row of memoriesWithoutEmbeddings) {
        const embedding = await this.generateEmbedding(row.content as string);

        await db.execute(sql`
          UPDATE "UserMemory"
          SET embedding = ${JSON.stringify(embedding)}::vector
          WHERE id = ${row.id}
        `);
      }

      console.log(`[VectorMemory] Backfilled ${count} embeddings`);
      return count;
    } catch (error) {
      console.error('[VectorMemory] Error backfilling embeddings:', error);
      return 0;
    }
  }

  // Check if vector search is available
  isVectorSearchAvailable(): boolean {
    return this.isInitialized;
  }

  // Clear embedding cache
  clearCache(): void {
    this.embeddingCache.clear();
    console.log('[VectorMemory] Embedding cache cleared');
  }
}

// Singleton instance
let vectorMemoryManager: VectorMemoryManager | null = null;

export function getVectorMemoryManager(): VectorMemoryManager {
  if (!vectorMemoryManager) {
    vectorMemoryManager = new VectorMemoryManager();
  }
  return vectorMemoryManager;
}
