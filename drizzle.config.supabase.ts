import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

if (!process.env.DATABASE_URL_NON_POOLED && !process.env.DATABASE_URL_DIRECT) {
  throw new Error('DATABASE_URL_NON_POOLED or DATABASE_URL_DIRECT is required for migrations');
}

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations-supabase',
  dialect: 'postgresql',
  dbCredentials: {
    // Migrations must use direct connection (not pooled)
    url: process.env.DATABASE_URL_NON_POOLED || process.env.DATABASE_URL_DIRECT || '',
  },
  verbose: true,
  strict: true,
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
  },
});