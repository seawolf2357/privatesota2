/**
 * Fix undefined categories in database
 * This script updates all memories with 'undefined' category to 'general'
 */

// Load environment variables
import { config } from 'dotenv';
config({ path: '.env.local' });

// Force Supabase usage
process.env.USE_SUPABASE = 'true';
process.env.USE_POSTGRES = 'true';

import { db } from '../lib/db';
import { userMemory } from '../lib/db/schema';
import { eq } from 'drizzle-orm';

async function fixUndefinedCategories() {
  console.log('🔍 Searching for memories with undefined categories...');

  try {
    // Find all memories with 'undefined' category
    const undefinedMemories = await db
      .select()
      .from(userMemory)
      .where(eq(userMemory.category, 'undefined'));

    console.log(`📊 Found ${undefinedMemories.length} memories with undefined category`);

    if (undefinedMemories.length === 0) {
      console.log('✅ No undefined categories found. Database is clean!');
      return;
    }

    // Update each memory to 'general' category
    let updated = 0;
    for (const memory of undefinedMemories) {
      try {
        await db
          .update(userMemory)
          .set({
            category: 'general',
            updatedAt: new Date()
          })
          .where(eq(userMemory.id, memory.id));

        updated++;
        console.log(`✓ Updated memory ${memory.id}: "${memory.content.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`✗ Failed to update memory ${memory.id}:`, error);
      }
    }

    console.log(`\n✅ Successfully updated ${updated}/${undefinedMemories.length} memories`);
    console.log('🎉 Database cleanup complete!');

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the script
fixUndefinedCategories()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
