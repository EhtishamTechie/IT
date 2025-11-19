// Test script for dynamic rendering
const http = require('http');

// Test 1: As Googlebot
const testAsBot = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== TEST 1: AS GOOGLEBOT ===');
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Has product HTML:', data.includes('product-item') || data.includes('Products'));
        console.log('Has categories:', data.includes('categories'));
        console.log('First 500 chars:', data.substring(0, 500));
        resolve(data);
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Test 2: As regular browser
const testAsUser = () => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: '/',
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        console.log('\n=== TEST 2: AS REGULAR BROWSER ===');
        console.log('Status:', res.statusCode);
        console.log('Content-Type:', res.headers['content-type']);
        console.log('Has React root:', data.includes('id="root"'));
        console.log('First 500 chars:', data.substring(0, 500));
        resolve(data);
      });
    });

    req.on('error', reject);
    req.end();
  });
};

// Run tests
(async () => {
  try {
    await testAsBot();
    await testAsUser();
    console.log('\n✅ Tests completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
})();
