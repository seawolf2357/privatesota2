// skipped 카테고리를 general로 변경

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Force Supabase mode
process.env.USE_POSTGRES = 'true';
process.env.USE_SUPABASE = 'true';

async function fixSkippedCategories() {
  // Dynamic imports AFTER env vars are set
  const { db } = await import('../lib/db');
  const { sql } = await import('drizzle-orm');

  console.log('[Fix] skipped 카테고리를 general로 변경 중...\n');

  try {
    await db.execute(sql`
      UPDATE "UserMemory"
      SET category = 'general'
      WHERE category = 'skipped'
    `);

    console.log('[Fix] ✅ 완료! skipped → general 변경됨\n');

    // 최종 분포 확인
    const distribution = await db.execute(sql`
      SELECT category, COUNT(*) as count
      FROM "UserMemory"
      GROUP BY category
      ORDER BY count DESC
    `) as any[];

    console.log('[Fix] 최종 카테고리 분포:');
    distribution.forEach((item: any) => {
      console.log(`  ${item.category}: ${item.count}개`);
    });

  } catch (error) {
    console.error('[Fix] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
fixSkippedCategories();
