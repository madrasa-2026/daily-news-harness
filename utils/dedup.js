const fs = require('fs');
const path = require('path');

const BENGALI_STOP_WORDS = new Set([
  'ও', 'এবং', 'বা', 'না', 'কি', 'কী', 'যে', 'এই', 'সে', 'হতে', 'থেকে', 'করা', 
  'হয়েছে', 'হয়েছে।', 'হবে', 'দিয়ে', 'জন্য', 'এক', 'করে', 'বলেন', 'জানান', 'এর', 'কে', 
  'এ', 'তে', 'র', 'নিয়ে', 'পর', 'সঙ্গে', 'সাথে', 'বলা', 'আছে', 'ছিল', 'হলে', 'বলে', 
  'হয়', 'তা', 'যা', 'কোনো', 'কিছু', 'এখন', 'তখন', 'সব', 'দাবি', 'জানাল', 'জানিয়েছেন',
  'আজ', 'গতকাল', 'নিয়ে', 'মাধ্যমে', 'আরও', 'নতুন', 'পুনরায়', 'বার্তা', 'রিপোর্ট'
]);

const BENGALI_SUFFIXES = [
  'দেরকে', 'গুলোকে', 'গুলোতে', 'গুলোর', 'দের', 'গুলো', 'টির', 'টিতে', 'টি',
  'এর', 'কে', 'তে', 'য়ে', 'রা', 'টা', 'খানা', 'খানি', 'র'
];

function normalizeUrl(rawUrl) {
  if (!rawUrl) return '';
  try {
    const u = new URL(rawUrl);
    u.search = '';
    u.hash = '';
    let pathname = u.pathname.replace(/\/+$/, '');
    return `${u.hostname}${pathname}`;
  } catch {
    return String(rawUrl).split('?')[0].replace(/\/+$/, '');
  }
}

/**
 * Basic Bengali stemmer removing common inflections
 */
function stemBengaliWord(word) {
  if (!word || word.length < 4) return word;
  for (const suf of BENGALI_SUFFIXES) {
    if (word.endsWith(suf) && word.length - suf.length >= 3) {
      return word.slice(0, -suf.length);
    }
  }
  return word;
}

/**
 * Normalize Bengali headline: Unicode NFC, strip punctuation, digits, extra spaces
 */
function normalizeHeadline(text) {
  if (!text) return '';
  return text
    .normalize('NFC')
    .replace(/[।.,?!:;\"\'‘’“”\(\)\[\]\{\}\-\–—\/\\#@$%^&*+=_~`]/g, ' ')
    .replace(/[০-৯0-9]/g, '') // remove numbers
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Extract clean, stemmed Bengali keywords
 */
function extractBengaliKeywords(text) {
  const normalized = normalizeHeadline(text);
  const words = normalized.split(/\s+/).filter(w => w.length >= 2 && !BENGALI_STOP_WORDS.has(w));
  return new Set(words.map(stemBengaliWord));
}

/**
 * Generate character bigrams for fuzzy substring similarity
 */
function getBigrams(str) {
  const s = normalizeHeadline(str).replace(/\s+/g, '');
  const bigrams = new Set();
  for (let i = 0; i < s.length - 1; i++) {
    bigrams.add(s.slice(i, i + 2));
  }
  return bigrams;
}

/**
 * Calculate multi-metric semantic similarity between two Bengali headlines:
 * 1. Stemmed Token Overlap (Jaccard / Dice)
 * 2. Character Bigram Dice Coefficient (captures spelling variations & phrasing)
 */
function calculateSimilarity(titleA, titleB) {
  if (!titleA || !titleB) return 0;
  
  const normA = normalizeHeadline(titleA);
  const normB = normalizeHeadline(titleB);
  if (normA === normB) return 1.0;

  const wordsA = extractBengaliKeywords(titleA);
  const wordsB = extractBengaliKeywords(titleB);
  
  // 1. Token similarity
  let tokenSim = 0;
  if (wordsA.size > 0 && wordsB.size > 0) {
    let sharedTokens = 0;
    for (const w of wordsA) {
      if (wordsB.has(w)) sharedTokens++;
    }
    const tokenDice = (2 * sharedTokens) / (wordsA.size + wordsB.size);
    const tokenOverlap = sharedTokens / Math.min(wordsA.size, wordsB.size);
    tokenSim = Math.max(tokenDice, tokenOverlap * 0.95);
  }

  // 2. Character Bigram similarity (Dice coefficient)
  let bigramSim = 0;
  const bigramsA = getBigrams(titleA);
  const bigramsB = getBigrams(titleB);
  if (bigramsA.size > 0 && bigramsB.size > 0) {
    let sharedBigrams = 0;
    for (const bg of bigramsA) {
      if (bigramsB.has(bg)) sharedBigrams++;
    }
    bigramSim = (2 * sharedBigrams) / (bigramsA.size + bigramsB.size);
  }

  // Final semantic similarity score
  return Math.max(tokenSim, 0.4 * tokenSim + 0.6 * bigramSim);
}

function loadRecentStories(filePath) {
  try {
    if (!fs.existsSync(filePath)) return [];
    const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.warn('[DEDUP] Could not load recent stories:', err.message);
    return [];
  }
}

function saveRecentStories(filePath, stories) {
  try {
    const now = Date.now();
    const MAX_AGE_MS = 48 * 60 * 60 * 1000; // keep last 48 hours
    const filtered = stories
      .filter(s => (now - (s.processedAt || 0)) < MAX_AGE_MS)
      .slice(-300); // keep up to 300
    fs.writeFileSync(filePath, JSON.stringify(filtered, null, 2), 'utf-8');
  } catch (err) {
    console.error('[DEDUP] Failed to save recent stories:', err.message);
  }
}

/**
 * Check if candidate article is a duplicate against 48h database
 * Matches:
 * 1. Normalized URL exact match
 * 2. Semantic headline similarity > threshold (default 0.8)
 */
function checkDuplicateStory(article, database = [], threshold = 0.8) {
  const normalizedNew = normalizeUrl(article.link);
  const newTitle = article.title || '';

  // Scan database (recent_stories + 48h articles)
  for (const item of database) {
    // 1. Exact URL match
    if (normalizedNew && item.normalizedUrl && item.normalizedUrl === normalizedNew) {
      return { 
        isDuplicate: true, 
        similarity: 1.0, 
        matchedTitle: item.title,
        reason: `Exact URL match with existing story "${item.title}"` 
      };
    }

    // 2. Semantic headline similarity check
    const sim = calculateSimilarity(newTitle, item.title);
    if (sim >= threshold) {
      return {
        isDuplicate: true,
        similarity: Math.round(sim * 100) / 100,
        matchedTitle: item.title,
        reason: `Headline ${(sim * 100).toFixed(1)}% semantically identical to 48h story: "${item.title}"`
      };
    }
  }

  return { isDuplicate: false, similarity: 0 };
}

/**
 * Load unified 48-hour story database from both recent_stories.json and articles.json
 */
function get48hStoryDatabase(articlesFile, recentStoriesFile) {
  const stories = [];
  const now = Date.now();
  const MAX_AGE_MS = 48 * 60 * 60 * 1000;

  // 1. From recent_stories.json
  if (recentStoriesFile && fs.existsSync(recentStoriesFile)) {
    try {
      const recent = JSON.parse(fs.readFileSync(recentStoriesFile, 'utf8'));
      if (Array.isArray(recent)) {
        for (const r of recent) {
          if (!r || !r.title) continue;
          const procTime = r.processedAt || now;
          if (now - procTime < MAX_AGE_MS) {
            stories.push({
              title: r.title,
              link: r.link || '',
              normalizedUrl: r.normalizedUrl || normalizeUrl(r.link || ''),
              processedAt: procTime
            });
          }
        }
      }
    } catch {}
  }

  // 2. From articles.json (portal database)
  if (articlesFile && fs.existsSync(articlesFile)) {
    try {
      const articles = JSON.parse(fs.readFileSync(articlesFile, 'utf8'));
      if (Array.isArray(articles)) {
        for (const a of articles) {
          if (!a || !a.title) continue;
          const pubTime = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
          if (!isNaN(pubTime) && (now - pubTime < MAX_AGE_MS)) {
            stories.push({
              title: a.title,
              link: a.sourceUrl || '',
              normalizedUrl: normalizeUrl(a.sourceUrl || ''),
              processedAt: pubTime
            });
          }
        }
      }
    } catch {}
  }

  return stories;
}

module.exports = {
  normalizeUrl,
  normalizeHeadline,
  stemBengaliWord,
  extractBengaliKeywords,
  calculateSimilarity,
  loadRecentStories,
  saveRecentStories,
  get48hStoryDatabase,
  checkDuplicateStory
};
