#!/usr/bin/env tsx
/**
 * Deployment Readiness Check Script
 * Validates environment configuration and system readiness for production deployment
 */

import { config } from 'dotenv';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

// Load environment variables
config();

interface CheckResult {
  name: string;
  status: 'pass' | 'fail' | 'warn';
  message: string;
  details?: string;
}

const checks: CheckResult[] = [];

function addCheck(result: CheckResult) {
  checks.push(result);
  console.log(`[${result.status.toUpperCase()}] ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`  Details: ${result.details}`);
  }
}

// 1. Environment Variables Check
function checkEnvironmentVariables() {
  console.log('\n🔍 Checking Environment Variables...');
  
  const requiredVars = [
    'DATABASE_URL',
    'NEXTAUTH_SECRET',
    'NEXTAUTH_URL',
    'ANTHROPIC_API_KEY',
    'CRON_SECRET'
  ];
  
  const optionalVars = [
    'RESEND_API_KEY',
    'RESEND_FROM_EMAIL'
  ];
  
  requiredVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      addCheck({
        name: `Environment Variable: ${varName}`,
        status: 'fail',
        message: 'Missing required environment variable',
        details: `Set ${varName} in your environment or .env file`
      });
    } else if (value.includes('replace-with') || value.includes('your-')) {
      addCheck({
        name: `Environment Variable: ${varName}`,
        status: 'fail',
        message: 'Environment variable contains placeholder value',
        details: `Replace the placeholder value for ${varName} with a real value`
      });
    } else {
      addCheck({
        name: `Environment Variable: ${varName}`,
        status: 'pass',
        message: 'Environment variable is set'
      });
    }
  });
  
  optionalVars.forEach(varName => {
    const value = process.env[varName];
    if (!value) {
      addCheck({
        name: `Environment Variable: ${varName}`,
        status: 'warn',
        message: 'Optional environment variable not set',
        details: `${varName} is optional but recommended for full functionality`
      });
    } else {
      addCheck({
        name: `Environment Variable: ${varName}`,
        status: 'pass',
        message: 'Environment variable is set'
      });
    }
  });
  
  // Check NEXTAUTH_SECRET length
  const nextAuthSecret = process.env.NEXTAUTH_SECRET;
  if (nextAuthSecret && nextAuthSecret.length < 32) {
    addCheck({
      name: 'NEXTAUTH_SECRET Security',
      status: 'fail',
      message: 'NEXTAUTH_SECRET is too short',
      details: 'NEXTAUTH_SECRET should be at least 32 characters for security'
    });
  }
}

// 2. Database Connection Check
async function checkDatabaseConnection() {
  console.log('\n🔍 Checking Database Connection...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    await prisma.$queryRaw`SELECT 1`;
    
    addCheck({
      name: 'Database Connection',
      status: 'pass',
      message: 'Successfully connected to database'
    });
    
    await prisma.$disconnect();
  } catch (error) {
    addCheck({
      name: 'Database Connection',
      status: 'fail',
      message: 'Failed to connect to database',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// 3. File Structure Check
function checkFileStructure() {
  console.log('\n🔍 Checking File Structure...');
  
  const requiredFiles = [
    'prisma/schema.prisma',
    '.env.example',
    'next.config.mjs',
    'vercel.json',
    'package.json'
  ];
  
  requiredFiles.forEach(file => {
    const filePath = resolve(process.cwd(), file);
    if (existsSync(filePath)) {
      addCheck({
        name: `File: ${file}`,
        status: 'pass',
        message: 'Required file exists'
      });
    } else {
      addCheck({
        name: `File: ${file}`,
        status: 'fail',
        message: 'Required file missing',
        details: `Ensure ${file} exists in the project root`
      });
    }
  });
}

// 4. Build Configuration Check
function checkBuildConfiguration() {
  console.log('\n🔍 Checking Build Configuration...');
  
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    
    if (packageJson.scripts?.build) {
      addCheck({
        name: 'Build Script',
        status: 'pass',
        message: 'Build script defined in package.json'
      });
    } else {
      addCheck({
        name: 'Build Script',
        status: 'fail',
        message: 'Build script missing from package.json'
      });
    }
    
    if (packageJson.scripts?.start) {
      addCheck({
        name: 'Start Script',
        status: 'pass',
        message: 'Start script defined in package.json'
      });
    } else {
      addCheck({
        name: 'Start Script',
        status: 'warn',
        message: 'Start script missing from package.json'
      });
    }
  } catch (error) {
    addCheck({
      name: 'Package.json',
      status: 'fail',
      message: 'Failed to read package.json',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// 5. Security Configuration Check
function checkSecurityConfiguration() {
  console.log('\n🔍 Checking Security Configuration...');
  
  try {
    const nextConfig = readFileSync('next.config.mjs', 'utf-8');
    
    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Strict-Transport-Security'
    ];
    
    securityHeaders.forEach(header => {
      if (nextConfig.includes(header)) {
        addCheck({
          name: `Security Header: ${header}`,
          status: 'pass',
          message: 'Security header configured'
        });
      } else {
        addCheck({
          name: `Security Header: ${header}`,
          status: 'warn',
          message: 'Security header not configured',
          details: `Consider adding ${header} for enhanced security`
        });
      }
    });
  } catch (error) {
    addCheck({
      name: 'Security Configuration',
      status: 'fail',
      message: 'Failed to read next.config.mjs',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Main execution
async function main() {
  console.log('🚀 Project LOOP Deployment Readiness Check\n');
  console.log('===========================================\n');
  
  checkEnvironmentVariables();
  await checkDatabaseConnection();
  checkFileStructure();
  checkBuildConfiguration();
  checkSecurityConfiguration();
  
  console.log('\n===========================================');
  console.log('📊 Deployment Readiness Summary\n');
  
  const passed = checks.filter(c => c.status === 'pass').length;
  const failed = checks.filter(c => c.status === 'fail').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`📋 Total: ${checks.length}\n`);
  
  if (failed > 0) {
    console.log('❌ Deployment is NOT ready. Please fix the failed checks above.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  Deployment is ready with warnings. Review warnings before deploying.');
    process.exit(0);
  } else {
    console.log('✅ Deployment is ready! All checks passed.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Deployment check failed:', error);
  process.exit(1);
});