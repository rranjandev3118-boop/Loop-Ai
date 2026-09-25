# Database Migration Guide for Production Deployment

## Prerequisites

1. Ensure you have a PostgreSQL database with pgvector extension enabled
2. Set up your production DATABASE_URL environment variable
3. Install Prisma CLI: `npm install -g prisma`

## Production Migration Steps

### 1. Initial Database Setup

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to production database (recommended for initial setup)
npm run db:push

# OR use migrations (recommended for ongoing changes)
npx prisma migrate deploy
```

### 2. Verify Database Connection

```bash
# Test database connection
npx prisma db execute --stdin

# Or use the deployment check script
npm run deploy:check
```

### 3. Seed Production Data (Optional)

```bash
# Run production seed script
npm run seed
```

## Migration Best Practices

1. **Always test migrations locally first**
   ```bash
   # Create migration locally
   npx prisma migrate dev --name migration_name
   
   # Test the migration
   npm run test:smoke
   ```

2. **Backup production database before migration**
   ```bash
   # Using pg_dump
   pg_dump $DATABASE_URL > backup_before_migration.sql
   ```

3. **Use Prisma Migrate for production**
   ```bash
   # Deploy migrations to production
   npx prisma migrate deploy
   ```

4. **Monitor migration logs**
   - Check Vercel deployment logs
   - Monitor database performance during migration
   - Verify pgvector extension is enabled

## Troubleshooting

### pgvector Extension Issues

If you encounter pgvector-related errors:

```sql
-- Enable pgvector extension in your database
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

### Connection Pool Issues

If you experience connection timeouts:

```env
# Update DATABASE_URL with connection pooling
DATABASE_URL="postgresql://USER:PASSWORD@HOST/DATABASE?sslmode=require&connection_limit=10&pool_timeout=20"
```

### Migration Conflicts

If migrations fail due to schema conflicts:

```bash
# Reset database (DESTRUCTIVE - only for development)
npx prisma migrate reset

# OR resolve conflicts manually
npx prisma migrate resolve --applied "migration_name"
```

## Rollback Procedures

### Manual Rollback

```bash
# Rollback to previous migration
npx prisma migrate resolve --rolled-back "migration_name"

# Revert schema changes manually
npx prisma db push --force-reset
```

### Database Restoration

```bash
# Restore from backup
psql $DATABASE_URL < backup_before_migration.sql
```

## Monitoring

After migration, monitor:

1. Database connection counts
2. Query performance
3. pgvector index usage
4. Application error rates
5. Vercel deployment logs

## Security Considerations

1. Never commit `.env` files
2. Use strong database passwords
3. Enable SSL connections (`sslmode=require`)
4. Limit database user permissions
5. Regular security updates for PostgreSQL