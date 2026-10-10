const assert = require('assert');
const { renderAdminLoginPage, renderAdminCockpit } = require('../portal/templates/adminCockpit');

console.log('--- RUNNING ADMIN COCKPIT TESTS ---');

// 1. Test Login Page Render
const loginHtml = renderAdminLoginPage('ভুল পাসওয়ার্ড');
assert.ok(loginHtml.includes('জনবার্তা অ্যাডমিন লগইন'), 'Login page must have Bengali title');
assert.ok(loginHtml.includes('ভুল পাসওয়ার্ড'), 'Login page must display error message if passed');
assert.ok(loginHtml.includes('action="/admin/login"'), 'Login form action must be /admin/login');
console.log('✓ Test 1: Admin login page rendered correctly');

// 2. Test Cockpit 5 Panels Render
const mockData = {
  activeTemplate: 'breaking-news',
  holdPosting: false,
  cronStatus: 'ACTIVE',
  keepAliveStatus: 'HEALTHY',
  runs: [
    {
      id: 'run_test_1',
      startedAt: new Date().toISOString(),
      trigger: 'manual',
      status: 'PASS',
      stages: {
        fetch: 'PASS',
        dedup: 'PASS',
        eval: 'PASS',
        sanitizer: 'PASS',
        image: 'PASS',
        card: 'PASS',
        blogger: 'PASS',
        webhook: 'PASS'
      }
    }
  ],
  logs: [
    { timestamp: new Date().toISOString(), level: 'INFO', message: 'Test log entry' }
  ],
  articles: [
    {
      title: 'টেস্ট প্রতিবেদন শিরোনাম',
      category: 'জাতীয়',
      publishedAt: new Date().toISOString(),
      photoUrl: 'https://images.unsplash.com/photo-test',
      bloggerPostUrl: 'https://jonobartaonline.blogspot.com/2026/10/test.html',
      views: 12
    }
  ],
  feeds: [
    { id: 'prothomalo', name: 'প্রথম আলো', url: 'https://www.prothomalo.com/feed', enabled: true, isBroken: false },
    { id: 'jugantor', name: 'দৈনিক যুগান্তর (404 Broken)', url: 'https://www.jugantor.com/feed', enabled: false, isBroken: true }
  ],
  templates: [
    { id: 'bold-headline', name: 'বোল্ড হেডলাইন' },
    { id: 'breaking-news', name: 'ব্রেকিং নিউজ' }
  ],
  originalityRatio: '100%',
  beaconActive: true
};

const cockpitHtml = renderAdminCockpit(mockData);

// Verify Panel 1: Pipeline Health
assert.ok(cockpitHtml.includes('১. পাইপলাইন হেলথ'), 'Panel 1 tab must exist');
assert.ok(cockpitHtml.includes('run_test_1'), 'Panel 1 must render recent runs table');
assert.ok(cockpitHtml.includes('PASS'), 'Panel 1 must render stage PASS badges');
assert.ok(cockpitHtml.includes('Test log entry'), 'Panel 1 must render log tail');
console.log('✓ Test 2: Panel 1 (Pipeline Health) rendered with live data');

// Verify Panel 2: Card Studio
assert.ok(cockpitHtml.includes('২. কার্ড স্টুডিও'), 'Panel 2 tab must exist');
assert.ok(cockpitHtml.includes('breaking-news'), 'Panel 2 must show active template');
assert.ok(cockpitHtml.includes('preview_breaking-news.png'), 'Panel 2 must show card preview image');
console.log('✓ Test 3: Panel 2 (Card Studio) rendered with active selector');

// Verify Panel 3: Post Performance
assert.ok(cockpitHtml.includes('৩. পোস্ট পারফরম্যান্স'), 'Panel 3 tab must exist');
assert.ok(cockpitHtml.includes('টেস্ট প্রতিবেদন শিরোনাম'), 'Panel 3 must render real articles');
assert.ok(cockpitHtml.includes('Tier 2 (Stock)'), 'Panel 3 must show image tier');
assert.ok(cockpitHtml.includes('DISPATCHED'), 'Panel 3 must show Facebook webhook status');
console.log('✓ Test 4: Panel 3 (Post Performance) rendered without fake data');

// Verify Panel 4: Traffic Overview
assert.ok(cockpitHtml.includes('৪. ট্র্যাফিক ও এনালাইটিক্স'), 'Panel 4 tab must exist');
assert.ok(cockpitHtml.includes('jonobartaonline.blogspot.com'), 'Panel 4 must show target host');
assert.ok(cockpitHtml.includes('100%'), 'Panel 4 must show originality ratio');
console.log('✓ Test 5: Panel 4 (Traffic Overview) rendered correctly');

// Verify Panel 5: Controls & Feed Manager
assert.ok(cockpitHtml.includes('৫. কন্ট্রোল ও ফিড ম্যানেজার'), 'Panel 5 tab must exist');
assert.ok(cockpitHtml.includes('HOLD_POSTING'), 'Panel 5 must have kill switch');
assert.ok(cockpitHtml.includes('404 ERROR (BROKEN)'), 'Panel 5 must flag broken feeds');
console.log('✓ Test 6: Panel 5 (Controls) rendered with feed manager & kill switch');

console.log('ALL ADMIN COCKPIT TESTS PASSED SUCCESSFULLY!');
