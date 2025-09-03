import { config } from 'dotenv';
import postgres from 'postgres';
import fs from 'fs';
import path from 'path';

// Load environment variables
config({ path: '.env.local' });

async function pushSchema() {
  const connectionString = process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT;
  
  if (!connectionString) {
    throw new Error('DATABASE_URL_NON_POOLED is required');
  }
  
  console.log('🚀 Pushing schema to Supabase...');
  
  const sql = postgres(connectionString, {
    max: 1,
    ssl: 'require',
  });
  
  try {
    // Read the generated migration file
    const migrationPath = path.join(process.cwd(), 'lib/db/migrations-supabase/0000_salty_shinobi_shaw.sql');
    
    if (fs.existsSync(migrationPath)) {
      const migrationSQL = fs.readFileSync(migrationPath, 'utf-8');
      console.log('📄 Found migration file, executing...');
      
      // Execute the migration
      await sql.unsafe(migrationSQL);
      console.log('✅ Schema pushed successfully!');
    } else {
      console.log('⚠️  No migration file found, creating tables directly...');
      
      // Create tables directly
      await sql`
        CREATE TABLE IF NOT EXISTS "User" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "email" varchar(64) NOT NULL,
          "password" varchar(64)
        )
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS "Chat" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "createdAt" timestamp NOT NULL,
          "title" text NOT NULL,
          "userId" uuid NOT NULL REFERENCES "User"("id"),
          "visibility" varchar DEFAULT 'private' NOT NULL
        )
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS "Message" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
          "role" varchar NOT NULL,
          "content" json NOT NULL,
          "createdAt" timestamp NOT NULL
        )
      `;
      
      await sql`
        CREATE TABLE IF NOT EXISTS "Message_v2" (
          "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
          "chatId" uuid NOT NULL REFERENCES "Chat"("id"),
          "role" varchar NOT NULL,
          "parts" json NOT NULL,
          "attachments" json NOT NULL,
          "createdAt" timestamp NOT NULL
        )
      `;
      
      console.log('✅ Core tables created!');
    }
    
    // Verify tables
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    console.log('\n📊 Created tables:');
    tables.forEach(t => console.log(`   - ${t.table_name}`));
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed to push schema:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

pushSchema();