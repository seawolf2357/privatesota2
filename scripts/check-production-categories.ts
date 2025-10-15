// 프로덕션 Supabase 데이터베이스의 카테고리 확인

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Force Supabase mode
process.env.USE_POSTGRES = 'true';
process.env.USE_SUPABASE = 'true';

async function checkProductionCategories() {
  // Dynamic imports AFTER env vars are set
  const { db } = await import('../lib/db');
  const { sql } = await import('drizzle-orm');

  console.log('[Check] 프로덕션 데이터베이스 카테고리 확인 중...\n');

  try {
    // 전체 카테고리 분포
    console.log('[Check] === 전체 카테고리 분포 ===');
    const categoryDistribution = await db.execute(sql`
      SELECT
        CASE
          WHEN category IS NULL THEN 'NULL'
          WHEN category = '' THEN 'EMPTY_STRING'
          ELSE category
        END as category,
        COUNT(*) as count
      FROM "UserMemory"
      GROUP BY category
      ORDER BY count DESC
    `) as any[];

    categoryDistribution.forEach((item: any) => {
      console.log(`  ${item.category}: ${item.count}개`);
    });

    // undefined 또는 NULL 카테고리 메모리 샘플
    console.log('\n[Check] === undefined/NULL 카테고리 메모리 샘플 ===');
    const undefinedMemories = await db.execute(sql`
      SELECT id, content, category, "userId", "createdAt", metadata
      FROM "UserMemory"
      WHERE category IS NULL OR category = 'undefined' OR category = ''
      ORDER BY "createdAt" DESC
      LIMIT 10
    `) as any[];

    if (undefinedMemories.length > 0) {
      console.log(`발견: ${undefinedMemories.length}개 (최대 10개 표시)\n`);
      undefinedMemories.forEach((memory: any, index: number) => {
        console.log(`${index + 1}. ID: ${memory.id.substring(0, 8)}...`);
        console.log(`   Category: ${memory.category === null ? 'NULL' : `"${memory.category}"`}`);
        console.log(`   Content: ${memory.content.substring(0, 80)}...`);
        console.log(`   Created: ${memory.createdAt}`);
        console.log(`   User: ${memory.userId.substring(0, 8)}...`);
        if (memory.metadata) {
          console.log(`   Metadata: ${JSON.stringify(memory.metadata).substring(0, 100)}...`);
        }
        console.log();
      });
    } else {
      console.log('없음\n');
    }

    // 가장 최근 저장된 메모리들 확인
    console.log('[Check] === 최근 저장된 메모리 (최근 5개) ===');
    const recentMemories = await db.execute(sql`
      SELECT id, content, category, "userId", "createdAt", confidence
      FROM "UserMemory"
      ORDER BY "createdAt" DESC
      LIMIT 5
    `) as any[];

    recentMemories.forEach((memory: any, index: number) => {
      console.log(`${index + 1}. [${memory.category || 'NULL'}] ${memory.content.substring(0, 60)}...`);
      console.log(`   Created: ${memory.createdAt}, Confidence: ${memory.confidence || 'N/A'}`);
    });

    // "저는 서울에 살고 있어요" 메시지 검색
    console.log('\n[Check] === "서울" 키워드 메모리 검색 ===');
    const seoulMemories = await db.execute(sql`
      SELECT id, content, category, "createdAt", confidence, metadata
      FROM "UserMemory"
      WHERE content LIKE '%서울%'
      ORDER BY "createdAt" DESC
      LIMIT 5
    `) as any[];

    if (seoulMemories.length > 0) {
      console.log(`발견: ${seoulMemories.length}개\n`);
      seoulMemories.forEach((memory: any, index: number) => {
        console.log(`${index + 1}. Category: ${memory.category || 'NULL'}`);
        console.log(`   Content: ${memory.content.substring(0, 80)}...`);
        console.log(`   Created: ${memory.createdAt}`);
        console.log(`   Confidence: ${memory.confidence || 'N/A'}`);
        if (memory.metadata) {
          const meta = typeof memory.metadata === 'string' ? JSON.parse(memory.metadata) : memory.metadata;
          console.log(`   Source: ${meta.source || 'N/A'}`);
        }
        console.log();
      });
    } else {
      console.log('없음\n');
    }

    // 벡터 임베딩 상태 확인
    console.log('[Check] === 벡터 임베딩 상태 ===');
    const embeddingStats = await db.execute(sql`
      SELECT
        COUNT(*) as total,
        COUNT(embedding) as with_embedding,
        COUNT(*) - COUNT(embedding) as without_embedding
      FROM "UserMemory"
    `) as any[];

    const stats = embeddingStats[0];
    console.log(`  총 메모리: ${stats.total}개`);
    console.log(`  임베딩 있음: ${stats.with_embedding}개`);
    console.log(`  임베딩 없음: ${stats.without_embedding}개`);
    console.log(`  커버리지: ${((stats.with_embedding / stats.total) * 100).toFixed(1)}%`);

  } catch (error) {
    console.error('[Check] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
checkProductionCategories();
