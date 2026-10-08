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
  const cleanCategory = (category || 'জাতীয়').trim();
  const cleanSource = (source || 'জনবার্তা ডেস্ক').trim();

  // Auto-shrink font size logic based on headline character length
  const len = cleanHeadline.length;
  let headlineFontSize = 56;
  if (len > 90) headlineFontSize = 42;
  else if (len > 70) headlineFontSize = 46;
  else if (len > 48) headlineFontSize = 50;

  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&family=Noto+Serif+Bengali:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Hind Siliguri', 'Noto Serif Bengali', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    }
    body {
      width: 1200px;
      height: 630px;
      background-color: #d61f2c;
      color: #ffffff;
      padding: 45px 80px 40px 80px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      position: relative;
    }
    
    /* 1. Thin darker red top bar with white category label */
    .top-bar {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .category-label {
      background: #a3121f;
      color: #ffffff;
      font-size: 21px;
      font-weight: 700;
      padding: 6px 20px;
      border-radius: 4px;
      display: inline-block;
      letter-spacing: 0.5px;
    }
    .top-line {
      flex: 1;
      height: 2px;
      background: rgba(163, 18, 31, 0.7);
    }

    /* 2. Hero Headline & Subtext */
    .content-area {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      padding: 15px 0;
    }
    .headline {
      font-family: 'Noto Serif Bengali', 'Hind Siliguri', serif;
      font-size: ${headlineFontSize}px;
      font-weight: 900;
      line-height: 1.25;
      color: #ffffff;
      margin-bottom: 16px;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      word-break: break-word;
    }
    .subtext {
      font-size: 24px;
      font-weight: 500;
      color: #f1f5f9;
      line-height: 1.45;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      opacity: 0.95;
    }

    /* 3. Bottom Strip */
    .bottom-strip {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-top: 1px solid rgba(255, 255, 255, 0.25);
      padding-top: 18px;
    }
    .brand-bug {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .bug-icon {
      width: 46px;
      height: 46px;
      background: #ffffff;
      color: #d61f2c;
      font-size: 30px;
      font-weight: 900;
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      line-height: 1;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }
    .brand-text-wrap {
      display: flex;
      flex-direction: column;
    }
    .brand-title {
      font-family: 'Noto Serif Bengali', 'Hind Siliguri', serif;
      font-size: 26px;
      font-weight: 900;
      color: #ffffff;
      line-height: 1.1;
      letter-spacing: 0.5px;
    }
    .brand-slogan {
      font-size: 13px;
      font-weight: 600;
      color: #f8fafc;
      opacity: 0.85;
      letter-spacing: 1.2px;
      text-transform: uppercase;
    }
    .meta-info {
      font-size: 19px;
      font-weight: 600;
      color: #f1f5f9;
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .meta-dot {
      opacity: 0.6;
    }
  </style>
</head>
<body>
  <!-- 1. Top Bar -->
  <div class="top-bar">
    <span class="category-label">${cleanCategory}</span>
    <div class="top-line"></div>
  </div>

  <!-- 2. Hero Headline & Subtext -->
  <div class="content-area">
    <h1 class="headline">${cleanHeadline}</h1>
    ${cleanSubtext ? `<p class="subtext">${cleanSubtext}</p>` : ''}
  </div>

  <!-- 3. Bottom Strip -->
  <div class="bottom-strip">
    <div class="brand-bug">
      <div class="bug-icon">জ</div>
      <div class="brand-text-wrap">
        <span class="brand-title">জনবার্তা</span>
        <span class="brand-slogan">JONOBARTA • সত্য ও ন্যায়ের কণ্ঠ</span>
      </div>
    </div>
    <div class="meta-info">
      <span>সূত্র: ${cleanSource}</span>
      <span class="meta-dot">•</span>
      <span>${dateStr}</span>
    </div>
  </div>
</body>
</html>`;
}

async function uploadToCdn(imagePath) {
  try {
    const fileBuffer = fs.readFileSync(imagePath);
    const blob = new Blob([fileBuffer]);
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', blob, path.basename(imagePath));
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3500);
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const url = (await res.text()).trim();
    if (url.startsWith('http')) {
      console.log(`[CARD] Uploaded to CDN: ${url}`);
      return url;
    }
  } catch (e) {
    console.warn(`[CARD] CDN upload notice: ${e.message}`);
  }
  return null;
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
    const cdnUrl = await uploadToCdn(outputPath);
    return { cardId, filename: `card_${cardId}.png`, relativeUrl: `/cards/card_${cardId}.png`, cdnUrl, fullPath: outputPath };
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
    await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });

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

    const cdnUrl = await uploadToCdn(outputPath);

    return {
      cardId,
      filename: `card_${cardId}.png`,
      relativeUrl: `/cards/card_${cardId}.png`,
      cdnUrl,
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
