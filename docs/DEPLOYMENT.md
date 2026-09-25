# Project LOOP - Production Deployment Guide

## Prerequisites

- Node.js 18+ installed locally
- PostgreSQL database with pgvector extension
- Vercel account
- Anthropic API key
- Resend API key (for email functionality)

## Environment Setup

### 1. Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
cp .env.example .env
```

Required variables:
- `DATABASE_URL`: PostgreSQL connection string
- `NEXTAUTH_SECRET`: Random string (min 32 chars)
- `NEXTAUTH_URL`: Your production URL
- `ANTHROPIC_API_KEY`: Anthropic Claude API key
- `CRON_SECRET`: Random string for cron authentication

Optional variables:
- `RESEND_API_KEY`: Resend API key for emails
- `RESEND_FROM_EMAIL`: Sender email address

### 2. Database Setup

#### PostgreSQL with pgvector

```sql
-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Verify installation
SELECT * FROM pg_extension WHERE extname = 'vector';
```

#### Connection String Format

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require&connection_limit=10
```

## Vercel Deployment

### 1. Connect to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy project
vercel
```

### 2. Configure Environment Variables in Vercel

Go to your Vercel project settings → Environment Variables and add:

1. **Database Configuration**
   - `DATABASE_URL`: Your PostgreSQL connection string
   - Set all environments (Production, Preview, Development)

2. **Authentication**
   - `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
   - `NEXTAUTH_URL`: Your production domain (e.g., `https://loop.yourdomain.com`)
   - `CRON_SECRET`: Generate with `openssl rand -base64 32`

3. **AI Services**
   - `ANTHROPIC_API_KEY`: Your Anthropic API key
   - `ANTHROPIC_MODEL`: `claude-sonnet-4-6`

4. **Email Services** (Optional)
   - `RESEND_API_KEY`: Your Resend API key
   - `RESEND_FROM_EMAIL`: Your sender email

### 3. Database Migration

#### Automatic Migration (Recommended)

Vercel will automatically run `prisma generate` during build. For migrations:

```bash
# Deploy schema to production
npx prisma db push

# Or use migrations
npx prisma migrate deploy
```

#### Manual Migration

```bash
# Generate Prisma Client
npm run db:generate

# Push schema to database
npm run db:push
```

### 4. Seed Production Data

```bash
# Run production seed script
npm run seed:production
```

⚠️ **Important**: Change default admin password immediately after seeding!

## Pre-Deployment Checklist

Run the deployment check script:

```bash
npm run deploy:check
```

This will verify:
- ✅ Environment variables are set
- ✅ Database connection works
- ✅ Required files exist
- ✅ Build configuration is correct
- ✅ Security headers are configured

## Smoke Testing

After deployment, run smoke tests:

```bash
npm run test:smoke
```

This will test:
- ✅ Health check endpoint
- ✅ Database connectivity
- ✅ Authentication flows
- ✅ API endpoint security
- ✅ Multi-tenant isolation
- ✅ Security headers

## Post-Deployment Steps

### 1. Change Default Credentials

```bash
# Access your deployed application
# Login with admin@loop.demo / ChangeMe123!
# Immediately change password and email
```

### 2. Configure Domain

1. Go to Vercel project settings → Domains
2. Add your custom domain
3. Configure DNS records as instructed by Vercel
4. Update `NEXTAUTH_URL` environment variable

### 3. Set Up Monitoring

#### Vercel Analytics

1. Enable Vercel Analytics in project settings
2. Install analytics package if needed

#### Error Tracking

Consider integrating:
- Sentry for error tracking
- LogRocket for session replay
- Vercel Logs for server logs

### 4. Configure Email (Optional)

If using Resend:

1. Verify your domain in Resend dashboard
2. Update `RESEND_FROM_EMAIL` with verified domain
3. Test email functionality

## Performance Optimization

### 1. Database Connection Pooling

Ensure your `DATABASE_URL` includes connection pooling:

```
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require&connection_limit=10&pool_timeout=20
```

### 2. Edge Functions

Consider using Vercel Edge Functions for:
- Static API responses
- Authentication checks
- Simple redirects

### 3. Caching Strategy

- API routes are set to dynamic (no caching)
- Static pages are optimized by Next.js
- Consider CDN caching for assets

## Security Hardening

### 1. HTTPS Enforcement

All routes use HTTPS by default. Ensure:
- `NEXTAUTH_URL` uses `https://`
- Database connection uses `sslmode=require`

### 2. Rate Limiting

The application includes rate limiting for:
- Login attempts
- Signup attempts
- Role verification

### 3. Security Headers

Configured in `next.config.mjs`:
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: DENY`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security`
- `Permissions-Policy`

### 4. Multi-Tenant Isolation

All database queries are workspace-scoped:
- Composite unique constraints
- Workspace ID filtering
- Cross-tenant access prevention

## Monitoring and Maintenance

### 1. Health Checks

Monitor the health endpoint:
```
https://your-domain.com/api/health
```

### 2. Database Monitoring

Monitor:
- Connection counts
- Query performance
- pgvector index usage
- Storage utilization

### 3. Application Monitoring

Monitor:
- Error rates
- Response times
- Authentication failures
- API endpoint performance

### 4. Cron Jobs

The application uses Vercel Cron for:
- Background job processing
- Scheduled every 5 minutes
- Secured with `CRON_SECRET`

## Troubleshooting

### Build Failures

```bash
# Clear Next.js cache
rm -rf .next

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild
npm run build
```

### Database Connection Issues

```bash
# Test connection
npx prisma db execute --stdin

# Check pgvector extension
psql $DATABASE_URL -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

### Authentication Issues

```bash
# Verify NEXTAUTH_SECRET length
# Must be at least 32 characters

# Check NEXTAUTH_URL matches your domain
# Must include protocol (https://)
```

### Cron Job Failures

```bash
# Verify CRON_SECRET is set
# Check Vercel cron logs
# Test endpoint manually:
curl -X POST https://your-domain.com/api/jobs/process \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

## Rollback Procedures

### 1. Vercel Rollback

1. Go to Vercel dashboard
2. Select your project
3. Go to Deployments
4. Click on previous deployment
5. Click "Promote to Production"

### 2. Database Rollback

```bash
# Restore from backup
psql $DATABASE_URL < backup.sql

# Or rollback migration
npx prisma migrate resolve --rolled-back "migration_name"
```

## Scaling Considerations

### Horizontal Scaling

- Vercel automatically scales horizontally
- Database connection pooling handles increased load
- Consider read replicas for database scaling

### Vertical Scaling

- Monitor resource usage in Vercel
- Upgrade Vercel plan if needed
- Optimize database queries for performance

## Backup Strategy

### Database Backups

```bash
# Automated backups (configure in your PostgreSQL provider)
# Manual backup:
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

### Application Backups

- Vercel maintains deployment history
- Environment variables are backed up
- Code is in Git repository

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**: Review error logs and performance metrics
2. **Monthly**: Update dependencies (`npm update`)
3. **Quarterly**: Review and rotate secrets
4. **Annually**: Security audit and compliance review

### Update Process

```bash
# Pull latest changes
git pull origin main

# Update dependencies
npm update

# Run tests
npm run test:smoke

# Deploy
vercel --prod
```

## Contact and Support

For issues or questions:
- Check Vercel deployment logs
- Review database logs
- Consult this documentation
- Check Prisma documentation for database issues