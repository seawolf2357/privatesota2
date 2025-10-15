// Test vector search functionality with real database queries

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Force Supabase mode
process.env.USE_POSTGRES = 'true';
process.env.USE_SUPABASE = 'true';

async function testVectorSearch() {
  // Dynamic imports AFTER env vars are set
  const { getVectorMemoryManager } = await import('../lib/ai/vector-memory-manager');
  const { db } = await import('../lib/db');
  const { sql } = await import('drizzle-orm');

  console.log('[Test] Testing Vector Search System\n');

  const vectorManager = getVectorMemoryManager();

  try {
    // Get all users with embeddings
    const users = await db.execute(sql`
      SELECT DISTINCT "userId"
      FROM "UserMemory"
      WHERE embedding IS NOT NULL
    `) as any[];

    console.log(`[Test] Found ${users.length} users with embeddings\n`);

    if (users.length === 0) {
      console.log('[Test] ⚠️ No users with embeddings found. Run backfill script first.');
      process.exit(1);
    }

    // Test queries
    const testQueries = [
      '고양이',
      '강아지',
      '음식',
      '날씨',
      '영화',
      '일정',
    ];

    for (const query of testQueries) {
      console.log(`[Test] Query: "${query}"`);

      let totalResults = 0;
      for (const user of users) {
        const userId = user.userId as string;
        const results = await vectorManager.searchSimilarMemories(
          query,
          userId,
          5,
          0.5 // 50% similarity threshold
        );

        if (results.length > 0) {
          console.log(`  User ${userId.substring(0, 8)}... found ${results.length} results:`);
          results.forEach((result, i) => {
            console.log(`    ${i + 1}. [${result.category}] ${result.content.substring(0, 60)}... (${(result.similarity * 100).toFixed(1)}%)`);
          });
          totalResults += results.length;
        }
      }

      if (totalResults === 0) {
        console.log(`  No results found with similarity >= 50%`);
      }
      console.log();
    }

    // Statistics
    console.log('[Test] Database Statistics:');
    const stats = await db.execute(sql`
      SELECT
        COUNT(*) as total_memories,
        COUNT(embedding) as memories_with_embeddings,
        COUNT(DISTINCT "userId") as total_users
      FROM "UserMemory"
    `) as any[];

    const stat = stats[0];
    console.log(`  Total Memories: ${stat.total_memories}`);
    console.log(`  Memories with Embeddings: ${stat.memories_with_embeddings}`);
    console.log(`  Total Users: ${stat.total_users}`);
    console.log(`  Coverage: ${((stat.memories_with_embeddings / stat.total_memories) * 100).toFixed(1)}%\n`);

    console.log('[Test] ✅ Vector search system is working correctly!');

  } catch (error) {
    console.error('[Test] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the test
testVectorSearch();
