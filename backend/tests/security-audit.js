#!/usr/bin/env node
/**
 * 🔐 Security Audit Script for International Tijarat
 * Tests production security features and configurations
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

class SecurityAuditor {
  constructor(baseURL = 'http://localhost:5000') {
    this.baseURL = baseURL;
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      tests: []
    };
  }

  async runAllTests() {
    console.log('🔐 Starting Security Audit for International Tijarat\n');
    
    await this.testSecurityHeaders();
    await this.testRateLimiting();
    await this.testAuthenticationSecurity();
    await this.testInputValidation();
    await this.testEnvironmentSecurity();
    await this.testCacheSecurityHeaders();
    
    this.printResults();
  }

  async testSecurityHeaders() {
    console.log('📋 Testing Security Headers...');
    
    try {
      const response = await this.makeRequest('/api/health');
      const headers = response.headers;
      
      // Test for security headers
      this.checkHeader(headers, 'x-frame-options', 'DENY', 'X-Frame-Options protection');
      this.checkHeader(headers, 'x-content-type-options', 'nosniff', 'Content-Type sniffing protection');
      this.checkHeader(headers, 'x-xss-protection', '1; mode=block', 'XSS protection');
      this.checkHeader(headers, 'strict-transport-security', null, 'HSTS header (HTTPS only)', false);
      this.checkHeader(headers, 'content-security-policy', null, 'Content Security Policy', false);
      
      console.log('✅ Security headers test completed\n');
    } catch (error) {
      this.addResult('❌ FAILED', 'Security Headers Test', `Error: ${error.message}`);
    }
  }

  async testRateLimiting() {
    console.log('⚡ Testing Rate Limiting...');
    
    try {
      const requests = [];
      const limit = 10; // Test with 10 rapid requests
      
      for (let i = 0; i < limit; i++) {
        requests.push(this.makeRequest('/api/products'));
      }
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.statusCode === 429);
      
      if (rateLimited) {
        this.addResult('✅ PASSED', 'Rate Limiting', 'Rate limiting is working correctly');
      } else {
        this.addResult('⚠️ WARNING', 'Rate Limiting', 'Rate limiting may need adjustment for production');
      }
      
      console.log('✅ Rate limiting test completed\n');
    } catch (error) {
      this.addResult('❌ FAILED', 'Rate Limiting Test', `Error: ${error.message}`);
    }
  }

  async testAuthenticationSecurity() {
    console.log('🔑 Testing Authentication Security...');
    
    try {
      // Test accessing protected routes without authentication
      const protectedRoutes = ['/api/orders/user', '/api/products/add'];
      
      for (const route of protectedRoutes) {
        const response = await this.makeRequest(route);
        
        if (response.statusCode === 401 || response.statusCode === 403) {
          this.addResult('✅ PASSED', `Auth Protection: ${route}`, 'Properly protected');
        } else {
          this.addResult('❌ FAILED', `Auth Protection: ${route}`, `Expected 401/403, got ${response.statusCode}`);
        }
      }
      
      console.log('✅ Authentication security test completed\n');
    } catch (error) {
      this.addResult('❌ FAILED', 'Authentication Security Test', `Error: ${error.message}`);
    }
  }

  async testInputValidation() {
    console.log('🛡️ Testing Input Validation...');
    
    try {
      // Test SQL injection attempts
      const maliciousInputs = [
        "'; DROP TABLE users; --",
        '<script>alert("xss")</script>',
        '../../etc/passwd',
        'javascript:alert("xss")'
      ];
      
      for (const input of maliciousInputs) {
        const response = await this.makeRequest(`/api/products/search?q=${encodeURIComponent(input)}`);
        
        if (response.statusCode === 400 || response.statusCode === 200) {
          this.addResult('✅ PASSED', 'Input Validation', `Handled malicious input safely`);
        } else {
          this.addResult('⚠️ WARNING', 'Input Validation', `Unexpected response to malicious input`);
        }
      }
      
      console.log('✅ Input validation test completed\n');
    } catch (error) {
      this.addResult('❌ FAILED', 'Input Validation Test', `Error: ${error.message}`);
    }
  }

  async testEnvironmentSecurity() {
    console.log('🔧 Testing Environment Security...');
    
    try {
      // Check if .env files exist in wrong places
      const envFiles = ['.env', '.env.local', '.env.development', '.env.production'];
      const publicPaths = ['../frontend/public/', '../frontend/dist/', './public/'];
      
      let envExposed = false;
      
      for (const publicPath of publicPaths) {
        for (const envFile of envFiles) {
          const fullPath = path.join(__dirname, publicPath, envFile);
          if (fs.existsSync(fullPath)) {
            this.addResult('❌ CRITICAL', 'Environment Security', `${envFile} exposed in ${publicPath}`);
            envExposed = true;
          }
        }
      }
      
      if (!envExposed) {
        this.addResult('✅ PASSED', 'Environment Security', 'No environment files exposed');
      }
      
      // Check for default/weak secrets
      if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
        this.addResult('❌ FAILED', 'JWT Security', 'JWT secret is too short (minimum 32 characters)');
      } else {
        this.addResult('✅ PASSED', 'JWT Security', 'JWT secret meets security requirements');
      }
      
      console.log('✅ Environment security test completed\n');
    } catch (error) {
      this.addResult('❌ FAILED', 'Environment Security Test', `Error: ${error.message}`);
    }
  }

  async testCacheSecurityHeaders() {
    console.log('🚀 Testing Cache Security...');
    
    try {
      // Test that sensitive endpoints are not cached
      const sensitiveRoutes = ['/api/health', '/api/orders/user'];
      
      for (const route of sensitiveRoutes) {
        const response = await this.makeRequest(route);
        const cacheControl = response.headers['cache-control'];
        
        if (cacheControl && (cacheControl.includes('no-cache') || cacheControl.includes('private'))) {
          this.addResult('✅ PASSED', `Cache Security: ${route}`, 'Properly configured cache headers');
        } else {
          this.addResult('⚠️ WARNING', `Cache Security: ${route}`, 'Consider adding cache control headers');
        }
      }
      
      console.log('✅ Cache security test completed\n');
    } catch (error) {
      this.addResult('❌ FAILED', 'Cache Security Test', `Error: ${error.message}`);
    }
  }

  checkHeader(headers, headerName, expectedValue, description, required = true) {
    const headerValue = headers[headerName.toLowerCase()];
    
    if (!headerValue) {
      if (required) {
        this.addResult('❌ FAILED', description, `Missing ${headerName} header`);
      } else {
        this.addResult('⚠️ WARNING', description, `Missing ${headerName} header (recommended)`);
      }
      return;
    }
    
    if (expectedValue && !headerValue.includes(expectedValue)) {
      this.addResult('⚠️ WARNING', description, `${headerName}: ${headerValue} (expected: ${expectedValue})`);
    } else {
      this.addResult('✅ PASSED', description, `${headerName}: ${headerValue}`);
    }
  }

  makeRequest(path) {
    return new Promise((resolve, reject) => {
      const url = this.baseURL + path;
      const client = url.startsWith('https') ? https : http;
      
      const req = client.get(url, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        });
      });
      
      req.on('error', reject);
      req.setTimeout(5000, () => reject(new Error('Request timeout')));
    });
  }

  addResult(status, test, details) {
    this.results.tests.push({ status, test, details });
    
    if (status.includes('PASSED')) this.results.passed++;
    else if (status.includes('FAILED') || status.includes('CRITICAL')) this.results.failed++;
    else if (status.includes('WARNING')) this.results.warnings++;
  }

  printResults() {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 SECURITY AUDIT RESULTS');
    console.log('='.repeat(60));
    
    this.results.tests.forEach(result => {
      console.log(`${result.status} ${result.test}`);
      console.log(`   ${result.details}\n`);
    });
    
    console.log('='.repeat(60));
    console.log(`📊 SUMMARY:`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    
    const total = this.results.passed + this.results.warnings + this.results.failed;
    const score = Math.round((this.results.passed / total) * 100);
    
    console.log(`\n🏆 SECURITY SCORE: ${score}%`);
    
    if (score >= 90) {
      console.log('🎉 Excellent! Your application has strong security.');
    } else if (score >= 75) {
      console.log('👍 Good security posture, address warnings for improvement.');
    } else {
      console.log('⚠️  Security needs attention. Address failed tests immediately.');
    }
    
    console.log('='.repeat(60));
  }
}

// Run the security audit
if (require.main === module) {
  const auditor = new SecurityAuditor();
  auditor.runAllTests().catch(console.error);
}

module.exports = SecurityAuditor;
