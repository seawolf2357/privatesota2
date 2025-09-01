# Database Setup Guide

## 🎯 Overview

This project uses a **hybrid database approach**:
- **Local Development**: SQLite (automatic, no setup required)
- **Production (Vercel)**: PostgreSQL (required)
- **Future Migration**: Supabase (planned)

## 🚀 Quick Start (Local Development)

### SQLite (Default for Local)

No setup required! Just run:

```bash
npm run dev
```

SQLite database will be automatically created at `./data/chat.db`

### Environment Variables

```env
# .env (Local Development)
NODE_ENV=development
SQLITE_PATH=./data/chat.db  # Optional, this is the default
```

## 🌐 Production Setup (Vercel Deployment)

### Option 1: Vercel Postgres (Recommended)

1. Install Vercel Postgres from Vercel Dashboard
2. Copy the connection string
3. Set in Vercel environment variables:

```env
NODE_ENV=production
POSTGRES_URL=your-vercel-postgres-url
```

### Option 2: Neon (Free Tier Available)

1. Sign up at [neon.tech](https://neon.tech)
2. Create a new project
3. Copy connection string
4. Set in `.env.production`:

```env
NODE_ENV=production
POSTGRES_URL=postgresql://user:password@ep-xxx.region.aws.neon.tech/dbname
```

### Option 3: Supabase (Recommended for Future)

1. Create account at [supabase.com](https://supabase.com)
2. Create new project
3. Go to Settings → Database
4. Copy connection string
5. Set environment variable:

```env
NODE_ENV=production
POSTGRES_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT].supabase.co:5432/postgres
```

## 📊 Database Schema

The application uses Drizzle ORM which works with both SQLite and PostgreSQL.

### Tables:
- `users` - User accounts and authentication
- `chats` - Chat sessions
- `messages` - Chat messages
- `documents` - Uploaded documents
- `suggestions` - AI suggestions

## 🔄 Migration Commands

### Local (SQLite)
```bash
# Generate migrations
npm run db:generate:sqlite

# Run migrations
npm run db:migrate:sqlite

# View database
npm run db:studio:sqlite
```

### Production (PostgreSQL)
```bash
# Generate migrations
npm run db:generate

# Run migrations
npm run db:migrate

# View database
npm run db:studio
```

## 🔧 Switching Between Databases

### Use SQLite (Local)
```env
NODE_ENV=development
# or
USE_POSTGRES=false
```

### Use PostgreSQL (Local Testing)
```env
NODE_ENV=production
POSTGRES_URL=your-postgres-url
# or
USE_POSTGRES=true
```

## 📝 Database Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "db:generate:sqlite": "drizzle-kit generate --config=drizzle.config.sqlite.ts",
    "db:migrate:sqlite": "tsx lib/db/migrate-sqlite.ts",
    "db:studio:sqlite": "drizzle-kit studio --config=drizzle.config.sqlite.ts",
    "db:setup": "npm run db:migrate:sqlite"
  }
}
```

## 🚨 Important Notes

1. **SQLite Limitations**:
   - Not suitable for production on Vercel
   - Limited concurrent connections
   - No real-time subscriptions

2. **PostgreSQL Requirements**:
   - Required for Vercel deployment
   - Supports all production features
   - Better performance at scale

3. **Data Migration**:
   - When moving from SQLite to PostgreSQL, export/import data manually
   - Use database dump tools or write migration scripts

## 🎯 Supabase Migration Plan

### Why Supabase?

1. **Built on PostgreSQL** - Production ready
2. **Free tier** - Generous limits
3. **Realtime subscriptions** - Live chat updates
4. **Row Level Security** - Better data isolation
5. **Edge Functions** - Serverless computing
6. **Vector embeddings** - AI/ML features

### Migration Steps (Future)

1. Create Supabase project
2. Run Drizzle migrations on Supabase
3. Update connection string
4. Enable Row Level Security
5. Configure Auth (optional)
6. Set up Realtime (optional)

### Supabase Features to Utilize

- **Auth**: Replace NextAuth with Supabase Auth
- **Storage**: Replace Vercel Blob with Supabase Storage
- **Realtime**: Live chat updates
- **Edge Functions**: Background tasks
- **Vector Store**: Semantic search for chat history

## 🔍 Troubleshooting

### SQLite Issues
```bash
# Reset local database
rm -rf ./data/chat.db
npm run db:setup
```

### PostgreSQL Connection Issues
```bash
# Test connection
psql $POSTGRES_URL -c "SELECT 1"

# Check SSL requirements
# Add ?sslmode=require for production
# Add ?sslmode=disable for local PostgreSQL
```

### Migration Errors
```bash
# Clear migration history
rm -rf lib/db/migrations
rm -rf lib/db/migrations-sqlite

# Regenerate
npm run db:generate
```

## 📚 Resources

- [Drizzle ORM Docs](https://orm.drizzle.team)
- [SQLite](https://www.sqlite.org)
- [PostgreSQL](https://www.postgresql.org)
- [Supabase Docs](https://supabase.com/docs)
- [Neon Docs](https://neon.tech/docs)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)