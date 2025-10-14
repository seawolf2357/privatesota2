import { ChromaClient } from 'chromadb';
import OpenAI from 'openai';
import { UserMemory } from '../db/schema';

export interface VectorSearchResult {
  id: string;
  content: string;
  category: string;
  similarity: number;
  metadata?: any;
}

export class VectorMemoryManager {
  private chroma: ChromaClient | null = null;
  private openai: OpenAI;
  private collectionName = 'user_memories';
  private collection: any = null;
  private isChromaAvailable = false;

  constructor(openaiApiKey?: string) {
    // Try to initialize ChromaDB client (optional)
    try {
      this.chroma = new ChromaClient({
        path: process.env.CHROMA_URL || 'http://localhost:8000'
      });
      this.isChromaAvailable = true;
      console.log('[VectorMemory] ChromaDB client initialized');
    } catch (error) {
      console.log('[VectorMemory] ChromaDB not available, vector search disabled');
      this.chroma = null;
    }

    // Initialize OpenAI for embeddings
    this.openai = new OpenAI({
      apiKey: openaiApiKey || process.env.OPENAI_API_KEY || ''
    });
  }

  // Initialize or get collection
  async initializeCollection(userId: string) {
    if (!this.chroma || !this.isChromaAvailable) {
      console.log('[VectorMemory] ChromaDB not available, skipping collection initialization');
      return null;
    }

    try {
      const collectionName = `memories_${userId.replace(/-/g, '_')}`;

      // Try to get existing collection
      try {
        this.collection = await (this.chroma as any).getCollection({
          name: collectionName
        });
      } catch (error) {
        // Create new collection if it doesn't exist
        this.collection = await (this.chroma as any).createCollection({
          name: collectionName,
          metadata: { userId }
        });
      }

      return this.collection;
    } catch (error) {
      console.log('[VectorMemory] ChromaDB connection failed, disabling vector search');
      this.isChromaAvailable = false;
      this.chroma = null;
      return null;
    }
  }

  // Generate embeddings using OpenAI
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const response = await this.openai.embeddings.create({
        model: 'text-embedding-3-small',
        input: text
      });

      return response.data[0].embedding;
    } catch (error) {
      console.error('[VectorMemory] Error generating embedding:', error);

      // Fallback to simple hash-based pseudo-embedding if OpenAI fails
      return this.generateFallbackEmbedding(text);
    }
  }

  // Simple fallback embedding (for testing without OpenAI)
  private generateFallbackEmbedding(text: string): number[] {
    const embedding = new Array(1536).fill(0);

    // Simple hash-based embedding
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i);
      const index = (charCode * 7 + i * 13) % 1536;
      embedding[index] = Math.sin(charCode * i) * 0.5 + 0.5;
    }

    // Normalize
    const magnitude = Math.sqrt(embedding.reduce((sum, val) => sum + val * val, 0));
    return embedding.map(val => val / magnitude);
  }

  // Add memory to vector database
  async addMemory(memory: UserMemory, userId: string): Promise<void> {
    if (!this.isChromaAvailable) {
      return; // Silently skip if ChromaDB not available
    }

    try {
      if (!this.collection) {
        await this.initializeCollection(userId);
      }

      if (!this.collection) {
        return; // Collection initialization failed
      }

      const embedding = await this.generateEmbedding(memory.content);

      await this.collection.add({
        ids: [memory.id],
        embeddings: [embedding],
        metadatas: [{
          category: memory.category,
          confidence: memory.confidence,
          createdAt: memory.createdAt.toISOString(),
          updatedAt: memory.updatedAt.toISOString(),
          ...memory.metadata
        }],
        documents: [memory.content]
      });

      console.log(`[VectorMemory] Added memory ${memory.id} to vector DB`);
    } catch (error) {
      console.log('[VectorMemory] Skipping vector storage (ChromaDB unavailable)');
    }
  }

  // Batch add memories
  async addMemories(memories: UserMemory[], userId: string): Promise<void> {
    try {
      if (!this.collection) {
        await this.initializeCollection(userId);
      }

      if (memories.length === 0) return;

      // Generate embeddings for all memories
      const embeddings = await Promise.all(
        memories.map(m => this.generateEmbedding(m.content))
      );

      // Prepare batch data
      const ids = memories.map(m => m.id);
      const documents = memories.map(m => m.content);
      const metadatas = memories.map(m => ({
        category: m.category,
        confidence: m.confidence,
        createdAt: m.createdAt.toISOString(),
        updatedAt: m.updatedAt.toISOString(),
        ...m.metadata
      }));

      await this.collection.add({
        ids,
        embeddings,
        metadatas,
        documents
      });

      console.log(`[VectorMemory] Added ${memories.length} memories to vector DB`);
    } catch (error) {
      console.error('[VectorMemory] Error batch adding memories:', error);
    }
  }

  // Search similar memories
  async searchSimilarMemories(
    query: string,
    userId: string,
    limit: number = 5,
    minSimilarity: number = 0.7
  ): Promise<VectorSearchResult[]> {
    if (!this.isChromaAvailable) {
      return []; // Return empty array if ChromaDB not available
    }

    try {
      if (!this.collection) {
        await this.initializeCollection(userId);
      }

      if (!this.collection) {
        return []; // Collection initialization failed
      }

      const queryEmbedding = await this.generateEmbedding(query);

      const results = await this.collection.query({
        queryEmbeddings: [queryEmbedding],
        nResults: limit
      });

      if (!results.documents || results.documents.length === 0) {
        return [];
      }

      // Format results
      const formattedResults: VectorSearchResult[] = [];

      for (let i = 0; i < results.ids[0].length; i++) {
        const similarity = results.distances ? 1 - results.distances[0][i] : 0;

        if (similarity >= minSimilarity) {
          formattedResults.push({
            id: results.ids[0][i],
            content: results.documents[0][i] || '',
            category: results.metadatas[0][i]?.category || 'general',
            similarity,
            metadata: results.metadatas[0][i]
          });
        }
      }

      return formattedResults.sort((a, b) => b.similarity - a.similarity);
    } catch (error) {
      console.log('[VectorMemory] Search skipped (ChromaDB unavailable)');
      return [];
    }
  }

  // Update memory in vector database
  async updateMemory(memory: UserMemory, userId: string): Promise<void> {
    try {
      if (!this.collection) {
        await this.initializeCollection(userId);
      }

      // Delete old version
      await this.collection.delete({
        ids: [memory.id]
      });

      // Add updated version
      await this.addMemory(memory, userId);

      console.log(`[VectorMemory] Updated memory ${memory.id} in vector DB`);
    } catch (error) {
      console.error('[VectorMemory] Error updating memory:', error);
    }
  }

  // Delete memory from vector database
  async deleteMemory(memoryId: string, userId: string): Promise<void> {
    try {
      if (!this.collection) {
        await this.initializeCollection(userId);
      }

      await this.collection.delete({
        ids: [memoryId]
      });

      console.log(`[VectorMemory] Deleted memory ${memoryId} from vector DB`);
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
}

// Singleton instance
let vectorMemoryManager: VectorMemoryManager | null = null;

export function getVectorMemoryManager(openaiApiKey?: string): VectorMemoryManager {
  if (!vectorMemoryManager) {
    vectorMemoryManager = new VectorMemoryManager(openaiApiKey);
  }
  return vectorMemoryManager;
}