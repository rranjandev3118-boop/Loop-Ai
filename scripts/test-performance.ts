#!/usr/bin/env tsx
/**
 * Performance Testing Script
 * Tests API response times, database query performance, and resource usage
 */

import { config } from 'dotenv';

// Load environment variables
config();

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface PerformanceTest {
  name: string;
  target: string;
  acceptableTime: number; // in milliseconds
}

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'skip';
  duration: number;
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function addResult(result: TestResult) {
  results.push(result);
  const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : result.status === 'warn' ? '⚠️' : '⏭️';
  const statusColor = result.status === 'pass' ? '🟢' : result.status === 'fail' ? '🔴' : result.status === 'warn' ? '🟡' : '⚪';
  console.log(`${statusColor} ${result.name} (${result.duration}ms): ${result.message}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
}

async function measurePerformance(test: PerformanceTest): Promise<number> {
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${baseUrl}${test.target}`);
    await response.json();
    
    return Date.now() - startTime;
  } catch (error) {
    throw new Error(`Request failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function testAPIResponseTimes() {
  console.log('\n⚡ Testing API Response Times...');
  
  const tests: PerformanceTest[] = [
    { name: 'Health Check', target: '/api/health', acceptableTime: 500 },
    { name: 'Feedback List', target: '/api/feedback', acceptableTime: 1000 },
    { name: 'Reports List', target: '/api/reports', acceptableTime: 1000 },
    { name: 'Auth Login Request', target: '/api/auth/login/request', acceptableTime: 1500 }
  ];

  for (const test of tests) {
    try {
      const duration = await measurePerformance(test);
      
      let status: 'pass' | 'fail' | 'warn';
      let message: string;
      
      if (duration <= test.acceptableTime) {
        status = 'pass';
        message = 'Response time within acceptable limits';
      } else if (duration <= test.acceptableTime * 2) {
        status = 'warn';
        message = 'Response time slower than expected';
      } else {
        status = 'fail';
        message = 'Response time too slow';
      }
      
      addResult({
        name: test.name,
        status,
        duration,
        message,
        details: `Target: ${test.acceptableTime}ms, Actual: ${duration}ms`
      });
    } catch (error) {
      addResult({
        name: test.name,
        status: 'fail',
        duration: 0,
        message: 'Performance test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

async function testDatabaseQueryPerformance() {
  console.log('\n🗄️ Testing Database Query Performance...');
  
  try {
    const { PrismaClient } = require('@prisma/client');
    const prisma = new PrismaClient();
    
    const queries = [
      { name: 'User Query', fn: () => prisma.user.findMany({ take: 10 }) },
      { name: 'Feedback Query', fn: () => prisma.feedback.findMany({ take: 10 }) },
      { name: 'Workspace Query', fn: () => prisma.workspace.findMany({ take: 10 }) },
      { name: 'Complex Join Query', fn: () => prisma.feedback.findMany({ 
        include: { themes: { include: { theme: true } } },
        take: 10 
      })}
    ];

    for (const query of queries) {
      const startTime = Date.now();
      
      try {
        await query.fn();
        const duration = Date.now() - startTime;
        
        let status: 'pass' | 'fail' | 'warn';
        let message: string;
        
        if (duration <= 500) {
          status = 'pass';
          message = 'Query performance excellent';
        } else if (duration <= 1000) {
          status = 'warn';
          message = 'Query performance acceptable but could be optimized';
        } else {
          status = 'fail';
          message = 'Query performance needs optimization';
        }
        
        addResult({
          name: `DB: ${query.name}`,
          status,
          duration,
          message,
          details: `Query took ${duration}ms`
        });
      } catch (error) {
        addResult({
          name: `DB: ${query.name}`,
          status: 'fail',
          duration: 0,
          message: 'Query failed',
          details: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    await prisma.$disconnect();
  } catch (error) {
    addResult({
      name: 'Database Query Performance',
      status: 'fail',
      duration: 0,
      message: 'Database performance test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testConcurrentRequests() {
  console.log('\n🔄 Testing Concurrent Request Handling...');
  
  try {
    const concurrentLevels = [1, 5, 10, 20];
    
    for (const level of concurrentLevels) {
      const startTime = Date.now();
      
      const requests = Array(level).fill(null).map(() => 
        fetch(`${baseUrl}/api/health`)
      );
      
      await Promise.all(requests);
      const duration = Date.now() - startTime;
      const avgDuration = duration / level;
      
      let status: 'pass' | 'fail' | 'warn';
      let message: string;
      
      if (avgDuration <= 1000) {
        status = 'pass';
        message = 'Handles concurrent requests well';
      } else if (avgDuration <= 2000) {
        status = 'warn';
        message = 'Concurrent request handling acceptable';
      } else {
        status = 'fail';
        message = 'Struggles with concurrent requests';
      }
      
      addResult({
        name: `Concurrent: ${level} requests`,
        status,
        duration,
        message,
        details: `Average: ${avgDuration.toFixed(0)}ms per request`
      });
    }
  } catch (error) {
    addResult({
      name: 'Concurrent Request Handling',
      status: 'fail',
      duration: 0,
      message: 'Concurrent request test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testMemoryUsage() {
  console.log('\n💾 Testing Memory Usage...');
  
  try {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const initialMemory = process.memoryUsage();
      
      // Simulate some workload
      const largeArray = new Array(1000000).fill('test data');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);
      
      let status: 'pass' | 'fail' | 'warn';
      let message: string;
      
      if (memoryIncreaseMB < 50) {
        status = 'pass';
        message = 'Memory usage within acceptable limits';
      } else if (memoryIncreaseMB < 100) {
        status = 'warn';
        message = 'Memory usage higher than expected';
      } else {
        status = 'fail';
        message = 'Memory usage too high';
      }
      
      addResult({
        name: 'Memory Usage',
        status,
        duration: 0,
        message,
        details: `Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`
      });
      
      // Clean up
      largeArray.length = 0;
    } else {
      addResult({
        name: 'Memory Usage',
        status: 'skip',
        duration: 0,
        message: 'Memory usage testing not available in this environment'
      });
    }
  } catch (error) {
    addResult({
      name: 'Memory Usage',
      status: 'fail',
      duration: 0,
      message: 'Memory usage test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testRateLimitingPerformance() {
  console.log('\n🚦 Testing Rate Limiting Performance...');
  
  try {
    const startTime = Date.now();
    
    // Make rapid requests to test rate limiting
    const requests = Array(20).fill(null).map((_, i) => 
      fetch(`${baseUrl}/api/auth/login/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: `test${i}@example.com`,
          password: 'test123',
          targetRole: 'ADMIN'
        })
      })
    );
    
    const responses = await Promise.all(requests);
    const duration = Date.now() - startTime;
    
    const rateLimitedCount = responses.filter(r => r.status === 429).length;
    
    let status: 'pass' | 'fail' | 'warn';
    let message: string;
    
    if (rateLimitedCount > 0 && rateLimitedCount < 20) {
      status = 'pass';
      message = 'Rate limiting working effectively';
    } else if (rateLimitedCount === 0) {
      status = 'warn';
      message = 'Rate limiting may not be configured';
    } else {
      status = 'fail';
      message = 'Rate limiting too aggressive';
    }
    
    addResult({
      name: 'Rate Limiting Performance',
      status,
      duration,
      message,
      details: `${rateLimitedCount}/20 requests rate limited, ${duration}ms total`
    });
  } catch (error) {
    addResult({
      name: 'Rate Limiting Performance',
      status: 'fail',
      duration: 0,
      message: 'Rate limiting test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testBuildOptimization() {
  console.log('\n🏗️ Testing Build Optimization...');
  
  try {
    const { readFileSync, existsSync } = require('fs');
    const { resolve } = require('path');
    
    const buildDir = resolve(process.cwd(), '.next');
    
    if (!existsSync(buildDir)) {
      addResult({
        name: 'Build Optimization',
        status: 'fail',
        duration: 0,
        message: 'Build directory not found',
        details: 'Run `npm run build` first'
      });
      return;
    }
    
    // Check for optimized chunks
    const staticChunks = existsSync(resolve(buildDir, 'static'));
    const serverChunks = existsSync(resolve(buildDir, 'server'));
    
    if (staticChunks && serverChunks) {
      addResult({
        name: 'Build Optimization',
        status: 'pass',
        duration: 0,
        message: 'Build properly optimized',
        details: 'Static and server chunks present'
      });
    } else {
      addResult({
        name: 'Build Optimization',
        status: 'warn',
        duration: 0,
        message: 'Build may not be fully optimized',
        details: `Static: ${staticChunks}, Server: ${serverChunks}`
      });
    }
  } catch (error) {
    addResult({
      name: 'Build Optimization',
      status: 'fail',
      duration: 0,
      message: 'Build optimization test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function main() {
  console.log('🧪 Project LOOP Performance Testing Suite\n');
  console.log('=========================================\n');
  console.log(`Testing against: ${baseUrl}\n`);

  try {
    await testAPIResponseTimes();
    await testDatabaseQueryPerformance();
    await testConcurrentRequests();
    await testMemoryUsage();
    await testRateLimitingPerformance();
    await testBuildOptimization();
  } catch (error) {
    console.error('\n❌ Performance testing failed:', error);
  }

  console.log('\n=========================================');
  console.log('📊 Performance Test Results\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`📋 Total: ${results.length}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

  if (failed > 0) {
    console.log('❌ Performance tests failed. Critical performance issues detected.');
    console.log('\nFailed tests:');
    results.filter(r => r.status === 'fail').forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  Performance tests passed with warnings. Review optimization opportunities.');
    console.log('\nWarnings:');
    results.filter(r => r.status === 'warn').forEach(r => {
      console.log(`  - ${r.name}: ${r.details}`);
    });
    process.exit(0);
  } else {
    console.log('✅ All performance tests passed! System is well-optimized.');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Performance test suite failed:', error);
  process.exit(1);
});