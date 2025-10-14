/**
 * Fix undefined categories in Supabase database
 * This script connects directly to Supabase and updates all memories with 'undefined' category to 'general'
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import * as schema from '../lib/db/schema';

async function fixSupabaseCategories() {
  // Direct Supabase connection
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL_DIRECT;

  if (!dbUrl) {
    console.error('❌ No DATABASE_URL found in environment');
    console.log('Available env vars:', {
      DATABASE_URL: !!process.env.DATABASE_URL,
      POSTGRES_URL: !!process.env.POSTGRES_URL,
      DATABASE_URL_DIRECT: !!process.env.DATABASE_URL_DIRECT
    });
    process.exit(1);
  }

  console.log('🚀 Connecting to Supabase PostgreSQL...');
  console.log('📍 Connection:', dbUrl.replace(/:[^:]*@/, ':***@'));

  const client = postgres(dbUrl, {
    prepare: false,
    ssl: 'require',
    connection: {
      client_encoding: 'UTF8',
    },
  });

  const db = drizzle(client, { schema });

  console.log('🔍 Searching for memories with undefined categories...');

  try {
    // Find all memories with 'undefined' category
    const undefinedMemories = await db
      .select()
      .from(schema.userMemory)
      .where(eq(schema.userMemory.category, 'undefined' as any));

    console.log(`📊 Found ${undefinedMemories.length} memories with undefined category`);

    if (undefinedMemories.length === 0) {
      console.log('✅ No undefined categories found. Database is clean!');
      await client.end();
      return;
    }

    // Update each memory to 'general' category
    let updated = 0;
    for (const memory of undefinedMemories) {
      try {
        await db
          .update(schema.userMemory)
          .set({
            category: 'general' as any,
            updatedAt: new Date()
          })
          .where(eq(schema.userMemory.id, memory.id));

        updated++;
        console.log(`✓ Updated memory ${memory.id}: "${memory.content.substring(0, 50)}..."`);
      } catch (error) {
        console.error(`✗ Failed to update memory ${memory.id}:`, error);
      }
    }

    console.log(`\n✅ Successfully updated ${updated}/${undefinedMemories.length} memories`);
    console.log('🎉 Database cleanup complete!');

    await client.end();

  } catch (error) {
    console.error('❌ Error during cleanup:', error);
    await client.end();
    process.exit(1);
  }
}

// Run the script
fixSupabaseCategories()
  .then(() => {
    console.log('\n✨ Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Script failed:', error);
    process.exit(1);
  });
