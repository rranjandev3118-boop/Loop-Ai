#!/usr/bin/env tsx
/**
 * Comprehensive Test Suite Runner
 * Runs all deployment readiness tests in sequence
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface TestSuite {
  name: string;
  command: string;
  description: string;
}

const testSuites: TestSuite[] = [
  {
    name: 'Deployment Check',
    command: 'npm run deploy:check',
    description: 'Validates environment configuration and system readiness'
  },
  {
    name: 'Smoke Tests',
    command: 'npm run test:smoke',
    description: 'Tests critical API endpoints and basic functionality'
  },
  {
    name: 'Authentication Tests',
    command: 'npm run test:auth',
    description: 'Tests authentication flows and security'
  },
  {
    name: 'Multi-Tenant Isolation Tests',
    command: 'npm run test:tenant-isolation',
    description: 'Verifies data isolation between workspaces'
  },
  {
    name: 'Performance Tests',
    command: 'npm run test:performance',
    description: 'Tests API response times and resource usage'
  }
];

async function runTestSuite(suite: TestSuite): Promise<{ success: boolean; output: string }> {
  console.log(`\n🧪 Running: ${suite.name}`);
  console.log(`Description: ${suite.description}`);
  console.log(`Command: ${suite.command}`);
  console.log('─'.repeat(50));

  try {
    const { stdout, stderr } = await execAsync(suite.command);
    const output = stdout + stderr;
    
    console.log(output);
    
    // Check if the test passed (exit code 0)
    return { success: true, output };
  } catch (error: any) {
    const output = error.stdout + error.stderr;
    console.error(output);
    return { success: false, output };
  }
}

async function main() {
  console.log('🚀 Project LOOP - Comprehensive Test Suite Runner\n');
  console.log('===============================================\n');
  console.log('This will run all deployment readiness tests in sequence.\n');

  const results: Array<{ suite: string; success: boolean; duration: number }> = [];
  const startTime = Date.now();

  for (const suite of testSuites) {
    const suiteStartTime = Date.now();
    const { success } = await runTestSuite(suite);
    const suiteDuration = Date.now() - suiteStartTime;
    
    results.push({
      suite: suite.name,
      success,
      duration: suiteDuration
    });

    console.log(`\n${success ? '✅' : '❌'} ${suite.name} completed in ${suiteDuration}ms\n`);
  }

  const totalDuration = Date.now() - startTime;

  console.log('===============================================');
  console.log('📊 Final Test Results\n');

  const passed = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;

  console.log(`✅ Passed: ${passed}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⏱️  Total Duration: ${totalDuration}ms\n`);

  console.log('Detailed Results:');
  results.forEach(result => {
    const status = result.success ? '✅' : '❌';
    console.log(`  ${status} ${result.suite} (${result.duration}ms)`);
  });

  if (failed > 0) {
    console.log('\n❌ Some test suites failed. Please review the output above.');
    console.log('Fix the issues before deploying to production.');
    process.exit(1);
  } else {
    console.log('\n✅ All test suites passed! System is ready for production deployment.');
    console.log('\nNext steps:');
    console.log('1. Review deployment documentation: docs/DEPLOYMENT.md');
    console.log('2. Configure Vercel environment variables');
    console.log('3. Run database migrations');
    console.log('4. Deploy to Vercel');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Test suite runner failed:', error);
  process.exit(1);
});