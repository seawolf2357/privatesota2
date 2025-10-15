// Backfill embeddings for existing memories
// Run this script to generate embeddings for all memories that don't have them

import { getVectorMemoryManager } from '../lib/ai/vector-memory-manager';
import { db } from '../lib/db';
import { sql } from 'drizzle-orm';

async function backfillAllEmbeddings() {
  console.log('[Backfill] Starting embedding generation for all users...\n');

  const vectorManager = getVectorMemoryManager();

  // Wait for model initialization
  console.log('[Backfill] Initializing embedding model...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  try {
    // Get all unique user IDs
    const users = await db.execute(sql`
      SELECT DISTINCT "userId"
      FROM "UserMemory"
    `);

    console.log(`[Backfill] Found ${users.rows.length} users with memories\n`);

    let totalBackfilled = 0;

    for (const user of users.rows) {
      const userId = user.userId as string;
      console.log(`[Backfill] Processing user: ${userId}`);

      const count = await vectorManager.backfillEmbeddings(userId);
      totalBackfilled += count;

      console.log(`[Backfill] ✓ Backfilled ${count} embeddings for user ${userId}\n`);
    }

    console.log(`\n[Backfill] ✅ Complete! Total embeddings generated: ${totalBackfilled}`);

    // Test vector search
    if (totalBackfilled > 0 && users.rows.length > 0) {
      console.log('\n[Backfill] Testing vector search...');
      const testUserId = users.rows[0].userId as string;
      const results = await vectorManager.searchSimilarMemories(
        '좋아하는 음식',
        testUserId,
        3,
        0.5
      );

      console.log(`[Backfill] Found ${results.length} similar memories for test query "좋아하는 음식"`);
      results.forEach((result, i) => {
        console.log(`  ${i + 1}. [${result.category}] ${result.content} (similarity: ${(result.similarity * 100).toFixed(1)}%)`);
      });
    }

  } catch (error) {
    console.error('[Backfill] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the script
backfillAllEmbeddings();
