const fs = require('fs');
const path = require('path');

const BENGALI_STOP_WORDS = new Set([
  'ও', 'এবং', 'বা', 'না', 'কি', 'কী', 'যে', 'এই', 'সে', 'হতে', 'থেকে', 'করা', 
  'হয়েছে', 'হয়েছে।', 'হবে', 'দিয়ে', 'জন্য', 'এক', 'করে', 'বলেন', 'জানান', 'এর', 'কে', 
  'এ', 'তে', 'র', 'নিয়ে', 'পর', 'সঙ্গে', 'সাথে', 'বলা', 'আছে', 'ছিল', 'হলে', 'বলে', 
  'হয়', 'তা', 'যা', 'কোনো', 'কিছু', 'এখন', 'তখন', 'সব', 'দাবি', 'জানাল', 'জানিয়েছেন'
]);

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

function extractBengaliKeywords(text) {
  return new Set(
    (text || '')
      .replace(/[।.,?!:;\"\'‘’“”\(\)\[\]\{\}\-\–—\/\\#@$%^&*+=_~`]/g, ' ')
      .split(/\s+/)
      .map(w => w.trim().toLowerCase())
      .filter(w => w.length >= 2 && !BENGALI_STOP_WORDS.has(w))
  );
}

function calculateSimilarity(titleA, titleB) {
  const wordsA = extractBengaliKeywords(titleA);
  const wordsB = extractBengaliKeywords(titleB);
  if (wordsA.size === 0 || wordsB.size === 0) return 0;
  let shared = 0;
  for (const w of wordsA) {
    if (wordsB.has(w)) shared++;
  }
  return shared / Math.min(wordsA.size, wordsB.size);
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

function checkDuplicateStory(article, recentStories, threshold = 0.5) {
  const normalizedNew = normalizeUrl(article.link);

  for (const story of recentStories) {
    // Exact URL check
    if (story.normalizedUrl && story.normalizedUrl === normalizedNew) {
      return { isDuplicate: true, reason: `Exact URL match with recent story "${story.title}"` };
    }
    // Cross-source title similarity check
    const sim = calculateSimilarity(article.title, story.title);
    if (sim >= threshold) {
      return {
        isDuplicate: true,
        reason: `Headline ${Math.round(sim * 100)}% identical to recently posted story: "${story.title}"`
      };
    }
  }

  return { isDuplicate: false };
}

module.exports = {
  normalizeUrl,
  extractBengaliKeywords,
  calculateSimilarity,
  loadRecentStories,
  saveRecentStories,
  checkDuplicateStory
};
