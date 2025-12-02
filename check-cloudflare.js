#!/usr/bin/env node

/**
 * Cloudflare CDN Diagnostic Script
 * Checks if Cloudflare is working properly and provides optimization recommendations
 */

const https = require('https');
const http = require('http');

const DOMAIN = 'internationaltijarat.com';
const TEST_URLS = [
  '/',
  '/api/homepage/all-data',
  '/uploads/homepage-cards/card-1.jpeg',
  '/uploads/products/example.jpg',
  '/assets/js/index.eAcCu3bd.js',
  '/assets/css/index.D4elmAM_.css'
];

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function checkUrl(url) {
  return new Promise((resolve) => {
    const fullUrl = `https://${DOMAIN}${url}`;
    
    https.get(fullUrl, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const headers = res.headers;
        resolve({
          url,
          statusCode: res.statusCode,
          headers,
          size: data.length
        });
      });
    }).on('error', (err) => {
      resolve({
        url,
        error: err.message
      });
    });
  });
}

function analyzeHeaders(result) {
  const { url, headers, statusCode, size, error } = result;
  
  if (error) {
    return {
      url,
      status: '❌ ERROR',
      message: error,
      score: 0
    };
  }

  const analysis = {
    url,
    statusCode,
    size: `${(size / 1024).toFixed(2)} KB`,
    checks: {}
  };

  // Check 1: Cloudflare is active
  const cfRay = headers['cf-ray'];
  const cfCacheStatus = headers['cf-cache-status'];
  const server = headers['server'];
  
  analysis.checks.cloudflareActive = {
    pass: !!(cfRay || server === 'cloudflare'),
    value: cfRay ? `✅ Yes (CF-Ray: ${cfRay})` : '❌ No Cloudflare headers detected',
    critical: true
  };

  // Check 2: Cache status
  if (cfCacheStatus) {
    const isGood = ['HIT', 'REVALIDATED', 'UPDATING'].includes(cfCacheStatus);
    analysis.checks.cacheStatus = {
      pass: isGood,
      value: isGood ? `✅ ${cfCacheStatus}` : `⚠️ ${cfCacheStatus}`,
      critical: true,
      explanation: getCacheStatusExplanation(cfCacheStatus)
    };
  } else {
    analysis.checks.cacheStatus = {
      pass: false,
      value: '❌ No CF-Cache-Status header',
      critical: true,
      explanation: 'Cloudflare may not be proxying this request'
    };
  }

  // Check 3: Compression
  const contentEncoding = headers['content-encoding'];
  analysis.checks.compression = {
    pass: !!(contentEncoding && (contentEncoding.includes('br') || contentEncoding.includes('gzip'))),
    value: contentEncoding ? `✅ ${contentEncoding}` : '⚠️ No compression',
    critical: false,
    explanation: contentEncoding?.includes('br') ? 'Brotli (best)' : contentEncoding?.includes('gzip') ? 'Gzip (good)' : 'Enable compression for better performance'
  };

  // Check 4: Cache-Control headers
  const cacheControl = headers['cache-control'];
  analysis.checks.cacheControl = {
    pass: !!cacheControl,
    value: cacheControl || '❌ Missing',
    critical: false,
    explanation: cacheControl ? 'Present' : 'Add Cache-Control headers in backend'
  };

  // Check 5: HTTP/2 or HTTP/3
  const httpVersion = headers[':status'] ? 'HTTP/2+' : 'HTTP/1.1';
  analysis.checks.httpVersion = {
    pass: httpVersion.includes('HTTP/2'),
    value: httpVersion,
    critical: false,
    explanation: httpVersion.includes('HTTP/2') ? 'Good! Using modern protocol' : 'Enable HTTP/2 in Cloudflare'
  };

  // Check 6: Security headers
  const securityHeaders = {
    'x-content-type-options': headers['x-content-type-options'],
    'x-frame-options': headers['x-frame-options'],
    'strict-transport-security': headers['strict-transport-security']
  };
  
  const hasSecurityHeaders = Object.values(securityHeaders).some(v => v);
  analysis.checks.securityHeaders = {
    pass: hasSecurityHeaders,
    value: hasSecurityHeaders ? '✅ Present' : '⚠️ Missing',
    critical: false,
    explanation: hasSecurityHeaders ? 'Good security posture' : 'Consider adding security headers'
  };

  // Check 7: Age header (indicates cached response)
  const age = headers['age'];
  if (age) {
    analysis.checks.age = {
      pass: parseInt(age) > 0,
      value: `✅ ${age}s (cached response)`,
      critical: false,
      explanation: 'This response was served from cache'
    };
  }

  return analysis;
}

function getCacheStatusExplanation(status) {
  const explanations = {
    'HIT': '✅ Perfect! Served from Cloudflare cache (fastest)',
    'MISS': '⚠️ Not in cache yet. Will be cached after a few requests',
    'EXPIRED': '⚠️ Cache expired. Check your cache TTL settings',
    'BYPASS': '❌ Caching bypassed. Check your Page Rules and Cache settings',
    'DYNAMIC': '⚠️ Dynamic content. Consider if this should be cached',
    'REVALIDATED': '✅ Cache revalidated successfully',
    'UPDATING': '✅ Cache is being updated in background',
    'STALE': '⚠️ Serving stale content. Check origin server'
  };
  return explanations[status] || 'Unknown cache status';
}

function calculateScore(analysis) {
  let score = 0;
  let total = 0;
  
  Object.values(analysis.checks).forEach(check => {
    if (check.critical) {
      total += 2;
      score += check.pass ? 2 : 0;
    } else {
      total += 1;
      score += check.pass ? 1 : 0;
    }
  });
  
  return total > 0 ? Math.round((score / total) * 100) : 0;
}

function printReport(results) {
  console.log(`\n${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}   CLOUDFLARE CDN DIAGNOSTIC REPORT - ${DOMAIN}${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  results.forEach((analysis, index) => {
    const score = calculateScore(analysis);
    const scoreColor = score >= 80 ? colors.green : score >= 60 ? colors.yellow : colors.red;
    
    console.log(`${colors.bright}${index + 1}. ${analysis.url}${colors.reset}`);
    console.log(`   Status: ${analysis.statusCode} | Size: ${analysis.size} | Score: ${scoreColor}${score}%${colors.reset}`);
    console.log('');

    Object.entries(analysis.checks).forEach(([key, check]) => {
      const icon = check.pass ? '✅' : (check.critical ? '❌' : '⚠️');
      console.log(`   ${icon} ${key}: ${check.value}`);
      if (check.explanation) {
        console.log(`      ${colors.cyan}→ ${check.explanation}${colors.reset}`);
      }
    });
    console.log('');
  });

  // Overall summary
  const avgScore = Math.round(results.reduce((sum, r) => sum + calculateScore(r), 0) / results.length);
  const scoreColor = avgScore >= 80 ? colors.green : avgScore >= 60 ? colors.yellow : colors.red;
  
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.bright}OVERALL CLOUDFLARE SCORE: ${scoreColor}${avgScore}%${colors.reset}`);
  console.log(`${colors.bright}${colors.cyan}═══════════════════════════════════════════════════════════════${colors.reset}\n`);

  // Recommendations
  console.log(`${colors.bright}${colors.yellow}📋 RECOMMENDATIONS:${colors.reset}\n`);

  const allAnalyses = results.flatMap(r => Object.entries(r.checks));
  const failedCritical = allAnalyses.filter(([_, check]) => check.critical && !check.pass);
  const failedNonCritical = allAnalyses.filter(([_, check]) => !check.critical && !check.pass);

  if (failedCritical.length === 0 && failedNonCritical.length === 0) {
    console.log(`${colors.green}✅ Everything looks great! Cloudflare is configured optimally.${colors.reset}\n`);
  } else {
    if (failedCritical.length > 0) {
      console.log(`${colors.red}${colors.bright}🚨 CRITICAL ISSUES:${colors.reset}`);
      console.log(`1. Cloudflare may not be active or not proxying correctly`);
      console.log(`   → Check DNS: Ensure DNS records have "Proxied" (orange cloud) enabled`);
      console.log(`   → Verify nameservers: Ensure domain uses Cloudflare nameservers`);
      console.log('');
    }

    if (failedNonCritical.length > 0) {
      console.log(`${colors.yellow}⚠️  OPTIMIZATION OPPORTUNITIES:${colors.reset}`);
      
      const recommendations = [];
      
      if (allAnalyses.some(([key, check]) => key === 'compression' && !check.pass)) {
        recommendations.push('Enable Auto Minify in Cloudflare: Speed → Optimization → Auto Minify (HTML, CSS, JS)');
        recommendations.push('Enable Brotli compression: Speed → Optimization → Brotli (should be on by default)');
      }
      
      if (allAnalyses.some(([key, check]) => key === 'cacheStatus' && check.value.includes('MISS'))) {
        recommendations.push('Set up Page Rules for aggressive caching:');
        recommendations.push('  • Rule 1: */uploads/* → Cache Level: Cache Everything, Edge TTL: 1 year');
        recommendations.push('  • Rule 2: */assets/* → Cache Level: Cache Everything, Edge TTL: 1 year');
        recommendations.push('  • Rule 3: /api/* → Cache Level: Cache Everything, Edge TTL: 5 minutes');
      }
      
      if (allAnalyses.some(([key, check]) => key === 'cacheControl' && !check.pass)) {
        recommendations.push('Update backend to send Cache-Control headers (already in middleware/cacheHeaders.js)');
      }
      
      recommendations.forEach((rec, i) => {
        console.log(`${i + 1}. ${rec}`);
      });
      console.log('');
    }
  }

  console.log(`${colors.cyan}💡 Quick Cloudflare Setup Guide:${colors.reset}`);
  console.log(`1. DNS Settings: Ensure records are "Proxied" (orange cloud icon)`);
  console.log(`2. SSL/TLS: Set to "Full" or "Full (strict)" mode`);
  console.log(`3. Speed → Optimization:`);
  console.log(`   • Auto Minify: Enable HTML, CSS, JS`);
  console.log(`   • Brotli: Enable`);
  console.log(`   • Rocket Loader: Off (can break React apps)`);
  console.log(`4. Caching → Configuration:`);
  console.log(`   • Caching Level: Standard`);
  console.log(`   • Browser Cache TTL: Respect Existing Headers`);
  console.log(`5. Caching → Page Rules:`);
  console.log(`   • Add rules for /uploads/*, /assets/*, /api/* (see recommendations above)`);
  console.log(`6. Speed → Optimization → HTTP/3: Enable`);
  console.log(`7. Purge Cache: After making changes, purge "Purge Everything"`);
  console.log('');
}

async function main() {
  console.log(`${colors.cyan}🔍 Testing Cloudflare CDN for ${DOMAIN}...${colors.reset}\n`);
  
  const results = [];
  
  for (const url of TEST_URLS) {
    console.log(`${colors.blue}Testing: ${url}${colors.reset}`);
    const result = await checkUrl(url);
    const analysis = analyzeHeaders(result);
    results.push(analysis);
  }

  printReport(results);
}

main().catch(console.error);
