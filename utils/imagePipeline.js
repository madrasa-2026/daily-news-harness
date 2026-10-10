const axios = require('axios');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const IMAGES_DIR = path.join(__dirname, '..', 'public', 'images', 'articles');
if (!fs.existsSync(IMAGES_DIR)) {
  fs.mkdirSync(IMAGES_DIR, { recursive: true });
}

// Tier 3: Curated high-res editorial category photography (neutral, journalistic style)
const CATEGORY_EDITORIAL_PHOTOS = {
  'জাতীয়': [
    'https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1477959858617-67f30bc75b82?auto=format&fit=crop&w=1200&q=80'
  ],
  'রাজনীতি': [
    'https://images.unsplash.com/photo-1540910419892-4a36d2c3266c?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1529107386315-e1a2ed48a620?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1575517111478-7f6afd0973db?auto=format&fit=crop&w=1200&q=80'
  ],
  'অর্থনীতি': [
    'https://images.unsplash.com/photo-1590283603385-17ffb3a7f29f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&w=1200&q=80'
  ],
  'আইন ও আদালত': [
    'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1589994965851-a8f479c573a9?auto=format&fit=crop&w=1200&q=80'
  ],
  'আন্তর্জাতিক': [
    'https://images.unsplash.com/photo-1544620347-c4fd4a3d5957?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&w=1200&q=80'
  ],
  'তথ্যপ্রযুক্তি': [
    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'
  ],
  'মতামত': [
    'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&w=1200&q=80',
    'https://images.unsplash.com/photo-1455390582262-044cdead277a?auto=format&fit=crop&w=1200&q=80'
  ]
};

const CATEGORY_KEYWORDS_EN = {
  'জাতীয়': 'bangladesh national government administration',
  'রাজনীতি': 'parliament election politics diplomacy',
  'অর্থনীতি': 'banking economy finance stock market',
  'আইন ও আদালত': 'court judge justice law hammer',
  'আন্তর্জাতিক': 'united nations world global diplomacy',
  'তথ্যপ্রযুক্তি': 'technology artificial intelligence computer software',
  'মতামত': 'editorial journalism newspaper typewriter'
};

/**
 * Tier 1: Extract genuine editorial photo from RSS item or article page
 */
async function extractSourcePhoto(article) {
  // 1a. Check RSS enclosures or media tags
  if (article.enclosure?.url && article.enclosure.url.startsWith('http')) {
    return article.enclosure.url;
  }
  if (article['media:content']?.['$']?.url) {
    return article['media:content']['$'].url;
  }

  // 1b. Check article web page og:image
  if (!article.link) return null;
  try {
    const res = await axios.get(article.link, {
      timeout: 6000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });
    const html = typeof res.data === 'string' ? res.data : '';
    const match = html.match(/property=["']og:image["']\s+content=["'](.*?)["']/i) ||
                  html.match(/content=["'](.*?)["']\s+property=["']og:image["']/i) ||
                  html.match(/name=["']twitter:image["']\s+content=["'](.*?)["']/i) ||
                  html.match(/content=["'](.*?)["']\s+name=["']twitter:image["']/i);
    if (match && match[1]) {
      let img = match[1].replace(/&amp;/g, '&').trim();
      if (img.startsWith('//')) img = 'https:' + img;
      if (img.startsWith('http://') || img.startsWith('https://')) {
        return img;
      }
    }
  } catch (e) {
    // Page fetch failed, proceed to Tier 2
  }
  return null;
}

/**
 * Tier 2: Free stock photo (Unsplash API if key present, or keyword search)
 */
async function fetchStockPhoto(category, title = '') {
  const unsplashAccessKey = process.env.UNSPLASH_ACCESS_KEY;
  if (unsplashAccessKey) {
    try {
      const query = CATEGORY_KEYWORDS_EN[category] || 'bangladesh news';
      const res = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query, per_page: 5, orientation: 'landscape' },
        headers: { Authorization: `Client-ID ${unsplashAccessKey}` },
        timeout: 5000
      });
      const results = res.data?.results || [];
      if (results.length > 0) {
        const rand = results[Math.floor(Math.random() * results.length)];
        return rand.urls?.regular || rand.urls?.full;
      }
    } catch (e) {
      console.warn(`[IMAGE-TIER-2] Unsplash API lookup failed: ${e.message}`);
    }
  }
  return null;
}

/**
 * Tier 3: Category curated editorial photo fallback
 */
function getCategoryEditorialPhoto(category) {
  const list = CATEGORY_EDITORIAL_PHOTOS[category] || CATEGORY_EDITORIAL_PHOTOS['জাতীয়'];
  return list[Math.floor(Math.random() * list.length)];
}

/**
 * Complete 3-Tier Image Resolution
 */
async function resolveArticleImage(article, category = 'জাতীয়') {
  // Tier 1: Source press photo
  const tier1 = await extractSourcePhoto(article);
  if (tier1) {
    console.log(`[IMAGE] Tier 1 Selected (Source press photo): ${tier1.slice(0, 90)}...`);
    return { url: tier1, tier: 1, origin: 'source_feed' };
  }

  // Tier 2: Stock photo search
  const tier2 = await fetchStockPhoto(category, article.title);
  if (tier2) {
    console.log(`[IMAGE] Tier 2 Selected (Stock photo): ${tier2.slice(0, 90)}...`);
    return { url: tier2, tier: 2, origin: 'stock_photo' };
  }

  // Tier 3: Curated editorial category photo
  const tier3 = getCategoryEditorialPhoto(category);
  console.log(`[IMAGE] Tier 3 Selected (Category editorial photo): ${tier3.slice(0, 90)}...`);
  return { url: tier3, tier: 3, origin: 'editorial_category' };
}

module.exports = {
  resolveArticleImage,
  extractSourcePhoto,
  fetchStockPhoto,
  getCategoryEditorialPhoto
};
