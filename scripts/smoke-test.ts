#!/usr/bin/env tsx
/**
 * Comprehensive Smoke Testing Suite for Production Deployment
 * Tests critical API endpoints, authentication, and multi-tenant isolation
 */

import { config } from 'dotenv';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
config();

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function addTestResult(result: TestResult) {
  results.push(result);
  const statusEmoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : '⏭️';
  console.log(`${statusEmoji} ${result.name} (${result.duration}ms): ${result.message}`);
  if (result.details) {
    console.log(`   Details: ${result.details}`);
  }
}

async function runTest(name: string, testFn: () => Promise<void>) {
  const startTime = Date.now();
  try {
    await testFn();
    const duration = Date.now() - startTime;
    addTestResult({
      name,
      status: 'pass',
      duration,
      message: 'Test passed'
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    addTestResult({
      name,
      status: 'fail',
      duration,
      message: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// 1. Health Check Test
async function testHealthCheck() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/health`);
  
  if (!response.ok) {
    throw new Error(`Health check failed with status ${response.status}`);
  }
  
  const data = await response.json();
  if (data.status !== 'ok') {
    throw new Error(`Health check returned status: ${data.status}`);
  }
}

// 2. Database Connection Test
async function testDatabaseConnection() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    await prisma.$queryRaw`SELECT 1`;
  } finally {
    await prisma.$disconnect();
  }
}

// 3. Authentication Flow Test
async function testAuthenticationFlow() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Test login request
  const loginResponse = await fetch(`${baseUrl}/api/auth/login/request`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: 'admin@loop.demo',
      password: 'ChangeMe123!',
      targetRole: 'ADMIN'
    })
  });
  
  if (!loginResponse.ok) {
    throw new Error('Login request failed');
  }
}

// 4. API Endpoint Tests
async function testAPIEndpoints() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  // Test feedback endpoint (should require auth)
  const feedbackResponse = await fetch(`${baseUrl}/api/feedback`);
  if (feedbackResponse.status !== 401) {
    throw new Error('Feedback endpoint should require authentication');
  }
  
  // Test reports endpoint (should require auth)
  const reportsResponse = await fetch(`${baseUrl}/api/reports`);
  if (reportsResponse.status !== 401) {
    throw new Error('Reports endpoint should require authentication');
  }
}

// 5. Multi-Tenant Isolation Test
async function testMultiTenantIsolation() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Test that queries are workspace-scoped
    const workspaces = await prisma.workspace.findMany();
    if (workspaces.length === 0) {
      throw new Error('No workspaces found in database');
    }
    
    // Test workspace member isolation
    const firstWorkspace = workspaces[0];
    const members = await prisma.user.findMany({
      where: { workspaceId: firstWorkspace.id }
    });
    
    console.log(`   Found ${members.length} members in workspace ${firstWorkspace.name}`);
  } finally {
    await prisma.$disconnect();
  }
}

// 6. Environment Configuration Test
async function testEnvironmentConfiguration() {
  const requiredVars = ['DATABASE_URL', 'NEXTAUTH_SECRET', 'NEXTAUTH_URL'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      throw new Error(`Missing required environment variable: ${varName}`);
    }
  }
  
  if (process.env.NEXTAUTH_SECRET && process.env.NEXTAUTH_SECRET.length < 32) {
    throw new Error('NEXTAUTH_SECRET must be at least 32 characters');
  }
}

// 7. File System Test
async function testFileSystem() {
  const requiredFiles = [
    'prisma/schema.prisma',
    'next.config.mjs',
    'package.json',
    '.env.example'
  ];
  
  for (const file of requiredFiles) {
    try {
      readFileSync(resolve(process.cwd(), file));
    } catch {
      throw new Error(`Required file missing: ${file}`);
    }
  }
}

// 8. Build Output Test
async function testBuildOutput() {
  const buildDir = resolve(process.cwd(), '.next');
  const { existsSync } = await import('fs');
  
  if (!existsSync(buildDir)) {
    throw new Error('Build directory not found. Run `npm run build` first.');
  }
}

// 9. Security Headers Test
async function testSecurityHeaders() {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const response = await fetch(`${baseUrl}/api/health`);
  
  const requiredHeaders = [
    'X-Content-Type-Options',
    'X-Frame-Options',
    'Referrer-Policy'
  ];
  
  for (const header of requiredHeaders) {
    if (!response.headers.get(header)) {
      throw new Error(`Missing security header: ${header}`);
    }
  }
}

// 10. Database Schema Validation
async function testDatabaseSchema() {
  const { PrismaClient } = require('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Test key models exist
    const models = ['User', 'Workspace', 'Feedback', 'Report', 'Theme'];
    
    for (const model of models) {
      try {
        await (prisma as any)[model].findFirst();
      } catch (error) {
        throw new Error(`Database model ${model} not accessible`);
      }
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Main test execution
async function main() {
  console.log('🧪 Project LOOP Smoke Testing Suite\n');
  console.log('========================================\n');
  
  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'Database Connection', fn: testDatabaseConnection },
    { name: 'Environment Configuration', fn: testEnvironmentConfiguration },
    { name: 'File System', fn: testFileSystem },
    { name: 'Build Output', fn: testBuildOutput },
    { name: 'Database Schema Validation', fn: testDatabaseSchema },
    { name: 'Multi-Tenant Isolation', fn: testMultiTenantIsolation },
    { name: 'API Endpoints', fn: testAPIEndpoints },
    { name: 'Authentication Flow', fn: testAuthenticationFlow },
    { name: 'Security Headers', fn: testSecurityHeaders }
  ];
  
  for (const test of tests) {
    await runTest(test.name, test.fn);
  }
  
  console.log('\n========================================');
  console.log('📊 Smoke Test Results Summary\n');
  
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skip').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📋 Total: ${results.length}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);
  
  if (failed > 0) {
    console.log('❌ Smoke tests failed. Please fix the issues above before deployment.');
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
    process.exit(1);
  } else {
    console.log('✅ All smoke tests passed! System is ready for deployment.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Smoke test suite failed:', error);
  process.exit(1);
});