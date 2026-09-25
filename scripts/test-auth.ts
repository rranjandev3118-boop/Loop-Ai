#!/usr/bin/env tsx
/**
 * Authentication Flow Testing Script
 * Tests login, signup, role verification, and session management
 */

import { config } from 'dotenv';

// Load environment variables
config();

const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

interface TestResult {
  name: string;
  status: 'pass' | 'fail' | 'skip' | 'warn';
  message: string;
  details?: string;
}

const results: TestResult[] = [];

function addResult(result: TestResult) {
  results.push(result);
  const emoji = result.status === 'pass' ? '✅' : result.status === 'fail' ? '❌' : result.status === 'warn' ? '⚠️' : '⏭️';
  console.log(`${emoji} ${result.name}: ${result.message}`);
  if (result.details) {
    console.log(`   ${result.details}`);
  }
}

async function testLoginRequest() {
  console.log('\n🔐 Testing Login Request Flow...');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login/request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@loop.demo',
        password: 'ChangeMe123!',
        targetRole: 'ADMIN'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Login request failed: ${data.error || 'Unknown error'}`);
    }

    addResult({
      name: 'Login Request',
      status: 'pass',
      message: 'Login request endpoint working',
      details: data.requiresOtp ? 'OTP required' : 'Already verified'
    });

    return data;
  } catch (error) {
    addResult({
      name: 'Login Request',
      status: 'fail',
      message: 'Login request failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
    throw error;
  }
}

async function testOTPResend() {
  console.log('\n📧 Testing OTP Resend...');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/login/resend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@loop.demo'
      })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(`OTP resend failed: ${data.error || 'Unknown error'}`);
    }

    addResult({
      name: 'OTP Resend',
      status: 'pass',
      message: 'OTP resend endpoint working'
    });
  } catch (error) {
    addResult({
      name: 'OTP Resend',
      status: 'fail',
      message: 'OTP resend failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testRoleVerification() {
  console.log('\n👤 Testing Role Verification...');
  
  try {
    const response = await fetch(`${baseUrl}/api/auth/verify-role`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetRole: 'ADMIN'
      })
    });

    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(`Role verification failed: ${data.error || 'Unknown error'}`);
    }

    addResult({
      name: 'Role Verification',
      status: 'pass',
      message: 'Role verification endpoint working',
      details: `Verified role: ${data.role}`
    });
  } catch (error) {
    addResult({
      name: 'Role Verification',
      status: 'fail',
      message: 'Role verification failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testSessionManagement() {
  console.log('\n🍪 Testing Session Management...');
  
  try {
    // Test NextAuth configuration endpoint
    const response = await fetch(`${baseUrl}/api/auth/[...nextauth]`, {
      method: 'GET'
    });

    if (response.ok || response.status === 405) {
      addResult({
        name: 'Session Management',
        status: 'pass',
        message: 'NextAuth endpoint accessible'
      });
    } else {
      throw new Error('NextAuth endpoint not accessible');
    }
  } catch (error) {
    addResult({
      name: 'Session Management',
      status: 'fail',
      message: 'Session management test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testProtectedEndpoints() {
  console.log('\n🔒 Testing Protected Endpoints...');
  
  const protectedEndpoints = [
    '/api/feedback',
    '/api/reports',
    '/api/workspace/members',
    '/api/audit-logs'
  ];

  for (const endpoint of protectedEndpoints) {
    try {
      const response = await fetch(`${baseUrl}${endpoint}`);
      
      if (response.status === 401) {
        addResult({
          name: `Protected: ${endpoint}`,
          status: 'pass',
          message: 'Endpoint properly protected',
          details: 'Returns 401 without authentication'
        });
      } else {
        addResult({
          name: `Protected: ${endpoint}`,
          status: 'fail',
          message: 'Endpoint not properly protected',
          details: `Expected 401, got ${response.status}`
        });
      }
    } catch (error) {
      addResult({
        name: `Protected: ${endpoint}`,
        status: 'fail',
        message: 'Endpoint test failed',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

async function testRateLimiting() {
  console.log('\n⚡ Testing Rate Limiting...');
  
  try {
    // Make multiple rapid requests to test rate limiting
    const requests = Array(15).fill(null).map(() => 
      fetch(`${baseUrl}/api/auth/login/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'test@example.com',
          password: 'test123',
          targetRole: 'ADMIN'
        })
      })
    );

    const responses = await Promise.all(requests);
    const rateLimited = responses.some(r => r.status === 429);

    if (rateLimited) {
      addResult({
        name: 'Rate Limiting',
        status: 'pass',
        message: 'Rate limiting is working',
        details: 'Received 429 status after multiple requests'
      });
    } else {
      addResult({
        name: 'Rate Limiting',
        status: 'warn',
        message: 'Rate limiting may not be configured',
        details: 'No 429 responses received'
      });
    }
  } catch (error) {
    addResult({
      name: 'Rate Limiting',
      status: 'fail',
      message: 'Rate limiting test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testSignupFlow() {
  console.log('\n📝 Testing Signup Flow...');
  
  try {
    const testEmail = `test-user-${Date.now()}@example.com`;
    
    const response = await fetch(`${baseUrl}/api/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test User',
        email: testEmail,
        password: 'TestPassword123!',
        workspaceName: 'Test Workspace',
        action: 'request'
      })
    });

    const data = await response.json();
    
    if (response.ok || response.status === 202) {
      addResult({
        name: 'Signup Flow',
        status: 'pass',
        message: 'Signup endpoint working',
        details: data.requiresOtp ? 'OTP flow initiated' : 'Signup successful'
      });
    } else {
      addResult({
        name: 'Signup Flow',
        status: 'fail',
        message: 'Signup endpoint failed',
        details: data.error || 'Unknown error'
      });
    }
  } catch (error) {
    addResult({
      name: 'Signup Flow',
      status: 'fail',
      message: 'Signup flow test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function testSecurityHeaders() {
  console.log('\n🛡️ Testing Security Headers...');
  
  try {
    const response = await fetch(`${baseUrl}/api/health`);
    
    const securityHeaders = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Strict-Transport-Security'
    ];

    let missingHeaders: string[] = [];
    
    for (const header of securityHeaders) {
      if (!response.headers.get(header)) {
        missingHeaders.push(header);
      }
    }

    if (missingHeaders.length === 0) {
      addResult({
        name: 'Security Headers',
        status: 'pass',
        message: 'All security headers present'
      });
    } else {
      addResult({
        name: 'Security Headers',
        status: 'warn',
        message: 'Some security headers missing',
        details: `Missing: ${missingHeaders.join(', ')}`
      });
    }
  } catch (error) {
    addResult({
      name: 'Security Headers',
      status: 'fail',
      message: 'Security headers test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function main() {
  console.log('🧪 Project LOOP Authentication Testing Suite\n');
  console.log('===========================================\n');
  console.log(`Testing against: ${baseUrl}\n`);

  try {
    await testLoginRequest();
    await testOTPResend();
    await testRoleVerification();
    await testSessionManagement();
    await testProtectedEndpoints();
    await testRateLimiting();
    await testSignupFlow();
    await testSecurityHeaders();
  } catch (error) {
    console.error('\n❌ Authentication testing failed:', error);
  }

  console.log('\n===========================================');
  console.log('📊 Authentication Test Results\n');

  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const warned = results.filter(r => r.status === 'warn').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⚠️  Warnings: ${warned}`);
  console.log(`📋 Total: ${results.length}\n`);

  if (failed > 0) {
    console.log('❌ Authentication tests failed. Please fix the issues above.');
    process.exit(1);
  } else if (warned > 0) {
    console.log('⚠️  Authentication tests passed with warnings.');
    process.exit(0);
  } else {
    console.log('✅ All authentication tests passed!');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('❌ Authentication test suite failed:', error);
  process.exit(1);
});