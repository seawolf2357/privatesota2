// Memory Management System
// Adapted from AGI Space app-backup.py

import { db } from '@/lib/db';
import { userMemory, chat, message, type UserMemory } from '@/lib/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { myFriendliProvider } from './providers-friendli';

export type MemoryCategory = 
  | 'personal_info' 
  | 'preferences' 
  | 'important_dates' 
  | 'tasks' 
  | 'notes' 
  | 'general';

export interface ExtractedMemory {
  category: MemoryCategory;
  content: string;
  confidence: number;
}

export class MemoryManager {
  private userId: string;

  constructor(userId: string) {
    this.userId = userId;
  }

  // Extract memories from a conversation using AI
  async extractMemoriesFromConversation(chatId: string): Promise<ExtractedMemory[]> {
    try {
      // Get all messages from the chat
      const messages = await db
        .select()
        .from(message)
        .where(eq(message.chatId, chatId))
        .orderBy(message.createdAt);

      if (messages.length < 2) {
        console.log('[MemoryManager] Not enough messages to extract memories');
        return [];
      }

      // Build conversation text
      const conversationText = messages
        .map(msg => {
          const role = msg.role === 'user' ? '사용자' : 'AI';
          const content = typeof msg.parts === 'string' 
            ? msg.parts 
            : JSON.stringify(msg.parts);
          return `${role}: ${content}`;
        })
        .join('\n');

      // Use AI to extract memories
      const extractionPrompt = `You are a memory extraction system. Extract personal information from conversations.
      
IMPORTANT: Extract ONLY factual information that the user explicitly states or requests to remember.
Focus on:
- Information the user asks to remember (e.g., "기억해줘", "remember this")
- Important dates, deadlines, or appointments mentioned
- Personal facts the user shares
- Tasks or todos the user mentions

Categories to use:
- personal_info: 이름, 나이, 직업, 거주지 등
- preferences: 좋아하는 것, 싫어하는 것
- important_dates: 날짜, 마감일, 일정
- tasks: 할 일, 신청해야 할 것
- notes: 기타 중요한 정보

Return as JSON array. Example:
[
  {
    "category": "important_dates",
    "content": "프로그램 신청 마감일: 2025년 1월 15일",
    "confidence": 0.9
  }
]

Be specific and include context. Extract ALL important information.

대화 내용:
${conversationText}`;

      const response = await myFriendliProvider.languageModel('chat-model').doGenerate({
        inputFormat: 'messages',
        messages: [
          { role: 'system', content: extractionPrompt },
          { role: 'user', content: '위 대화에서 기억해야 할 정보를 추출하세요.' }
        ],
        mode: {
          type: 'regular',
          temperature: 0.3,
        },
      });

      // Parse the AI response
      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      
      if (!jsonMatch) {
        console.log('[MemoryManager] No valid JSON found in AI response');
        return [];
      }

      const extractedMemories: ExtractedMemory[] = JSON.parse(jsonMatch[0]);
      
      console.log(`[MemoryManager] Extracted ${extractedMemories.length} memories from chat ${chatId}`);
      return extractedMemories;

    } catch (error) {
      console.error('[MemoryManager] Error extracting memories:', error);
      return [];
    }
  }

  // Save or update a memory
  async saveMemory(
    category: MemoryCategory,
    content: string,
    confidence: number = 1.0,
    sourceSessionId?: string
  ): Promise<string> {
    try {
      // Check if similar memory exists
      const existing = await db
        .select()
        .from(userMemory)
        .where(
          and(
            eq(userMemory.userId, this.userId),
            eq(userMemory.category, category),
            eq(userMemory.content, content)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Update confidence if memory already exists
        const newConfidence = Math.min(1.0, (existing[0].confidence as number || 0) + 0.1);
        
        await db
          .update(userMemory)
          .set({
            confidence: newConfidence,
            updatedAt: new Date(),
          })
          .where(eq(userMemory.id, existing[0].id));

        console.log(`[MemoryManager] Updated existing memory: ${category} - ${content.substring(0, 50)}...`);
        return existing[0].id;
      } else {
        // Create new memory
        const result = await db
          .insert(userMemory)
          .values({
            userId: this.userId,
            category,
            content,
            confidence,
            sourceSessionId,
            metadata: {
              extractedFrom: 'conversation',
              source: 'jetXA',
            },
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();

        console.log(`[MemoryManager] Added new memory: ${category} - ${content.substring(0, 50)}...`);
        return result[0].id;
      }
    } catch (error) {
      console.error('[MemoryManager] Error saving memory:', error);
      throw error;
    }
  }

  // Get all memories for the user
  async getAllMemories(): Promise<UserMemory[]> {
    try {
      const memories = await db
        .select()
        .from(userMemory)
        .where(eq(userMemory.userId, this.userId))
        .orderBy(desc(userMemory.updatedAt));

      return memories;
    } catch (error) {
      console.error('[MemoryManager] Error fetching memories:', error);
      return [];
    }
  }

  // Get memories by category
  async getMemoriesByCategory(category: MemoryCategory): Promise<UserMemory[]> {
    try {
      const memories = await db
        .select()
        .from(userMemory)
        .where(
          and(
            eq(userMemory.userId, this.userId),
            eq(userMemory.category, category)
          )
        )
        .orderBy(desc(userMemory.confidence));

      return memories;
    } catch (error) {
      console.error('[MemoryManager] Error fetching memories by category:', error);
      return [];
    }
  }

  // Delete a specific memory
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      await db
        .delete(userMemory)
        .where(
          and(
            eq(userMemory.id, memoryId),
            eq(userMemory.userId, this.userId)
          )
        );

      console.log(`[MemoryManager] Deleted memory: ${memoryId}`);
      return true;
    } catch (error) {
      console.error('[MemoryManager] Error deleting memory:', error);
      return false;
    }
  }

  // Format memories for inclusion in AI prompt
  formatMemoriesForPrompt(): Promise<string> {
    return this.getAllMemories().then(memories => {
      if (memories.length === 0) {
        return '';
      }

      const categorizedMemories: Record<string, string[]> = {};

      memories.forEach(memory => {
        if (!categorizedMemories[memory.category]) {
          categorizedMemories[memory.category] = [];
        }
        categorizedMemories[memory.category].push(memory.content);
      });

      let formatted = '\n\n=== 기억된 정보 ===\n';
      
      const categoryNames: Record<MemoryCategory, string> = {
        personal_info: '개인 정보',
        preferences: '선호도',
        important_dates: '중요한 날짜',
        tasks: '할 일',
        notes: '메모',
        general: '일반',
      };

      Object.entries(categorizedMemories).forEach(([category, items]) => {
        const categoryName = categoryNames[category as MemoryCategory] || category;
        formatted += `\n[${categoryName}]\n`;
        items.forEach(item => {
          formatted += `- ${item}\n`;
        });
      });

      return formatted;
    });
  }

  // Auto-save memories from a conversation
  async autoSaveMemories(chatId: string): Promise<void> {
    try {
      console.log(`[MemoryManager] Auto-saving memories for chat ${chatId}`);
      
      const extractedMemories = await this.extractMemoriesFromConversation(chatId);
      
      let savedCount = 0;
      for (const memory of extractedMemories) {
        if (memory.content && memory.content.length > 5) {
          await this.saveMemory(
            memory.category,
            memory.content,
            memory.confidence,
            chatId
          );
          savedCount++;
        }
      }

      console.log(`[MemoryManager] Auto-saved ${savedCount} memories from chat ${chatId}`);
    } catch (error) {
      console.error('[MemoryManager] Error auto-saving memories:', error);
    }
  }
}

// Auto-save configuration
export const AUTO_SAVE_CONFIG = {
  MESSAGE_THRESHOLD: 10,  // Auto-save after 10 messages
  TIME_INTERVAL: 5 * 60 * 1000,  // 5 minutes
  INACTIVITY_TIMEOUT: 2 * 60 * 1000,  // 2 minutes
};

// Helper function to create memory manager for current user
export async function createMemoryManager(userId: string): Promise<MemoryManager> {
  return new MemoryManager(userId);
}
