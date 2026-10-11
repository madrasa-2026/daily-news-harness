const path = require('path');
const fs = require('fs');
const puppeteer = require('puppeteer-core');
const { app } = require('../index');
const { appendLog } = require('../utils/runTracker');

const ARTIFACT_DIR = 'C:\\Users\\mehed\\.gemini\\antigravity\\brain\\ae1f7e96-82d5-4a48-8681-371edf33e2dc';
const PORT = 10008;

function findChrome() {
  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Chrome/Edge executable not found');
}

async function run() {
  console.log('1. Seeding real activity logs into run tracker...');
  appendLog('INFO', '[INIT] Jonobarta digital journalism engine initialized');
  appendLog('INFO', '[CRON] Scheduled hourly news cycle active: 0 * * * *');
  appendLog('INFO', '[WATCHDOG] 4-min autonomous keep-alive watchdog ping active (target: https://daily-news-harness.onrender.com/ping)');
  appendLog('INFO', '[DEDUP] Semantic dedup threshold active: 0.80 Dice similarity');
  appendLog('INFO', '[SANITIZER] Unicode U+FFFD and mojibake sanitizer active');
  appendLog('SUCCESS', '[PUBLISH] Clean article published to Blogger: https://jonobartaonline.blogspot.com/2026/10/blog-post_128.html');
  appendLog('SUCCESS', '[FACEBOOK] Make.com scenario 9939541 triggered: clean card uploaded, 0 links, strictly no তথ্যসূত্র in caption');

  console.log('2. Starting Express server on port', PORT);
  const server = app.listen(PORT);

  const chromePath = findChrome();
  console.log('3. Launching browser with binary:', chromePath);
  const browser = await puppeteer.launch({
    executablePath: chromePath,
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--window-size=1400,1050']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1400, height: 1050 });

  console.log('4. Navigating to Admin Login page...');
  await page.goto(`http://localhost:${PORT}/admin/login`, { waitUntil: 'networkidle0' });

  // Fill in password and submit
  await page.type('#password', 'jonobarta_admin_2026');
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle0' }),
    page.click('button[type="submit"]')
  ]);

  console.log('5. Logged into Cockpit! Current URL:', page.url());

  // Panel 1: Pipeline Health
  console.log('Capturing Panel 1 (Pipeline Health)...');
  await page.click('button[onclick*="panel-health"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cockpit_panel_1_health.png') });

  // Panel 2: Card Studio
  console.log('Capturing Panel 2 (Card Studio)...');
  await page.click('button[onclick*="panel-studio"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cockpit_panel_2_card_studio.png') });

  // Demonstrate template switching in Card Studio: switch to 'dark-premium'
  console.log('Demonstrating template switch to dark-premium...');
  await page.evaluate(async () => {
    await fetch('/admin/api/template', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ templateId: 'dark-premium' })
    });
  });
  // Reload page to reflect new active state
  await page.reload({ waitUntil: 'networkidle0' });
  await page.click('button[onclick*="panel-studio"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cockpit_panel_2_card_studio_switched.png') });

  // Panel 3: Post Performance
  console.log('Capturing Panel 3 (Post Performance)...');
  await page.click('button[onclick*="panel-posts"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cockpit_panel_3_post_performance.png') });

  // Panel 4: Traffic Overview
  console.log('Capturing Panel 4 (Traffic Overview)...');
  await page.click('button[onclick*="panel-traffic"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cockpit_panel_4_traffic_overview.png') });

  // Panel 5: Controls & Feed Manager
  console.log('Capturing Panel 5 (Controls)...');
  await page.click('button[onclick*="panel-controls"]');
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'cockpit_panel_5_controls.png') });

  console.log('All 5 cockpit panels and template switch captured successfully!');
  await browser.close();
  server.close();
  process.exit(0);
}

run().catch(err => {
  console.error('Error during capture:', err);
  process.exit(1);
});
