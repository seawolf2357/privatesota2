// Fix embedding column dimensions from 1536 to 384
// This updates the Supabase PostgreSQL database to match our local model output

import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local
config({ path: resolve(__dirname, '../.env.local') });

// Force Supabase mode
process.env.USE_POSTGRES = 'true';
process.env.USE_SUPABASE = 'true';

async function fixEmbeddingDimensions() {
  // Dynamic imports AFTER env vars are set
  const { db } = await import('../lib/db');
  const { sql } = await import('drizzle-orm');

  console.log('[Migration] Fixing embedding column dimensions (1536 -> 384)...\n');

  try {
    // Step 1: Drop the existing index
    console.log('[Migration] Step 1: Dropping existing vector index...');
    await db.execute(sql`
      DROP INDEX IF EXISTS "UserMemory_embedding_idx"
    `);
    console.log('[Migration] ✓ Index dropped\n');

    // Step 2: Drop the existing embedding column
    console.log('[Migration] Step 2: Dropping old embedding column...');
    await db.execute(sql`
      ALTER TABLE "UserMemory" DROP COLUMN IF EXISTS embedding
    `);
    console.log('[Migration] ✓ Column dropped\n');

    // Step 3: Add new embedding column with 384 dimensions
    console.log('[Migration] Step 3: Adding new embedding column (384D)...');
    await db.execute(sql`
      ALTER TABLE "UserMemory" ADD COLUMN embedding vector(384)
    `);
    console.log('[Migration] ✓ Column added\n');

    // Step 4: Create new ivfflat index
    console.log('[Migration] Step 4: Creating new vector index...');
    await db.execute(sql`
      CREATE INDEX ON "UserMemory"
      USING ivfflat (embedding vector_cosine_ops)
      WITH (lists = 100)
    `);
    console.log('[Migration] ✓ Index created\n');

    console.log('[Migration] ✅ Migration complete! Embedding column now uses 384 dimensions.');
    console.log('[Migration] Run the backfill script to generate embeddings for existing memories.\n');

  } catch (error) {
    console.error('[Migration] Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

// Run the migration
fixEmbeddingDimensions();
