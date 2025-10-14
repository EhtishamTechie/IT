/**
 * Simple test page to verify GTM analytics integration
 * Open this in browser console to test GTM dataLayer
 */

// Test 1: Check if GTM dataLayer exists
console.log('🧪 Testing GTM Analytics Integration');
console.log('================================');

// Check if dataLayer is available
if (typeof window !== 'undefined' && window.dataLayer) {
  console.log('✅ GTM dataLayer is available');
  console.log('Current dataLayer:', window.dataLayer);
} else {
  console.log('❌ GTM dataLayer is NOT available');
}

// Test 2: Push a test event
if (window.dataLayer) {
  window.dataLayer.push({
    event: 'test_event',
    test_parameter: 'analytics_test',
    timestamp: new Date().toISOString()
  });
  console.log('✅ Test event pushed to dataLayer');
}

// Test 3: Check GTM container loading
const gtmScript = document.querySelector('script[src*="googletagmanager.com/gtm.js"]');
if (gtmScript) {
  console.log('✅ GTM script is loaded');
} else {
  console.log('❌ GTM script is NOT loaded');
}

// Test 4: Check if GTM container ID is correct
const gtmContainer = 'GTM-K55PGMBD';
if (gtmScript && gtmScript.src.includes(gtmContainer)) {
  console.log('✅ GTM Container ID is correct:', gtmContainer);
} else {
  console.log('❌ GTM Container ID issue');
}

console.log('================================');
console.log('💡 Next steps:');
console.log('1. Check if events appear in GTM Preview mode');
console.log('2. Verify GA4 tags are configured in your GTM container');
console.log('3. Check GA4 Real-time reports for data');

export default {
  testDataLayer: () => {
    if (window.dataLayer) {
      window.dataLayer.push({
        event: 'manual_test',
        test_type: 'manual_verification',
        timestamp: new Date().toISOString()
      });
      console.log('🎯 Manual test event sent to GTM');
    }
  }
};