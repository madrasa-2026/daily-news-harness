const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

let puppeteer = null;
try {
  puppeteer = require('puppeteer-core');
} catch {
  try {
    puppeteer = require('puppeteer');
  } catch {}
}

const CARDS_DIR = path.join(__dirname, '..', 'public', 'cards');
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'Google\\Chrome\\Application\\chrome.exe') : '',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/lib/chromium/chrome'
  ].filter(Boolean);

  for (const p of paths) {
    if (fs.existsSync(p)) return p;
  }
  return null;
}

const BENGALI_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
const BENGALI_DAYS = ['রবিবার', 'সোমবার', 'মঙ্গলবার', 'বুধবার', 'বৃহস্পতিবার', 'শুক্রবার', 'শনিবার'];
const BENGALI_MONTHS = [
  'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
  'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
];

function toBengaliNumber(num) {
  return String(num).replace(/\d/g, d => BENGALI_DIGITS[parseInt(d, 10)]);
}

function formatBengaliDate(d = new Date()) {
  const dayName = BENGALI_DAYS[d.getDay()];
  const day = toBengaliNumber(String(d.getDate()).padStart(2, '0'));
  const month = BENGALI_MONTHS[d.getMonth()];
  const year = toBengaliNumber(d.getFullYear());
  return `${dayName}, ${day} ${month} ${year}`;
}

function detectCategory(text = '') {
  const t = text.toLowerCase();
  if (t.includes('জামায়াত') || t.includes('জামায়াত') || t.includes('শিবির') || t.includes('শফিকুর রহমান')) {
    return 'জাতীয় রাজনীতি ও জামায়াত';
  }
  if (t.includes('বিএনপি') || t.includes('তারেক') || t.includes('ফখরুল')) {
    return 'রাজনৈতিক চালচিত্র ও বিএনপি';
  }
  if (t.includes('উপদেষ্টা') || t.includes('ইউনূস') || t.includes('সংস্কার') || t.includes('সরকার')) {
    return 'অন্তর্বর্তী সরকার ও সংস্কার';
  }
  if (t.includes('সংসদ') || t.includes('নির্বাচন') || t.includes('কমিশন')) {
    return 'সংসদ ও নির্বাচন কমিশন';
  }
  if (t.includes('আইনশৃঙ্খলা') || t.includes('পুলিশ') || t.includes('আদালত') || t.includes('মামলা')) {
    return 'আইনশৃঙ্খলা ও বিচার বিভাগ';
  }
  return 'জাতীয় রাজনীতি';
}

function buildCardHtml({ headline, subtext, category, source, dateStr }) {
  const cleanHeadline = (headline || '').replace(/["'<>]/g, '').trim();
  const cleanSubtext = (subtext || '').replace(/["'<>]/g, '').trim();
  const cleanCategory = (category || 'জাতীয় রাজনীতি').trim();
  const cleanSource = (source || 'নাগরিক ডেস্ক').trim();

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    body {
      width: 1200px;
      height: 675px;
      background: linear-gradient(135deg, #0b132b 0%, #1c2541 50%, #0b132b 100%);
      color: #ffffff;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      padding: 50px 60px;
      position: relative;
      overflow: hidden;
    }
    body::before {
      content: "";
      position: absolute;
      top: 0; left: 0; right: 0; bottom: 0;
      background-image: 
        radial-gradient(circle at 80% 20%, rgba(220, 38, 38, 0.18) 0%, transparent 45%),
        radial-gradient(circle at 20% 80%, rgba(37, 99, 235, 0.16) 0%, transparent 45%),
        linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);
      background-size: 100% 100%, 100% 100%, 40px 40px, 40px 40px;
      z-index: 1;
    }
    .content-wrapper {
      position: relative;
      z-index: 2;
      height: 100%;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid rgba(255, 255, 255, 0.15);
      padding-bottom: 20px;
    }
    .brand {
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .logo-icon {
      width: 52px;
      height: 52px;
      background: linear-gradient(135deg, #dc2626, #ef4444);
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 800;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.5);
    }
    .brand-text h1 {
      font-size: 28px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: #ffffff;
      line-height: 1.1;
    }
    .brand-text p {
      font-size: 13px;
      color: #94a3b8;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      margin-top: 2px;
    }
    .badge-breaking {
      background: #dc2626;
      color: #ffffff;
      font-size: 18px;
      font-weight: 700;
      padding: 8px 22px;
      border-radius: 30px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 15px rgba(220, 38, 38, 0.4);
    }
    .pulse-dot {
      width: 10px;
      height: 10px;
      background: #ffffff;
      border-radius: 50%;
    }
    .main {
      margin: auto 0;
      padding: 10px 0;
    }
    .category-tag {
      color: #38bdf8;
      font-size: 20px;
      font-weight: 700;
      margin-bottom: 16px;
      display: inline-block;
      background: rgba(56, 189, 248, 0.12);
      padding: 4px 14px;
      border-radius: 6px;
      border-left: 4px solid #38bdf8;
    }
    .headline {
      font-size: 44px;
      font-weight: 800;
      line-height: 1.35;
      color: #f8fafc;
      text-shadow: 0 2px 10px rgba(0,0,0,0.5);
      margin-bottom: 18px;
      display: -webkit-box;
      -webkit-line-clamp: 3;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .subtext {
      font-size: 23px;
      font-weight: 500;
      color: #cbd5e1;
      line-height: 1.45;
      max-width: 96%;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
    }
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.12);
      padding-top: 18px;
      font-size: 16px;
      color: #94a3b8;
    }
    .source {
      display: flex;
      align-items: center;
      gap: 8px;
      color: #f1f5f9;
      font-weight: 600;
    }
    .source-dot {
      color: #dc2626;
      font-size: 18px;
    }
  </style>
</head>
<body>
  <div class="content-wrapper">
    <div class="header">
      <div class="brand">
        <div class="logo-icon">না</div>
        <div class="brand-text">
          <h1>নাগরিক ডেস্ক</h1>
          <p>NAGORIK DESK • NEWS</p>
        </div>
      </div>
      <div class="badge-breaking">
        <div class="pulse-dot"></div>
        ব্রেকিং নিউজ
      </div>
    </div>

    <div class="main">
      <div class="category-tag">${cleanCategory}</div>
      <div class="headline">${cleanHeadline}</div>
      ${cleanSubtext ? `<div class="subtext">${cleanSubtext}</div>` : ''}
    </div>

    <div class="footer">
      <div class="source"><span class="source-dot">●</span> সূত্র: ${cleanSource}</div>
      <div>facebook.com/NagorikDesk • ${dateStr}</div>
    </div>
  </div>
</body>
</html>`;
}

async function generateNewsCard({ title, snippet, source, link }) {
  if (!puppeteer) {
    console.warn('[CARD] Puppeteer not installed, skipping news card generation');
    return null;
  }

  const chromePath = findChromeExecutable();
  if (!chromePath) {
    console.warn('[CARD] No Chrome/Chromium executable found, skipping news card generation');
    return null;
  }

  const cardId = crypto.createHash('md5').update(link || title).digest('hex').slice(0, 16);
  const outputPath = path.join(CARDS_DIR, `card_${cardId}.png`);

  if (fs.existsSync(outputPath)) {
    console.log(`[CARD] Using cached news card: card_${cardId}.png`);
    return { cardId, filename: `card_${cardId}.png`, relativeUrl: `/cards/card_${cardId}.png`, fullPath: outputPath };
  }

  console.log(`[CARD] Generating news card for: "${title.slice(0, 60)}..."`);
  let browser = null;
  try {
    browser = await puppeteer.launch({
      executablePath: chromePath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--font-render-hinting=none'
      ]
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 675, deviceScaleFactor: 2 });

    const category = detectCategory(title + ' ' + (snippet || ''));
    const dateStr = formatBengaliDate(new Date());
    const html = buildCardHtml({
      headline: title,
      subtext: snippet ? snippet.slice(0, 160) + '...' : '',
      category,
      source: source || 'নাগরিক ডেস্ক',
      dateStr
    });

    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
    await page.screenshot({ path: outputPath, type: 'png' });
    console.log(`[CARD] Successfully generated card: ${outputPath}`);

    return {
      cardId,
      filename: `card_${cardId}.png`,
      relativeUrl: `/cards/card_${cardId}.png`,
      fullPath: outputPath
    };
  } catch (err) {
    console.error(`[CARD] Failed to generate card: ${err.message}`);
    return null;
  } finally {
    if (browser) {
      await browser.close().catch(() => {});
    }
  }
}

module.exports = {
  generateNewsCard,
  formatBengaliDate,
  detectCategory,
  findChromeExecutable,
  CARDS_DIR
};
