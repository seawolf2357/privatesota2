import { config } from 'dotenv';
import { defineConfig } from 'drizzle-kit';

// Load environment variables
config({ path: '.env.local' });
config({ path: '.env' });

export default defineConfig({
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations-neon',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.POSTGRES_URL || '',
  },
  verbose: true,
  strict: true,
  migrations: {
    table: 'drizzle_migrations',
    schema: 'public',
  },
});