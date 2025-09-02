# Database Strategy for PrivateSOTA2 Deployment

## Overview
This document outlines the database strategy for deploying PrivateSOTA2 across different environments.

## Current Setup

### Local Development
- **Database**: SQLite
- **Location**: `./data/personal_assistant.db`
- **ORM**: Drizzle ORM with SQLite adapter
- **Initialization**: Run `npm run db:init` to create tables

### Production (Vercel Deployment)
- **Database**: PostgreSQL (automatic switching)
- **Provider**: Vercel Postgres or external PostgreSQL service
- **ORM**: Drizzle ORM with PostgreSQL adapter
- **Connection**: Via `DATABASE_URL` environment variable

## Automatic Database Switching

The application automatically detects the environment and switches between SQLite and PostgreSQL:

```typescript
// lib/db.ts
const isProduction = process.env.NODE_ENV === 'production';
const databaseUrl = process.env.DATABASE_URL;

if (isProduction && databaseUrl) {
  // Use PostgreSQL in production
  db = drizzle(postgres(databaseUrl));
} else {
  // Use SQLite for local development
  const sqlite = new Database('./data/personal_assistant.db');
  db = drizzle(sqlite);
}
```

## Environment Variables

### Local Development (.env.local)
```env
# No DATABASE_URL needed for SQLite
NODE_ENV=development
```

### Production (Vercel Environment Variables)
```env
DATABASE_URL=postgresql://user:password@host:port/database
NODE_ENV=production
```

## Database Schema Compatibility

The schema is designed to work with both SQLite and PostgreSQL:

1. **UUID Generation**:
   - SQLite: Uses `crypto.randomUUID()`
   - PostgreSQL: Can use `gen_random_uuid()` or application-level UUIDs

2. **Data Types**:
   - Text fields work across both databases
   - Timestamps handled by Drizzle ORM abstraction
   - JSON fields supported in both (TEXT in SQLite, JSONB in PostgreSQL)

## Migration Strategy

### Initial Deployment
1. Set up PostgreSQL database on Vercel or external provider
2. Add `DATABASE_URL` to Vercel environment variables
3. Run database migrations on first deployment
4. Seed with initial data if needed

### Schema Updates
1. Test schema changes locally with SQLite
2. Create migration files using Drizzle Kit
3. Apply migrations to production PostgreSQL

## Backup and Recovery

### Local Development
- SQLite database file can be backed up directly
- Located at `./data/personal_assistant.db`

### Production
- Use PostgreSQL backup tools
- Configure automated backups through hosting provider
- Consider point-in-time recovery for critical data

## Performance Considerations

### SQLite (Local)
- Excellent for single-user development
- Fast reads, suitable for development testing
- File-based, no network overhead

### PostgreSQL (Production)
- Better concurrent user handling
- Advanced indexing capabilities
- Connection pooling support
- Suitable for scaling

## Troubleshooting

### Common Issues

1. **"No such table" errors in local development**:
   - Run `npm run db:init` to create tables
   - Check if `./data/` directory exists

2. **Connection errors in production**:
   - Verify `DATABASE_URL` is correctly set in Vercel
   - Check PostgreSQL service is running
   - Verify connection string format

3. **Schema mismatch between environments**:
   - Ensure migrations are applied to both databases
   - Use Drizzle Kit to generate consistent schemas

## Deployment Checklist

- [ ] PostgreSQL database provisioned
- [ ] `DATABASE_URL` added to Vercel environment variables
- [ ] Database migrations prepared
- [ ] Connection pooling configured (if needed)
- [ ] Backup strategy in place
- [ ] Monitoring configured for database health

## Commands

```bash
# Local development
npm run db:init     # Initialize SQLite database
npm run db:push     # Push schema changes
npm run db:studio   # Open Drizzle Studio

# Production
npm run db:migrate  # Run migrations on PostgreSQL
```

## Notes

- The application handles database switching automatically based on environment
- No code changes needed when deploying to Vercel
- Ensure all team members run `npm run db:init` after cloning the repository
- Consider using Vercel Postgres for seamless integration with Vercel deployment