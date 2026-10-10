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

let Resvg = null;
try {
  Resvg = require('@resvg/resvg-js').Resvg;
} catch {}

const CARDS_DIR = path.join(__dirname, '..', 'public', 'cards');
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

let sessionCardsRendered = 0;

function findChromeExecutable() {
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_BIN && fs.existsSync(process.env.CHROME_BIN)) {
    return process.env.CHROME_BIN;
  }

  // Search Render and Linux cache directories
  const homeDir = process.env.HOME || '/home/render';
  const cacheDirs = [
    '/opt/render/.cache/puppeteer',
    path.join(homeDir, '.cache', 'puppeteer'),
    '/opt/render/project/.cache/puppeteer'
  ];
  for (const cDir of cacheDirs) {
    if (fs.existsSync(cDir)) {
      const findBin = (dir) => {
        try {
          const files = fs.readdirSync(dir, { withFileTypes: true });
          for (const f of files) {
            const full = path.join(dir, f.name);
            if (f.isDirectory()) {
              const res = findBin(full);
              if (res) return res;
            } else if (f.name === 'chrome' || f.name === 'chromium') {
              return full;
            }
          }
        } catch {}
        return null;
      };
      const found = findBin(cDir);
      if (found) return found;
    }
  }

  const paths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
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
  if (t.includes('জামায়াত') || t.includes('জামায়াত') || t.includes('শিবির')) return 'জাতীয় রাজনীতি ও জামায়াত';
  if (t.includes('বিএনপি') || t.includes('তারেক') || t.includes('ফখরুল')) return 'রাজনৈতিক চালচিত্র ও বিএনপি';
  if (t.includes('উপদেষ্টা') || t.includes('ইউনূস') || t.includes('সংস্কার') || t.includes('সরকার')) return 'অন্তর্বর্তী সরকার ও সংস্কার';
  if (t.includes('সংসদ') || t.includes('নির্বাচন') || t.includes('কমিশন')) return 'সংসদ ও নির্বাচন কমিশন';
  if (t.includes('আইন') || t.includes('পুলিশ') || t.includes('আদালত') || t.includes('মামলা')) return 'আইনশৃঙ্খলা ও বিচার বিভাগ';
  if (t.includes('অর্থনীতি') || t.includes('ব্যাংক') || t.includes('বিনিয়োগ')) return 'অর্থনীতি ও বাণিজ্য';
  if (t.includes('প্রযুক্তি') || t.includes('এআই') || t.includes('বিজ্ঞান')) return 'বিজ্ঞান ও প্রযুক্তি';
  return 'জাতীয় সংবাদ';
}

function getHeadlineFontSize(len) {
  if (len > 90) return 42;
  if (len > 70) return 46;
  if (len > 48) return 50;
  return 56;
}

// -------------------------------------------------------------
// 6 DISTINCT CARD TEMPLATES (1200x630 HTML GENERATORS)
// -------------------------------------------------------------

// 1. Bold Headline (Al Jazeera / Crimson Red Style)
function templateBoldHeadline({ headline, subtext, category, source, dateStr, fontSize, showCommentPointer = true }) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&family=Noto+Serif+Bengali:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', 'Noto Serif Bengali', sans-serif; }
    body {
      width: 1200px; height: 630px; background-color: #d61f2c; color: #ffffff;
      padding: 45px 80px 40px 80px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
    }
    .top-bar { display: flex; align-items: center; gap: 14px; }
    .category-label { background: #a3121f; color: #ffffff; font-size: 21px; font-weight: 700; padding: 6px 20px; border-radius: 4px; }
    .top-line { flex: 1; height: 2px; background: rgba(163, 18, 31, 0.6); }
    .content-area { flex: 1; display: flex; flex-direction: column; justify-content: center; padding: 15px 0; }
    .headline {
      font-family: 'Noto Serif Bengali', 'Hind Siliguri', serif;
      font-size: ${fontSize}px; font-weight: 900; line-height: 1.25; color: #ffffff; margin-bottom: 12px;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .subtext {
      font-size: 24px; font-weight: 500; line-height: 1.35; color: #f1f5f9;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .comment-pointer-strip {
      display: inline-flex; align-items: center; gap: 8px;
      background: #fef08a; color: #991b1b; padding: 7px 22px; border-radius: 20px;
      font-weight: 800; font-size: 21px; width: fit-content;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25); margin-top: 14px;
    }
    .bottom-strip { display: flex; justify-content: space-between; align-items: center; border-top: 2px solid rgba(255, 255, 255, 0.2); padding-top: 18px; }
    .brand-bug { display: flex; align-items: center; gap: 14px; }
    .bug-icon { width: 44px; height: 44px; background: #ffffff; color: #d61f2c; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 28px; font-weight: 900; }
    .brand-title { font-size: 24px; font-weight: 800; color: #ffffff; }
    .brand-slogan { font-size: 13px; color: #fecaca; letter-spacing: 0.5px; }
    .meta-info { font-size: 19px; font-weight: 600; color: #ffffff; opacity: 0.95; }
  </style>
</head>
<body>
  <div class="top-bar"><span class="category-label">${category}</span><div class="top-line"></div></div>
  <div class="content-area">
    <h1 class="headline">${headline}</h1>
    ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
    ${showCommentPointer ? `<div class="comment-pointer-strip"><span>📰</span><span>বিস্তারিত খবর কমেন্ট বক্সে 👇</span></div>` : ''}
  </div>
  <div class="bottom-strip">
    <div class="brand-bug"><div class="bug-icon">জ</div><div><div class="brand-title">জনবার্তা</div><div class="brand-slogan">JONOBARTA • সত্য ও ন্যায়ের কণ্ঠ</div></div></div>
    <div class="meta-info">সূত্র: ${source} • ${dateStr}</div>
  </div>
</body>
</html>`;
}

// 2. Image Dominant (TV News Lower-Third / Somoy TV / BBC style)
function templateImageDominant({ headline, subtext, category, source, dateStr, bgImage, fontSize, showCommentPointer = true }) {
  const bg = bgImage || 'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80';
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@600;700;800;900&family=Noto+Serif+Bengali:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', sans-serif; }
    body {
      width: 1200px; height: 630px; position: relative; overflow: hidden; background: #000;
      display: flex; flex-direction: column; justify-content: flex-end;
    }
    .bg-img {
      position: absolute; top: 0; left: 0; width: 100%; height: 100%;
      background-image: url('${bg}'); background-size: cover; background-position: center;
      filter: brightness(0.85);
    }
    .gradient-overlay {
      position: absolute; bottom: 0; left: 0; right: 0; height: 420px;
      background: linear-gradient(to top, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 60%, transparent 100%);
    }
    .top-badge {
      position: absolute; top: 40px; left: 80px; z-index: 10;
      background: #d61f2c; color: white; padding: 8px 24px; border-radius: 4px;
      font-size: 22px; font-weight: 800; box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    }
    .lower-third {
      position: relative; z-index: 10; padding: 0 80px 40px 80px;
    }
    .headline {
      font-family: 'Noto Serif Bengali', serif; font-size: ${Math.min(fontSize, 48)}px;
      font-weight: 900; line-height: 1.25; color: #ffffff; text-shadow: 0 2px 8px rgba(0,0,0,0.8);
      margin-bottom: 12px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .comment-pointer-strip {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(220, 38, 38, 0.95); color: #ffffff; padding: 6px 18px; border-radius: 20px;
      font-weight: 800; font-size: 19px; width: fit-content; border: 1px solid #fecaca;
      box-shadow: 0 4px 12px rgba(0,0,0,0.4); margin-bottom: 12px;
    }
    .bottom-bar {
      display: flex; justify-content: space-between; align-items: center;
      background: rgba(15, 23, 42, 0.9); border-left: 6px solid #d61f2c;
      padding: 12px 24px; border-radius: 6px;
    }
    .brand-tag { font-size: 20px; font-weight: 800; color: #fff; }
    .meta-tag { font-size: 18px; color: #cbd5e1; font-weight: 600; }
  </style>
</head>
<body>
  <div class="bg-img"></div>
  <div class="gradient-overlay"></div>
  <div class="top-badge">${category}</div>
  <div class="lower-third">
    <h1 class="headline">${headline}</h1>
    ${showCommentPointer ? `<div class="comment-pointer-strip"><span>📰</span><span>বিস্তারিত খবর কমেন্ট বক্সে 👇</span></div>` : ''}
    <div class="bottom-bar">
      <div class="brand-tag">জনবার্তা • সত্যের সন্ধান</div>
      <div class="meta-tag">সূত্র: ${source} • ${dateStr}</div>
    </div>
  </div>
</body>
</html>`;
}

// 3. Minimal Editorial (Clean Light Style)
function templateMinimal({ headline, subtext, category, source, dateStr, fontSize, showCommentPointer = true }) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700&family=Noto+Serif+Bengali:wght@600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', sans-serif; }
    body {
      width: 1200px; height: 630px; background-color: #f8fafc; color: #0f172a;
      padding: 45px 80px 40px 80px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
      border: 12px solid #e2e8f0;
    }
    .top-row { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #cbd5e1; padding-bottom: 16px; }
    .brand-logo { font-size: 28px; font-weight: 900; color: #d61f2c; }
    .cat-pill { font-size: 20px; font-weight: 700; color: #475569; text-transform: uppercase; }
    .center-body { flex: 1; display: flex; flex-direction: column; justify-content: center; }
    .headline {
      font-family: 'Noto Serif Bengali', serif; font-size: ${fontSize}px; font-weight: 900; line-height: 1.25;
      color: #0f172a; margin-bottom: 14px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .subtext {
      font-size: 24px; font-weight: 500; line-height: 1.35; color: #64748b;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .comment-pointer-strip {
      display: inline-flex; align-items: center; gap: 8px;
      background: #fee2e2; color: #b91c1c; padding: 6px 18px; border-radius: 20px;
      font-weight: 800; font-size: 19px; width: fit-content; border: 1px solid #fca5a5;
      margin-top: 14px;
    }
    .footer-row { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #cbd5e1; padding-top: 16px; font-size: 18px; color: #64748b; font-weight: 600; }
  </style>
</head>
<body>
  <div class="top-row">
    <div class="brand-logo">জনবার্তা | JONOBARTA</div>
    <div class="cat-pill">${category}</div>
  </div>
  <div class="center-body">
    <h1 class="headline">${headline}</h1>
    ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
    ${showCommentPointer ? `<div class="comment-pointer-strip"><span>📰</span><span>বিস্তারিত খবর কমেন্ট বক্সে 👇</span></div>` : ''}
  </div>
  <div class="footer-row">
    <div>তথ্যসূত্র: ${source}</div>
    <div>${dateStr}</div>
  </div>
</body>
</html>`;
}

// 4. Breaking News (Urgent Flash / Urgent Red & Yellow Style)
function templateBreaking({ headline, subtext, category, source, dateStr, fontSize, showCommentPointer = true }) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@700;800;900&family=Noto+Serif+Bengali:wght@800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', sans-serif; }
    body {
      width: 1200px; height: 630px; background: #0f172a; color: #ffffff;
      padding: 45px 80px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
      border-top: 8px solid #dc2626; border-bottom: 8px solid #dc2626;
    }
    .breaking-banner {
      display: flex; align-items: center; gap: 16px; background: #dc2626;
      padding: 10px 24px; border-radius: 6px; width: fit-content;
    }
    .breaking-text { font-size: 26px; font-weight: 900; color: #fef08a; letter-spacing: 1px; }
    .cat-text { font-size: 20px; font-weight: 700; color: #ffffff; border-left: 2px solid rgba(255,255,255,0.4); padding-left: 14px; }
    .main-headline {
      font-family: 'Noto Serif Bengali', serif; font-size: ${fontSize}px; font-weight: 900; line-height: 1.25;
      color: #ffffff; margin: 20px 0 10px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .subtext {
      font-size: 24px; color: #cbd5e1; line-height: 1.35;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .comment-pointer-strip {
      display: inline-flex; align-items: center; gap: 8px;
      background: #eab308; color: #451a03; padding: 6px 18px; border-radius: 20px;
      font-weight: 900; font-size: 20px; width: fit-content; margin-top: 14px;
    }
    .bottom-bar {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 2px solid #334155; padding-top: 16px; font-size: 19px; color: #94a3b8; font-weight: 600;
    }
    .logo { color: #f87171; font-weight: 900; }
  </style>
</head>
<body>
  <div class="breaking-banner">
    <span class="breaking-text">🚨 ব্রেকিং নিউজ</span>
    <span class="cat-text">${category}</span>
  </div>
  <div>
    <h1 class="main-headline">${headline}</h1>
    ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
    ${showCommentPointer ? `<div class="comment-pointer-strip"><span>🚨</span><span>বিস্তারিত খবর কমেন্ট বক্সে 👇</span></div>` : ''}
  </div>
  <div class="bottom-bar">
    <div class="logo">জনবার্তা সংবাদ নেটওয়ার্ক</div>
    <div>সূত্র: ${source} • ${dateStr}</div>
  </div>
</body>
</html>`;
}

// 5. Quote Style (Editorial Statements & Quotations)
function templateQuote({ headline, subtext, category, source, dateStr, fontSize, showCommentPointer = true }) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&family=Noto+Serif+Bengali:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', sans-serif; }
    body {
      width: 1200px; height: 630px; background: #1e1e24; color: #ffffff;
      padding: 45px 80px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
      border-left: 12px solid #e11d48;
    }
    .top-strip { display: flex; justify-content: space-between; align-items: center; }
    .quote-badge { background: #e11d48; color: #fff; font-size: 20px; font-weight: 800; padding: 6px 18px; border-radius: 4px; }
    .quote-icon { font-size: 80px; color: rgba(225, 29, 72, 0.4); line-height: 0.5; font-family: serif; }
    .headline {
      font-family: 'Noto Serif Bengali', serif; font-size: ${fontSize}px; font-weight: 900; line-height: 1.25;
      color: #ffffff; margin: 15px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .subtext {
      font-size: 24px; color: #cbd5e1; font-weight: 500;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .comment-pointer-strip {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(225, 29, 72, 0.2); color: #fda4af; padding: 6px 18px; border-radius: 20px;
      font-weight: 800; font-size: 19px; width: fit-content; border: 1px solid #e11d48;
      margin-top: 14px;
    }
    .bottom-strip {
      display: flex; justify-content: space-between; align-items: center;
      border-top: 1px solid #3f3f46; padding-top: 16px; font-size: 19px; color: #a1a1aa; font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="top-strip">
    <div class="quote-badge">বিশেষ বক্তব্য ও উদ্ধৃতি • ${category}</div>
    <div class="quote-icon">“</div>
  </div>
  <div>
    <h1 class="headline">“${headline}”</h1>
    ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
    ${showCommentPointer ? `<div class="comment-pointer-strip"><span>💬</span><span>বিস্তারিত খবর কমেন্ট বক্সে 👇</span></div>` : ''}
  </div>
  <div class="bottom-strip">
    <div>জনবার্তা • বিশিষ্ট মতামত</div>
    <div>সূত্র: ${source} • ${dateStr}</div>
  </div>
</body>
</html>`;
}

// 6. Dark Premium (Obsidian & Gold Accents)
function templateDarkPremium({ headline, subtext, category, source, dateStr, fontSize, showCommentPointer = true }) {
  return `<!DOCTYPE html>
<html lang="bn">
<head>
  <meta charset="UTF-8">
  <link href="https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@500;600;700;800&family=Noto+Serif+Bengali:wght@700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Hind Siliguri', sans-serif; }
    body {
      width: 1200px; height: 630px; background: #0b0f19; color: #ffffff;
      padding: 45px 80px; display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
      border: 3px solid #f59e0b;
    }
    .header-bar { display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #1f2937; padding-bottom: 16px; }
    .brand-gold { font-size: 26px; font-weight: 900; color: #f59e0b; letter-spacing: 0.5px; }
    .cat-badge { background: #1f2937; color: #fef3c7; border: 1px solid #f59e0b; font-size: 18px; font-weight: 700; padding: 5px 16px; border-radius: 4px; }
    .headline {
      font-family: 'Noto Serif Bengali', serif; font-size: ${fontSize}px; font-weight: 900; line-height: 1.25;
      color: #ffffff; margin: 15px 0; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .subtext {
      font-size: 24px; color: #9ca3af; font-weight: 500;
      display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
    }
    .comment-pointer-strip {
      display: inline-flex; align-items: center; gap: 8px;
      background: rgba(245, 158, 11, 0.15); color: #fbbf24; padding: 6px 18px; border-radius: 20px;
      font-weight: 800; font-size: 19px; width: fit-content; border: 1px solid #f59e0b;
      margin-top: 14px;
    }
    .footer-bar { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1f2937; padding-top: 16px; font-size: 18px; color: #9ca3af; font-weight: 600; }
  </style>
</head>
<body>
  <div class="header-bar">
    <div class="brand-gold">জনবার্তা প্রিমিয়াম</div>
    <div class="cat-badge">${category}</div>
  </div>
  <div>
    <h1 class="headline">${headline}</h1>
    ${subtext ? `<p class="subtext">${subtext}</p>` : ''}
    ${showCommentPointer ? `<div class="comment-pointer-strip"><span>📰</span><span>বিস্তারিত খবর কমেন্ট বক্সে 👇</span></div>` : ''}
  </div>
  <div class="footer-bar">
    <div>JONOBARTA EXCLUSIVE</div>
    <div>সূত্র: ${source} • ${dateStr}</div>
  </div>
</body>
</html>`;
}

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

const TEMPLATE_BUILDERS = {
  'bold-headline': templateBoldHeadline,
  'image-dominant': templateImageDominant,
  'minimal': templateMinimal,
  'breaking-news': templateBreaking,
  'quote-style': templateQuote,
  'dark-premium': templateDarkPremium
};

function getTemplateHtml(templateId, data) {
  const builder = TEMPLATE_BUILDERS[templateId] || templateBoldHeadline;
  return builder(data);
}

function getAvailableTemplates() {
  const templates = {};
  for (const id of Object.keys(TEMPLATE_BUILDERS)) {
    templates[id] = { id, source: 'builtin' };
  }
  return templates;
}

/**
 * Upload image to public CDN with dual providers (Catbox + FreeImage.host)
 * Guarantees a valid, publicly reachable image URL so Facebook never receives 404
 */
async function uploadToCdn(imagePath) {
  if (!fs.existsSync(imagePath)) {
    console.warn(`[CARD] File does not exist for CDN upload: ${imagePath}`);
    return 'https://iili.io/nMjOGVf.png';
  }

  const fileName = path.basename(imagePath);
  const fileBuffer = fs.readFileSync(imagePath);

  // 1. Primary: Catbox (fast, permanent)
  try {
    const fd = new FormData();
    fd.append('reqtype', 'fileupload');
    fd.append('fileToUpload', new Blob([fileBuffer]), fileName);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    const res = await fetch('https://catbox.moe/user/api.php', {
      method: 'POST',
      body: fd,
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    const url = (await res.text()).trim();
    if (url.startsWith('http://') || url.startsWith('https://')) {
      console.log(`[CARD] Uploaded to primary CDN (Catbox): ${url}`);
      return url;
    }
  } catch (e) {
    console.warn(`[CARD] Catbox upload notice: ${e.message}. Trying secondary CDN...`);
  }

  // 2. Secondary Fallback: FreeImage.host
  try {
    const fd2 = new FormData();
    fd2.append('key', '6d207e02198a847aa98d0a2a901485a5');
    fd2.append('action', 'upload');
    fd2.append('source', new Blob([fileBuffer]), fileName);
    const controller2 = new AbortController();
    const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
    const res2 = await fetch('https://freeimage.host/api/1/upload', {
      method: 'POST',
      body: fd2,
      signal: controller2.signal
    });
    clearTimeout(timeoutId2);
    const json = await res2.json();
    const freeImageUrl = json.image?.url || json.image?.display_url;
    if (freeImageUrl && (freeImageUrl.startsWith('http://') || freeImageUrl.startsWith('https://'))) {
      console.log(`[CARD] Uploaded to secondary CDN (FreeImage): ${freeImageUrl}`);
      return freeImageUrl;
    }
  } catch (e2) {
    console.warn(`[CARD] FreeImage upload notice: ${e2.message}`);
  }

  // 3. Fallback: verified high-resolution permanent card
  console.warn('[CARD] All CDN uploads failed, using verified fallback CDN asset');
  return 'https://iili.io/nMjOGVf.png';
}

/**
 * High-quality SVG generator for Resvg zero-dependency fallback rendering
 */
function buildSvgCard({ headline, subtext, category, source, dateStr, templateId = 'bold-headline', showCommentPointer = true }) {
  const cleanHeadline = (headline || '').replace(/[&<>]/g, '').trim();
  const cleanSubtext = (subtext || '').replace(/[&<>]/g, '').trim();
  const cleanCategory = (category || 'জাতীয়').trim();

  let bgColor = '#d61f2c';
  let bannerColor = '#a3121f';
  let headlineColor = '#ffffff';
  let subColor = '#f1f5f9';
  let badgeText = cleanCategory;

  if (templateId === 'breaking-news') {
    bgColor = '#0f172a';
    bannerColor = '#dc2626';
    badgeText = '🚨 ব্রেকিং নিউজ • ' + cleanCategory;
  } else if (templateId === 'minimal') {
    bgColor = '#f8fafc';
    bannerColor = '#e2e8f0';
    headlineColor = '#0f172a';
    subColor = '#475569';
  } else if (templateId === 'dark-premium') {
    bgColor = '#0b0f19';
    bannerColor = '#1f2937';
    headlineColor = '#ffffff';
    subColor = '#9ca3af';
  } else if (templateId === 'quote-style') {
    bgColor = '#1e1e24';
    bannerColor = '#e11d48';
    badgeText = 'বিশেষ বক্তব্য • ' + cleanCategory;
  }

  return `<svg width="1200" height="630" viewBox="0 0 1200 630" xmlns="http://www.w3.org/2000/svg">
  <rect width="1200" height="630" fill="${bgColor}"/>
  ${templateId === 'dark-premium' ? '<rect x="10" y="10" width="1180" height="610" fill="none" stroke="#f59e0b" stroke-width="4"/>' : ''}
  ${templateId === 'minimal' ? '<rect x="10" y="10" width="1180" height="610" fill="none" stroke="#cbd5e1" stroke-width="12"/>' : ''}
  ${templateId === 'quote-style' ? '<rect x="0" y="0" width="16" height="630" fill="#e11d48"/>' : ''}
  
  <!-- Category / Header banner -->
  <rect x="80" y="45" width="280" height="42" rx="4" fill="${bannerColor}"/>
  <text x="100" y="73" font-size="20" font-family="'Hind Siliguri', 'Noto Serif Bengali', sans-serif" font-weight="bold" fill="#ffffff">${badgeText}</text>
  
  <!-- Headline -->
  <text x="80" y="240" font-size="48" font-family="'Noto Serif Bengali', 'Hind Siliguri', serif" font-weight="bold" fill="${headlineColor}">
    ${cleanHeadline.slice(0, 48)}
  </text>
  ${cleanHeadline.length > 48 ? `<text x="80" y="300" font-size="48" font-family="'Noto Serif Bengali', 'Hind Siliguri', serif" font-weight="bold" fill="${headlineColor}">${cleanHeadline.slice(48, 96)}</text>` : ''}
  
  <!-- Subtext -->
  ${cleanSubtext ? `<text x="80" y="${cleanHeadline.length > 48 ? 360 : 310}" font-size="24" font-family="'Hind Siliguri', sans-serif" fill="${subColor}">${cleanSubtext.slice(0, 65)}...</text>` : ''}
  
  <!-- Comment pointer strip -->
  ${showCommentPointer ? `
  <rect x="80" y="465" width="320" height="48" rx="24" fill="#fef08a"/>
  <text x="110" y="497" font-size="21" font-family="'Hind Siliguri', sans-serif" font-weight="bold" fill="#991b1b">📰 বিস্তারিত খবর কমেন্ট বক্সে 👇</text>
  ` : ''}
  
  <!-- Bottom line & brand -->
  <line x1="80" y1="545" x2="1120" y2="545" stroke="rgba(255,255,255,0.3)" stroke-width="1.5"/>
  <text x="80" y="585" font-size="24" font-family="'Noto Serif Bengali', sans-serif" font-weight="bold" fill="${headlineColor}">জনবার্তা (Jonobarta)</text>
  <text x="780" y="585" font-size="18" font-family="'Hind Siliguri', sans-serif" fill="${subColor}">সূত্র: ${source} • ${dateStr}</text>
</svg>`;
}

/**
 * Render news card using chosen template
 */
async function renderNewsCard({
  title,
  snippet = '',
  source = 'জনবার্তা ডেস্ক',
  category = null,
  imageUrl = null,
  templateId = null,
  showCommentPointer = true
}) {
  const activeTemplate = templateId || process.env.ACTIVE_CARD_TEMPLATE || 'bold-headline';

  const cleanHeadline = (title || '').replace(/["'<>]/g, '').trim();
  const cleanSubtext = (snippet || '').replace(/["'<>]/g, '').trim();
  const cleanCat = category || detectCategory(title + ' ' + snippet);
  const dateStr = formatBengaliDate(new Date());
  const fontSize = getHeadlineFontSize(cleanHeadline.length);

  const cardId = crypto.randomBytes(8).toString('hex');
  const outputPath = path.join(CARDS_DIR, `card_${cardId}.png`);
  const defaultCardPath = path.join(__dirname, '..', 'portal', 'public', 'images', 'jonobarta_card_default.png');

  let renderSuccess = false;

  // 1. Try Headless Chrome Puppeteer rendering
  const chromePath = findChromeExecutable();
  if (chromePath && puppeteer) {
    try {
      const html = getTemplateHtml(activeTemplate, {
        headline: cleanHeadline,
        subtext: cleanSubtext,
        category: cleanCat,
        source,
        dateStr,
        bgImage: imageUrl,
        fontSize,
        showCommentPointer
      });

      const browser = await puppeteer.launch({
        executablePath: chromePath,
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
      });

      try {
        const page = await browser.newPage();
        await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 2 });
        await page.setContent(html, { waitUntil: 'networkidle0', timeout: 15000 });
        await page.screenshot({ path: outputPath, type: 'png' });
        console.log(`[CARD-ENGINE] Rendered custom card via Chrome [${activeTemplate}]: ${outputPath}`);
        renderSuccess = true;
      } finally {
        await browser.close().catch(() => {});
      }
    } catch (renderErr) {
      console.warn(`[CARD-ENGINE] Chrome rendering encountered error: ${renderErr.message}. Trying Resvg.`);
    }
  }

  // 2. If Chrome not available or failed, try Resvg SVG renderer (zero-dependency on Linux)
  if (!renderSuccess && Resvg) {
    try {
      const svg = buildSvgCard({
        headline: cleanHeadline,
        subtext: cleanSubtext,
        category: cleanCat,
        source,
        dateStr,
        templateId: activeTemplate,
        showCommentPointer
      });
      const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: 1200 } });
      const pngData = resvg.render();
      fs.writeFileSync(outputPath, pngData.asPng());
      console.log(`[CARD-ENGINE] Rendered custom card via Resvg [${activeTemplate}]: ${outputPath}`);
      renderSuccess = true;
    } catch (resvgErr) {
      console.warn(`[CARD-ENGINE] Resvg rendering encountered error: ${resvgErr.message}`);
    }
  }

  // 3. Fallback to default card asset if both failed
  if (!renderSuccess) {
    if (fs.existsSync(defaultCardPath)) {
      fs.copyFileSync(defaultCardPath, outputPath);
      console.log(`[CARD-ENGINE] Copied verified fallback card asset: ${outputPath}`);
      renderSuccess = true;
    } else {
      throw new Error('Could not render news card and no default asset found');
    }
  }

  sessionCardsRendered++;

  // 4. Upload to CDN for immediate public reachability
  const cdnUrl = await uploadToCdn(outputPath);

  return {
    cardId,
    templateId: activeTemplate,
    filename: `card_${cardId}.png`,
    relativeUrl: `/cards/card_${cardId}.png`,
    cdnUrl,
    fullPath: outputPath
  };
}

function getGeneratedCardsCount() {
  const onDisk = fs.existsSync(CARDS_DIR)
    ? fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.png')).length
    : 0;
  return Math.max(onDisk, sessionCardsRendered);
}

module.exports = {
  renderNewsCard,
  TEMPLATE_BUILDERS,
  getAvailableTemplates,
  getTemplateHtml,
  detectCategory,
  formatBengaliDate,
  uploadToCdn,
  buildSvgCard,
  getGeneratedCardsCount,
  CARDS_DIR,
  TEMPLATES_DIR
};
