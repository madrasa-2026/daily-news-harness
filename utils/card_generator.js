const fs = require('fs');
const path = require('path');
const axios = require('axios');

const CARDS_DIR = path.join(__dirname, '..', 'public', 'cards');
if (!fs.existsSync(CARDS_DIR)) {
  fs.mkdirSync(CARDS_DIR, { recursive: true });
}

function escapeXml(unsafe = '') {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function wrapBengaliText(text, maxCharsPerLine = 32) {
  const words = text.trim().split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
      currentLine = (currentLine + ' ' + word).trim();
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines.slice(0, 3); // Max 3 lines for high visual impact
}

async function fetchImageAsBase64(imageUrl) {
  if (!imageUrl || !imageUrl.startsWith('http')) return null;
  try {
    const res = await axios.get(imageUrl, {
      responseType: 'arraybuffer',
      timeout: 6000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const contentType = res.headers['content-type'] || 'image/jpeg';
    const b64 = Buffer.from(res.data, 'binary').toString('base64');
    return `data:${contentType};base64,${b64}`;
  } catch (e) {
    console.warn(`[CARD_GEN] Could not load image for base64: ${e.message}`);
    return null;
  }
}

async function generateCardSvg({ id, title, category = 'জাতীয়', photoUrl = '', feedTitle = 'জনবার্তা অনলাইন ডেস্ক' }) {
  const safeId = id || Date.now().toString(36);
  const safeTitle = escapeXml(title);
  const safeCategory = escapeXml(category);
  const safeFeed = escapeXml(feedTitle);
  
  const wrappedLines = wrapBengaliText(title, 28);
  const linesSvg = wrappedLines.map((line, idx) => `
    <tspan x="60" dy="${idx === 0 ? 0 : 68}">${escapeXml(line)}</tspan>
  `).join('');

  // Try to embed real image as base64 for self-contained rendering
  const embeddedImage = photoUrl ? await fetchImageAsBase64(photoUrl) : null;
  const imageHref = embeddedImage || photoUrl || 'https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=1200&q=80';

  const svgContent = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Gradients -->
    <linearGradient id="bgDarkGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#0f172a" stop-opacity="0.3" />
      <stop offset="45%" stop-color="#0f172a" stop-opacity="0.75" />
      <stop offset="100%" stop-color="#020617" stop-opacity="0.98" />
    </linearGradient>
    <linearGradient id="emeraldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#047857" />
      <stop offset="100%" stop-color="#065f46" />
    </linearGradient>
    <linearGradient id="crimsonGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#dc2626" />
      <stop offset="100%" stop-color="#991b1b" />
    </linearGradient>
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="4" stdDeviation="8" flood-color="#000000" flood-opacity="0.8" />
    </filter>
  </defs>

  <style>
    @import url('https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@700;800;900&amp;family=Noto+Serif+Bengali:wght@700;800;900&amp;display=swap');
    .headline { font-family: 'Noto Serif Bengali', 'Hind Siliguri', serif; font-weight: 900; font-size: 54px; fill: #ffffff; line-height: 1.25; filter: url(#cardShadow); }
    .brand-title { font-family: 'Hind Siliguri', sans-serif; font-weight: 900; font-size: 38px; fill: #ffffff; }
    .category-text { font-family: 'Hind Siliguri', sans-serif; font-weight: 800; font-size: 24px; fill: #ffffff; text-transform: uppercase; }
    .footer-text { font-family: 'Hind Siliguri', sans-serif; font-weight: 600; font-size: 20px; fill: #94a3b8; }
  </style>

  <!-- Background Image -->
  <image href="${escapeXml(imageHref)}" x="0" y="0" width="1200" height="630" preserveAspectRatio="xMidYMid slice" />

  <!-- Dark Atmospheric Gradient Overlay -->
  <rect x="0" y="0" width="1200" height="630" fill="url(#bgDarkGrad)" />

  <!-- Top Brand Banner Bar -->
  <g transform="translate(60, 45)">
    <!-- Brand Icon Shield -->
    <rect x="0" y="0" width="56" height="56" rx="14" fill="url(#emeraldGrad)" />
    <path d="M 28 8 L 48 28 L 28 48 L 20 40 L 34 28 L 20 16 Z" fill="url(#crimsonGrad)" />
    <circle cx="25" cy="28" r="7" fill="#ffffff" />
    
    <!-- Brand Typography -->
    <text x="72" y="40" class="brand-title">জন<tspan fill="#ef4444">বার্তা</tspan></text>
    <text x="210" y="38" font-family="'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="700" fill="#cbd5e1" letter-spacing="2">| JONOBARTA.COM</text>
  </g>

  <!-- Live/Source Tag Top Right -->
  <g transform="translate(980, 45)">
    <rect x="0" y="0" width="160" height="42" rx="8" fill="#1e293b" opacity="0.9" stroke="#334155" stroke-width="1.5" />
    <circle cx="22" cy="21" r="5" fill="#22c55e" />
    <text x="36" y="27" font-family="'Hind Siliguri', sans-serif" font-size="18" font-weight="700" fill="#f8fafc">সত্য ও নির্ভীক</text>
  </g>

  <!-- Category Badge -->
  <g transform="translate(60, 310)">
    <rect x="0" y="0" width="${safeCategory.length * 24 + 40}" height="46" rx="8" fill="url(#crimsonGrad)" />
    <text x="20" y="32" class="category-text">🔴 ${safeCategory}</text>
  </g>

  <!-- Bengali Headline Text -->
  <text x="60" y="415" class="headline">
    ${linesSvg}
  </text>

  <!-- Bottom Accent Bar -->
  <rect x="0" y="622" width="1200" height="8" fill="url(#emeraldGrad)" />

  <!-- Bottom Footer Info -->
  <g transform="translate(60, 595)">
    <text x="0" y="0" class="footer-text">📌 তথ্যসূত্র: ${safeFeed} &nbsp;•&nbsp; বিস্তারিত পড়তে ভিজিট করুন: <tspan fill="#38bdf8" font-weight="700">jonobarta.com</tspan></text>
  </g>

</svg>
  `.trim();

  const fileName = `card_${safeId}.svg`;
  const filePath = path.join(CARDS_DIR, fileName);
  fs.writeFileSync(filePath, svgContent, 'utf8');
  console.log(`[CARD_GEN] Generated HD SVG card: ${filePath}`);

  const publicUrl = `/cards/${fileName}`;
  return { fileName, filePath, publicUrl };
}

module.exports = {
  generateCardSvg,
  wrapBengaliText
};
