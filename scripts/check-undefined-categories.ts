// undefined 카테고리 확인 스크립트

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Force Supabase mode
process.env.USE_POSTGRES = 'true';
process.env.USE_SUPABASE = 'true';

async function checkUndefinedCategories() {
  // Dynamic imports AFTER env vars are set
  const { db } = await import('../lib/db');
  const { sql } = await import('drizzle-orm');

  console.log('[Check] undefined 카테고리 확인 중...\n');

  try {
    // 카테고리가 NULL이거나 'undefined'인 메모리 찾기
    const undefinedMemories = await db.execute(sql`
      SELECT id, content, category, "userId", "createdAt"
      FROM "UserMemory"
      WHERE category IS NULL OR category = 'undefined' OR category = ''
      ORDER BY "createdAt" DESC
    `) as any[];

    console.log(`[Check] NULL/undefined 카테고리: ${undefinedMemories.length}개\n`);

    if (undefinedMemories.length > 0) {
      console.log('[Check] 발견된 메모리들:');
      undefinedMemories.forEach((memory: any, index: number) => {
        console.log(`  ${index + 1}. ID: ${memory.id.substring(0, 8)}...`);
        console.log(`     Category: ${memory.category === null ? 'NULL' : `"${memory.category}"`}`);
        console.log(`     Content: ${memory.content.substring(0, 100)}...`);
        console.log(`     Created: ${memory.createdAt}`);
        console.log();
      });
    }

    // 전체 카테고리 분포
    const categoryDistribution = await db.execute(sql`
      SELECT
        COALESCE(category, 'NULL') as category,
        COUNT(*) as count
      FROM "UserMemory"
      GROUP BY category
      ORDER BY count DESC
    `) as any[];

    console.log('[Check] 전체 카테고리 분포:');
    categoryDistribution.forEach((item: any) => {
      console.log(`  ${item.category}: ${item.count}개`);
    });

    // skipped 카테고리 메모리들 샘플 확인
    console.log('\n[Check] "skipped" 카테고리 메모리 샘플 (최대 5개):');
    const skippedMemories = await db.execute(sql`
      SELECT id, content
      FROM "UserMemory"
      WHERE category = 'skipped'
      LIMIT 5
    `) as any[];

    skippedMemories.forEach((memory: any, index: number) => {
      console.log(`  ${index + 1}. ${memory.content.substring(0, 100)}...`);
    });

  } catch (error) {
    console.error('[Check] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
checkUndefinedCategories();
