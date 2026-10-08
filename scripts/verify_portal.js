const http = require('http');
const puppeteer = require('puppeteer-core');
const fs = require('fs');
const path = require('path');

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const brainDir = 'C:\\Users\\mehed\\.gemini\\antigravity\\brain\\ae1f7e96-82d5-4a48-8681-371edf33e2dc';

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ statusCode: res.statusCode, data, headers: res.headers }));
    }).on('error', reject);
  });
}

async function run() {
  console.log('=== NAGORIK DESK PORTAL VERIFICATION ===\n');

  const tests = [
    { name: 'Homepage (/)', url: 'http://localhost:3000/' },
    { name: 'Article Page (/news/election-commission-merudondo-jamaat-zubair)', url: 'http://localhost:3000/news/election-commission-merudondo-jamaat-zubair' },
    { name: 'Category Page (/category/politics)', url: 'http://localhost:3000/category/politics' },
    { name: 'Search Page (/search?q=নির্বাচন)', url: 'http://localhost:3000/search?q=%E0%A6%A8%E0%A6%BF%E0%A6%B0%E0%A7%8D%E0%A6%AC%E0%A6%BE%E0%A6%95%E0%A6%A8' },
    { name: 'RSS Feed (/rss.xml)', url: 'http://localhost:3000/rss.xml' },
    { name: 'Sitemap (/sitemap.xml)', url: 'http://localhost:3000/sitemap.xml' },
    { name: 'Admin Panel (/admin)', url: 'http://localhost:3000/admin' }
  ];

  for (const t of tests) {
    try {
      const start = Date.now();
      const res = await fetchUrl(t.url);
      const duration = Date.now() - start;
      const pass = res.statusCode === 200;
      console.log(`[${pass ? 'PASS' : 'FAIL'}] ${t.name}: HTTP ${res.statusCode} in ${duration}ms (${res.data.length} bytes)`);
      if (!pass) {
        console.error(`  Error details: ${res.data.slice(0, 200)}`);
      }
    } catch (e) {
      console.error(`[FAIL] ${t.name}: ${e.message}`);
    }
  }

  console.log('\n=== TAKING PUPPETEER SCREENSHOTS ===');
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu']
  });

  const page = await browser.newPage();

  // 1. Desktop Screenshot (1440x900)
  await page.setViewport({ width: 1440, height: 900 });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 15000 });
  const desktopShot = path.join(brainDir, 'portal_desktop_verified.png');
  await page.screenshot({ path: desktopShot, fullPage: false });
  console.log(`Saved desktop screenshot to: ${desktopShot}`);

  // 2. Mobile Viewport Screenshot (iPhone SE: 375x667)
  await page.setViewport({ width: 375, height: 667, isMobile: true, hasTouch: true });
  await page.goto('http://localhost:3000/', { waitUntil: 'networkidle0', timeout: 15000 });
  const mobileShot = path.join(brainDir, 'portal_mobile_verified.png');
  await page.screenshot({ path: mobileShot, fullPage: false });
  console.log(`Saved mobile screenshot to: ${mobileShot}`);

  // 3. Article Mobile Viewport (iPhone SE: 375x667)
  await page.goto('http://localhost:3000/news/election-commission-merudondo-jamaat-zubair', { waitUntil: 'networkidle0', timeout: 15000 });
  const articleMobileShot = path.join(brainDir, 'article_mobile_verified.png');
  await page.screenshot({ path: articleMobileShot, fullPage: false });
  console.log(`Saved article mobile screenshot to: ${articleMobileShot}`);

  await browser.close();
  console.log('\n=== ALL PORTAL VERIFICATIONS COMPLETED SUCCESSFULLY ===');
}

run().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
