# Project LOOP - Testing Guide

## Overview

Project LOOP includes a comprehensive testing suite to ensure production readiness. This guide covers all available tests and how to run them.

## Test Suites

### 1. Deployment Check (`npm run deploy:check`)

Validates environment configuration and system readiness before deployment.

**What it tests:**
- ✅ Environment variables are properly set
- ✅ Database connection is working
- ✅ Required files exist
- ✅ Build configuration is correct
- ✅ Security headers are configured

**When to run:**
- Before deploying to any environment
- After changing environment variables
- After modifying build configuration

**Example:**
```bash
npm run deploy:check
```

### 2. Smoke Tests (`npm run test:smoke`)

Tests critical API endpoints and basic functionality.

**What it tests:**
- ✅ Health check endpoint
- ✅ Database connectivity
- ✅ Environment configuration
- ✅ File system integrity
- ✅ Build output validation
- ✅ Database schema validation
- ✅ Multi-tenant isolation (basic)
- ✅ API endpoint security
- ✅ Authentication flows (basic)
- ✅ Security headers

**When to run:**
- After deployment
- After major code changes
- Before releasing to production

**Example:**
```bash
npm run test:smoke
```

### 3. Authentication Tests (`npm run test:auth`)

Comprehensive testing of authentication and authorization flows.

**What it tests:**
- ✅ Login request flow
- ✅ OTP resend functionality
- ✅ Role verification
- ✅ Session management
- ✅ Protected endpoint security
- ✅ Rate limiting
- ✅ Signup flow
- ✅ Security headers

**When to run:**
- After authentication changes
- After security updates
- Before deploying authentication features

**Example:**
```bash
npm run test:auth
```

### 4. Multi-Tenant Isolation Tests (`npm run test:tenant-isolation`)

Verifies that data is properly isolated between workspaces (critical security test).

**What it tests:**
- ✅ Workspace isolation
- ✅ User-workspace isolation
- ✅ Feedback isolation
- ✅ Theme isolation
- ✅ Report isolation
- ✅ Cross-tenant access prevention
- ✅ Audit log isolation
- ✅ Cascade deletion constraints

**When to run:**
- Before production deployment (MANDATORY)
- After database schema changes
- After security updates
- After multi-tenant code changes

**Example:**
```bash
npm run test:tenant-isolation
```

### 5. Performance Tests (`npm run test:performance`)

Tests API response times, database performance, and resource usage.

**What it tests:**
- ✅ API response times
- ✅ Database query performance
- ✅ Concurrent request handling
- ✅ Memory usage
- ✅ Rate limiting performance
- ✅ Build optimization

**When to run:**
- Before production deployment
- After performance optimizations
- When investigating performance issues
- Before scaling decisions

**Example:**
```bash
npm run test:performance
```

### 6. All Tests (`npm run test:all`)

Runs all test suites in sequence for comprehensive validation.

**When to run:**
- Before production deployment (RECOMMENDED)
- After major releases
- During comprehensive system audits

**Example:**
```bash
npm run test:all
```

## Testing Workflow

### Pre-Deployment Testing

1. **Run deployment check:**
   ```bash
   npm run deploy:check
   ```

2. **Run all tests:**
   ```bash
   npm run test:all
   ```

3. **Review results and fix any failures**

4. **Build the application:**
   ```bash
   npm run build
   ```

### Continuous Testing

During development, run specific test suites based on your changes:

- **Authentication changes:** `npm run test:auth`
- **Database changes:** `npm run test:tenant-isolation`
- **Performance changes:** `npm run test:performance`
- **General changes:** `npm run test:smoke`

## Test Configuration

### Environment Variables

Tests require the following environment variables:

```bash
# Required
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=your-secret-min-32-chars
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=your-anthropic-key
CRON_SECRET=your-secret-min-32-chars

# Optional
RESEND_API_KEY=your-resend-key
RESEND_FROM_EMAIL=noreply@example.com
```

### Test Database

For comprehensive testing, you can use a separate test database:

```bash
# Set test database URL
export TEST_DATABASE_URL="postgresql://test:test@localhost:5432/loop_test"

# Run tests with test database
DATABASE_URL=$TEST_DATABASE_URL npm run test:all
```

## Troubleshooting

### Common Issues

#### 1. Database Connection Failures

**Problem:** Tests fail with database connection errors

**Solution:**
```bash
# Verify database is running
# Check DATABASE_URL is correct
# Test connection manually
npx prisma db execute --stdin
```

#### 2. Authentication Test Failures

**Problem:** Authentication tests fail

**Solution:**
```bash
# Ensure NEXTAUTH_SECRET is set and >= 32 characters
# Verify NEXTAUTH_URL matches your test environment
# Check that admin user exists (for seed data)
```

#### 3. Multi-Tenant Isolation Failures

**Problem:** Tenant isolation tests fail

**Solution:**
```bash
# This is critical - investigate immediately
# Check database schema constraints
# Verify workspace scoping in queries
# Review audit logs for cross-tenant access
```

#### 4. Performance Test Failures

**Problem:** Performance tests show slow response times

**Solution:**
```bash
# Check database query performance
# Review database connection pooling
# Consider adding database indexes
# Check for memory leaks
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: loop_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Generate Prisma Client
        run: npx prisma generate
      
      - name: Run deployment check
        run: npm run deploy:check
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/loop_test
          NEXTAUTH_SECRET: test-secret-min-32-characters-long
          NEXTAUTH_URL: http://localhost:3000
          ANTHROPIC_API_KEY: test-key
          CRON_SECRET: test-secret-min-32-characters-long
      
      - name: Run smoke tests
        run: npm run test:smoke
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/loop_test
          NEXTAUTH_SECRET: test-secret-min-32-characters-long
          NEXTAUTH_URL: http://localhost:3000
          ANTHROPIC_API_KEY: test-key
          CRON_SECRET: test-secret-min-32-characters-long
```

## Test Results Interpretation

### Pass ✅

The test passed successfully. No action required.

### Fail ❌

The test failed and needs attention. This is critical for:
- Deployment checks
- Multi-tenant isolation tests
- Security-related tests

### Warn ⚠️

The test passed but with concerns. Review and consider:
- Performance optimizations
- Configuration improvements
- Security enhancements

### Skip ⏭️

The test was skipped (usually due to missing test data). This is normal in development environments.

## Best Practices

1. **Run tests before every deployment**
   - Use `npm run test:all` for comprehensive validation

2. **Fix failures immediately**
   - Never deploy with failing tests
   - Investigate root causes thoroughly

3. **Keep tests updated**
   - Update tests when adding new features
   - Maintain test data relevance

4. **Monitor test performance**
   - If tests become slow, optimize them
   - Consider parallel test execution

5. **Document test failures**
   - Keep track of common issues
   - Create troubleshooting guides

## Custom Tests

You can create custom test scripts by following the pattern in the `scripts/` directory:

```typescript
#!/usr/bin/env tsx
import { config } from 'dotenv';

config();

async function main() {
  console.log('Running custom test...');
  
  // Your test logic here
  
  console.log('Test completed!');
}

main().catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});
```

Add to package.json:
```json
{
  "scripts": {
    "test:custom": "tsx scripts/custom-test.ts"
  }
}
```

## Support

For issues with tests:
1. Check the troubleshooting section above
2. Review test output for specific error messages
3. Consult the main deployment guide: `docs/DEPLOYMENT.md`
4. Check GitHub issues for similar problems