const http = require('http');
const { app } = require('../index');
const axios = require('axios');

async function testEndpoints() {
  console.log('--- TESTING LIVE EXPRESS ENDPOINTS ---');
  const TEST_PORT = 10005;
  const server = app.listen(TEST_PORT, async () => {
    try {
      const base = `http://127.0.0.1:${TEST_PORT}`;

      // 1. Test /status
      console.log('\nTesting GET /status...');
      const statusRes = await axios.get(`${base}/status`);
      console.log('Status Response:');
      console.log('HTTP Status:', statusRes.status);
      console.log('brand:', statusRes.data.brand);
      console.log('facebookLegDown:', statusRes.data.facebookLegDown);
      console.log('lastDispatch:', statusRes.data.lastDispatch);
      console.log('runLock:', statusRes.data.runLock);
      console.log('activeCardTemplate:', statusRes.data.activeCardTemplate);

      // 2. Test /audit
      console.log('\nTesting GET /audit...');
      const auditRes = await axios.get(`${base}/audit`);
      console.log('Audit Response:');
      console.log('HTTP Status:', auditRes.status);
      console.log('allFeedsHealthy:', auditRes.data.allFeedsHealthy);
      console.log('feedsCount:', auditRes.data.feedsCount);
      auditRes.data.feeds.forEach(f => {
        console.log(`- [${f.status}] ${f.name} (${f.itemsCount} items, ${f.latencyMs}ms)`);
      });

      // 3. Test /templates (json)
      console.log('\nTesting GET /templates?json=true...');
      const tmplRes = await axios.get(`${base}/templates?json=true`);
      console.log('Templates Response:');
      console.log('Available Templates:', Object.keys(tmplRes.data.availableTemplates));
      console.log('Includes photo-dominant:', !!tmplRes.data.availableTemplates['photo-dominant']);

      console.log('\nALL ENDPOINTS RESPONDED WITH 200 OK & VALID DATA!');
      server.close();
      return true;
    } catch (err) {
      console.error('Endpoint Test Failed:', err.message);
      if (err.response) console.error('Response data:', err.response.data);
      server.close();
      process.exitCode = 1;
      return false;
    }
  });
}

testEndpoints();
