/**
 * Test: use Puppeteer to log in to the router and update PPPoE credentials.
 * Run: node test_router.js
 */
const { updatePPPoECredentials } = require('./src/router');

const routerConfig = {
  url: 'http://192.168.0.1',
  password: 'room304',        // ← your router's local admin password
};

// Test: switch to this university account
const testUsername = 'tahsanlihan';
const testPassword = 'Tahhan65';

console.log('Starting Puppeteer router test...');
console.log(`Will set PPPoE: ${testUsername} / ${testPassword}`);
console.log('This will take ~15 seconds...\n');

updatePPPoECredentials(routerConfig, testUsername, testPassword)
  .then(result => {
    console.log('\nResult:', JSON.stringify(result, null, 2));
    if (result.success) {
      console.log('✅ SUCCESS! Router PPPoE credentials updated.');
    } else {
      console.log('❌ FAILED:', result.error);
    }
    process.exit(0);
  })
  .catch(err => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
