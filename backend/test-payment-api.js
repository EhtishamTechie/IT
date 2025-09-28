// Simple test for payment accounts API
const fs = require('fs');
const path = require('path');

// Test configuration
const API_URL = 'http://localhost:3001/api/payment-accounts/active';

// Simple HTTP request without external dependencies
const http = require('http');
const { URL } = require('url');

function makeRequest(url) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || 80,
      path: urlObj.pathname + urlObj.search,
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          data: data
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    req.end();
  });
}

// Test the API
console.log('🧪 Testing Payment Accounts API...');
console.log('📡 Endpoint:', API_URL);

makeRequest(API_URL)
  .then(response => {
    console.log('✅ API Test Results:');
    console.log('📊 Status Code:', response.statusCode);
    console.log('📋 Response Data:', response.data);
    
    if (response.statusCode === 200) {
      try {
        const jsonData = JSON.parse(response.data);
        console.log('✅ Valid JSON response received');
        console.log('📊 Payment Accounts Found:', jsonData.data ? jsonData.data.length : 0);
      } catch (e) {
        console.log('❌ Response is not valid JSON');
      }
    } else {
      console.log('❌ API returned error status code');
    }
  })
  .catch(error => {
    console.log('❌ API Test Failed:');
    console.log('🔥 Error:', error.message);
  });