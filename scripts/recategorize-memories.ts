// 기존 메모리들을 새로운 분류 시스템으로 재분류

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Force Supabase mode
process.env.USE_POSTGRES = 'true';
process.env.USE_SUPABASE = 'true';

async function recategorizeMemories() {
  // Dynamic imports AFTER env vars are set
  const { db } = await import('../lib/db');
  const { sql } = await import('drizzle-orm');
  const { getEnhancedMemoryManager } = await import('../lib/ai/enhanced-memory-manager');

  console.log('[Recategorize] 기존 메모리 재분류 시작...\n');

  try {
    // 모든 메모리 가져오기
    const allMemories = await db.execute(sql`
      SELECT id, content, category, "userId"
      FROM "UserMemory"
      ORDER BY "createdAt" DESC
    `) as any[];

    console.log(`[Recategorize] 총 ${allMemories.length}개의 메모리 발견\n`);

    // 카테고리별 통계
    const categoryStats: Record<string, number> = {};
    allMemories.forEach((memory: any) => {
      const cat = memory.category || 'undefined';
      categoryStats[cat] = (categoryStats[cat] || 0) + 1;
    });

    console.log('[Recategorize] 현재 카테고리 분포:');
    Object.entries(categoryStats).forEach(([cat, count]) => {
      console.log(`  ${cat}: ${count}개`);
    });
    console.log();

    // Enhanced Memory Manager 초기화
    const memoryManager = getEnhancedMemoryManager();

    let recategorizedCount = 0;
    let unchangedCount = 0;
    const newCategoryStats: Record<string, number> = {};

    // 각 메모리 재분류
    for (const memory of allMemories) {
      const message = {
        role: 'user' as const,
        content: memory.content,
        timestamp: new Date(),
        sessionId: 'recategorize-script'
      };

      // categorizeMemory는 private 메서드이므로, processMemoryComprehensively를 사용
      const result = await memoryManager.processMemoryComprehensively(
        message,
        memory.userId,
        [],
        []
      );

      const newCategory = result.processedMemory?.category || 'general';
      newCategoryStats[newCategory] = (newCategoryStats[newCategory] || 0) + 1;

      // 카테고리가 변경되었는지 확인
      if (newCategory !== memory.category) {
        // 카테고리 업데이트
        await db.execute(sql`
          UPDATE "UserMemory"
          SET category = ${newCategory}
          WHERE id = ${memory.id}
        `);

        console.log(`[Recategorize] ✓ ${memory.id.substring(0, 8)}... : "${memory.category}" → "${newCategory}"`);
        console.log(`  내용: ${memory.content.substring(0, 60)}...`);
        recategorizedCount++;
      } else {
        unchangedCount++;
      }
    }

    console.log('\n[Recategorize] === 재분류 완료 ===');
    console.log(`  변경됨: ${recategorizedCount}개`);
    console.log(`  유지됨: ${unchangedCount}개`);
    console.log();

    console.log('[Recategorize] 새로운 카테고리 분포:');
    Object.entries(newCategoryStats)
      .sort((a, b) => b[1] - a[1])
      .forEach(([cat, count]) => {
        console.log(`  ${cat}: ${count}개`);
      });

    console.log('\n[Recategorize] ✅ 재분류 작업 완료!');

  } catch (error) {
    console.error('[Recategorize] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
recategorizeMemories();
