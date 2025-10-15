/* eslint-disable import/no-unresolved */
/**
 * ChromaDB Manager - Vector database integration for memory storage
 * Note: ChromaDB requires a running ChromaDB server
 * DEPRECATED: Use vector-memory-manager.ts with pgvector instead
 */

import {
  VectorSearchQuery,
  VectorSearchResult,
  UserMemory,
  EmbeddingResponse,
  VectorDatabaseError,
  SearchFilters
} from './types';

interface ChromaDBConfig {
  host?: string;
  port?: number;
  ssl?: boolean;
  apiKey?: string;
  tenant?: string;
  database?: string;
}

interface ChromaDocument {
  id: string;
  embedding?: number[];
  metadata?: Record<string, any>;
  document?: string;
}

interface ChromaQueryResult {
  ids: string[][];
  embeddings?: number[][][];
  documents?: string[][];
  metadatas?: Record<string, any>[][];
  distances?: number[][];
}

export class ChromaDBManager {
  private client: any;
  private collection: any;
  private collectionName: string;
  private isInitialized: boolean = false;

  constructor(
    collectionName: string = 'user_memories',
    config?: ChromaDBConfig
  ) {
    this.collectionName = collectionName;
    this.initializeClient(config);
  }

  /**
   * Initialize ChromaDB client
   */
  private async initializeClient(config?: ChromaDBConfig): Promise<void> {
    try {
      // Dynamic import to avoid issues if ChromaDB is not installed
      const { ChromaClient } = await import('chromadb');

      const defaultConfig = {
        path: config?.host || 'http://localhost:8000',
        ...config
      };

      this.client = new ChromaClient(defaultConfig);
      console.log('[ChromaDBManager] Client initialized');
    } catch (error) {
      console.error('[ChromaDBManager] Failed to initialize client:', error);
      // Fallback to mock implementation for development
      this.client = this.createMockClient();
    }
  }

  /**
   * Create mock client for development/testing
   */
  private createMockClient(): any {
    console.log('[ChromaDBManager] Using mock client for development');
    const mockData = new Map<string, ChromaDocument>();

    return {
      getOrCreateCollection: async (params: any) => {
        return {
          name: params.name,
          add: async (params: any) => {
            const { ids, embeddings, metadatas, documents } = params;
            for (let i = 0; i < ids.length; i++) {
              mockData.set(ids[i], {
                id: ids[i],
                embedding: embeddings?.[i],
                metadata: metadatas?.[i],
                document: documents?.[i]
              });
            }
            return { added: ids.length };
          },
          update: async (params: any) => {
            const { ids, embeddings, metadatas, documents } = params;
            for (let i = 0; i < ids.length; i++) {
              const existing = mockData.get(ids[i]) || { id: ids[i] };
              mockData.set(ids[i], {
                ...existing,
                ...(embeddings?.[i] && { embedding: embeddings[i] }),
                ...(metadatas?.[i] && { metadata: metadatas[i] }),
                ...(documents?.[i] && { document: documents[i] })
              });
            }
            return { updated: ids.length };
          },
          query: async (params: any) => {
            const { queryEmbeddings, nResults = 10, where } = params;

            // Simple mock search - return random results
            const results = Array.from(mockData.values())
              .filter(doc => {
                if (!where) return true;
                // Simple metadata filtering
                return Object.entries(where).every(([key, value]) =>
                  doc.metadata?.[key] === value
                );
              })
              .slice(0, nResults);

            return {
              ids: [results.map(r => r.id)],
              embeddings: [results.map(r => r.embedding || [])],
              documents: [results.map(r => r.document || '')],
              metadatas: [results.map(r => r.metadata || {})],
              distances: [results.map(() => Math.random())]
            };
          },
          delete: async (params: any) => {
            const { ids } = params;
            ids.forEach((id: string) => mockData.delete(id));
            return { deleted: ids.length };
          },
          get: async (params: any) => {
            const { ids } = params;
            const results = ids.map((id: string) => mockData.get(id)).filter(Boolean) as ChromaDocument[];
            return {
              ids: [results.map((r: ChromaDocument) => r.id)],
              embeddings: [results.map((r: ChromaDocument) => r.embedding || [])],
              documents: [results.map((r: ChromaDocument) => r.document || '')],
              metadatas: [results.map((r: ChromaDocument) => r.metadata || {})]
            };
          },
          count: async () => mockData.size
        };
      },
      deleteCollection: async (name: string) => {
        console.log(`[Mock] Deleted collection: ${name}`);
      },
      listCollections: async () => {
        return [{ name: this.collectionName }];
      }
    };
  }

  /**
   * Initialize or get existing collection
   */
  async initializeCollection(): Promise<void> {
    if (this.isInitialized) return;

    try {
      this.collection = await this.client.getOrCreateCollection({
        name: this.collectionName,
        metadata: {
          description: 'User memory storage with semantic search',
          created_at: new Date().toISOString()
        }
      });

      this.isInitialized = true;
      console.log(`[ChromaDBManager] Collection '${this.collectionName}' initialized`);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to initialize collection',
        'chromadb',
        'initializeCollection',
        error
      );
    }
  }

  /**
   * Add memories to the vector database
   */
  async addMemories(
    memories: UserMemory[],
    embeddings: number[][]
  ): Promise<void> {
    await this.initializeCollection();

    if (memories.length === 0) return;

    try {
      const ids = memories.map(m => m.id);
      const documents = memories.map(m => m.content);
      const metadatas = memories.map(m => ({
        userId: m.userId,
        category: m.category,
        confidence: m.confidence || 0,
        importance: m.importance || 0,
        createdAt: m.createdAt.toISOString(),
        sessionId: m.sessionId || '',
        ...(m.metadata || {})
      }));

      await this.collection.add({
        ids,
        embeddings,
        documents,
        metadatas
      });

      console.log(`[ChromaDBManager] Added ${memories.length} memories`);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to add memories',
        'chromadb',
        'addMemories',
        error
      );
    }
  }

  /**
   * Update existing memories
   */
  async updateMemories(
    memories: UserMemory[],
    embeddings?: number[][]
  ): Promise<void> {
    await this.initializeCollection();

    if (memories.length === 0) return;

    try {
      const ids = memories.map(m => m.id);
      const documents = memories.map(m => m.content);
      const metadatas = memories.map(m => ({
        userId: m.userId,
        category: m.category,
        confidence: m.confidence || 0,
        importance: m.importance || 0,
        updatedAt: new Date().toISOString(),
        sessionId: m.sessionId || '',
        ...(m.metadata || {})
      }));

      const updateParams: any = {
        ids,
        documents,
        metadatas
      };

      if (embeddings && embeddings.length > 0) {
        updateParams.embeddings = embeddings;
      }

      await this.collection.update(updateParams);

      console.log(`[ChromaDBManager] Updated ${memories.length} memories`);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to update memories',
        'chromadb',
        'updateMemories',
        error
      );
    }
  }

  /**
   * Search memories using vector similarity
   */
  async searchMemories(
    query: VectorSearchQuery
  ): Promise<VectorSearchResult[]> {
    await this.initializeCollection();

    try {
      const { embedding, topK = 10, threshold = 0.0, filters } = query;

      if (!embedding || embedding.length === 0) {
        throw new Error('Embedding is required for search');
      }

      // Build where clause for filtering
      const whereClause = this.buildWhereClause(filters);

      const results: ChromaQueryResult = await this.collection.query({
        queryEmbeddings: [embedding],
        nResults: topK,
        where: whereClause
      });

      // Process and filter results
      const searchResults: VectorSearchResult[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const distance = results.distances?.[0]?.[i] || 0;
          const similarity = 1 - distance; // Convert distance to similarity

          if (similarity >= threshold) {
            searchResults.push({
              id: results.ids[0][i],
              content: results.documents?.[0]?.[i] || '',
              score: similarity,
              embedding: results.embeddings?.[0]?.[i],
              metadata: results.metadatas?.[0]?.[i],
              category: results.metadatas?.[0]?.[i]?.category
            });
          }
        }
      }

      return searchResults.sort((a, b) => b.score - a.score);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to search memories',
        'chromadb',
        'searchMemories',
        error
      );
    }
  }

  /**
   * Get memories by IDs
   */
  async getMemoriesByIds(ids: string[]): Promise<UserMemory[]> {
    await this.initializeCollection();

    if (ids.length === 0) return [];

    try {
      const results = await this.collection.get({
        ids
      });

      const memories: UserMemory[] = [];

      if (results.ids && results.ids[0]) {
        for (let i = 0; i < results.ids[0].length; i++) {
          const metadata = results.metadatas?.[0]?.[i] || {};

          memories.push({
            id: results.ids[0][i],
            userId: metadata.userId || '',
            content: results.documents?.[0]?.[i] || '',
            category: metadata.category || 'general',
            createdAt: new Date(metadata.createdAt || Date.now()),
            updatedAt: metadata.updatedAt ? new Date(metadata.updatedAt) : undefined,
            confidence: metadata.confidence || 0,
            importance: metadata.importance || 0,
            sessionId: metadata.sessionId,
            embedding: results.embeddings?.[0]?.[i],
            metadata: metadata
          });
        }
      }

      return memories;
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to get memories by IDs',
        'chromadb',
        'getMemoriesByIds',
        error
      );
    }
  }

  /**
   * Delete memories by IDs
   */
  async deleteMemories(ids: string[]): Promise<void> {
    await this.initializeCollection();

    if (ids.length === 0) return;

    try {
      await this.collection.delete({
        ids
      });

      console.log(`[ChromaDBManager] Deleted ${ids.length} memories`);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to delete memories',
        'chromadb',
        'deleteMemories',
        error
      );
    }
  }

  /**
   * Delete memories by user ID
   */
  async deleteUserMemories(userId: string): Promise<void> {
    await this.initializeCollection();

    try {
      await this.collection.delete({
        where: { userId }
      });

      console.log(`[ChromaDBManager] Deleted memories for user: ${userId}`);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to delete user memories',
        'chromadb',
        'deleteUserMemories',
        error
      );
    }
  }

  /**
   * Get collection statistics
   */
  async getStatistics(): Promise<{
    totalMemories: number;
    collections: string[];
  }> {
    try {
      await this.initializeCollection();

      const count = await this.collection.count();
      const collections = await this.client.listCollections();

      return {
        totalMemories: count,
        collections: collections.map((c: any) => c.name)
      };
    } catch (error) {
      console.error('[ChromaDBManager] Failed to get statistics:', error);
      return {
        totalMemories: 0,
        collections: []
      };
    }
  }

  /**
   * Build where clause for ChromaDB filtering
   */
  private buildWhereClause(filters?: SearchFilters): Record<string, any> | undefined {
    if (!filters) return undefined;

    const where: Record<string, any> = {};

    if (filters.userId) {
      where.userId = filters.userId;
    }

    if (filters.categories && filters.categories.length > 0) {
      where.category = { $in: filters.categories };
    }

    if (filters.minImportance !== undefined) {
      where.importance = { $gte: filters.minImportance };
    }

    if (filters.timeRange) {
      where.createdAt = {
        $gte: filters.timeRange.start.toISOString(),
        $lte: filters.timeRange.end.toISOString()
      };
    }

    return Object.keys(where).length > 0 ? where : undefined;
  }

  /**
   * Clear all data (use with caution)
   */
  async clearCollection(): Promise<void> {
    try {
      await this.client.deleteCollection(this.collectionName);
      this.isInitialized = false;
      this.collection = null;
      console.log(`[ChromaDBManager] Collection '${this.collectionName}' cleared`);
    } catch (error) {
      throw new VectorDatabaseError(
        'Failed to clear collection',
        'chromadb',
        'clearCollection',
        error
      );
    }
  }

  /**
   * Check if ChromaDB server is available
   */
  async healthCheck(): Promise<boolean> {
    try {
      const collections = await this.client.listCollections();
      return Array.isArray(collections);
    } catch (error) {
      console.error('[ChromaDBManager] Health check failed:', error);
      return false;
    }
  }
}

// Singleton instance
let chromaDBManager: ChromaDBManager | null = null;

export function getChromaDBManager(
  collectionName?: string,
  config?: ChromaDBConfig
): ChromaDBManager {
  if (!chromaDBManager) {
    chromaDBManager = new ChromaDBManager(collectionName, config);
  }
  return chromaDBManager;
}

export default ChromaDBManager;