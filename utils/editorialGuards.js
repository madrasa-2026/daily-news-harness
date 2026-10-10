const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUARANTINE_FILE = path.join(DATA_DIR, 'quarantine_stories.json');

// Mapping all known source titles to authentic Bengali typography
const BENGALI_OUTLET_MAP = {
  'amar desh': 'আমার দেশ',
  'amardesh': 'আমার দেশ',
  'prothom alo': 'প্রথম আলো',
  'prothomalo': 'প্রথম আলো',
  'bbc news বাংলা': 'বিবিসি বাংলা',
  'bbc news': 'বিবিসি বাংলা',
  'bbc news bangla': 'বিবিসি বাংলা',
  'bbc': 'বিবিসি বাংলা',
  'the daily star': 'দ্য ডেইলি স্টার',
  'daily star': 'দ্য ডেইলি স্টার',
  'ntv online': 'এনটিভি',
  'ntv': 'এনটিভি',
  'channel i online': 'চ্যানেল আই',
  'channel i': 'চ্যানেল আই',
  'চ্যানেল আই অনলাইন': 'চ্যানেল আই',
  'bd24live': 'বিডি২৪লাইভ',
  'the business standard': 'দ্য বিজনেস স্ট্যান্ডার্ড',
  'tbs news': 'দ্য বিজনেস স্ট্যান্ডার্ড',
  'tbs': 'দ্য বিজনেস স্ট্যান্ডার্ড',
  'jugantor': 'যুগান্তর',
  'bangla tribune': 'বাংলা ট্রিবিউন',
  'dhaka tribune': 'ঢাকা ট্রিবিউন',
  'samakal': 'সমকাল',
  'kaler kantho': 'কালের কণ্ঠ',
  'kalerkantho': 'কালের কণ্ঠ',
  'ittefaq': 'ইত্তেফাক',
  'bdnews24': 'বিডিনিউজ২৪',
  'jonobarta': 'জনবার্তা ডেস্ক',
  'jonobarta desk': 'জনবার্তা ডেস্ক',
  'jonobarta online desk': 'জনবার্তা অনলাইন ডেস্ক'
};

// Common banking/journalistic Latin words translated to Bengali
const LATIN_WORD_TRANSLATIONS = {
  'depositor': 'আমানতকারী',
  'depositors': 'আমানতকারী',
  'liquidity': 'তারল্য',
  'inflation': 'মুদ্রাস্ফীতি',
  'remittance': 'রেমিট্যান্স',
  'default': 'খেলাপি',
  'defaulters': 'ঋণখেলাপি',
  'governor': 'গভর্নর',
  'reserve': 'রিজার্ভ',
  'reserves': 'রিজার্ভ',
  'bank': 'ব্যাংক',
  'banks': 'ব্যাংক',
  'loan': 'ঋণ',
  'loans': 'ঋণ',
  'crisis': 'সংকট',
  'corruption': 'দুর্নীতি',
  'cabinet': 'মন্ত্রিসভা',
  'election': 'নির্বাচন',
  'reform': 'সংস্কার',
  'commission': 'কমিশন',
  'protest': 'বিক্ষোভ',
  'police': 'পুলিশ',
  'court': 'আদালত'
};

/**
 * Unicode & Mojibake Sanitizer
 * Rejects or repairs any text containing U+FFFD () or mojibake byte patterns
 */
function sanitizeUnicodeAndMojibake(text = '', context = '') {
  if (typeof text !== 'string') return { ok: true, cleanText: '' };

  // 1. Check for U+FFFD (Replacement character)
  if (text.includes('\uFFFD')) {
    return {
      ok: false,
      cleanText: text,
      rejectedReason: `Contains U+FFFD replacement character in ${context}`
    };
  }

  // 2. Check for typical Latin-1 / UTF-8 mis-decoded mojibake patterns
  // (e.g. à¦, à§, Ã, Â, â€™)
  const mojibakeRegex = /(?:à¦|à§|Ã[\x80-\xBF]|Â[\x80-\xBF])/;
  if (mojibakeRegex.test(text)) {
    // Attempt automatic repair by decoding latin1 into utf8
    try {
      const repaired = Buffer.from(text, 'binary').toString('utf8');
      if (!mojibakeRegex.test(repaired) && !repaired.includes('\uFFFD')) {
        console.log(`[SANITIZER] Repaired mojibake in ${context}`);
        return { ok: true, cleanText: repaired };
      }
    } catch {}

    return {
      ok: false,
      cleanText: text,
      rejectedReason: `Unrepairable mojibake byte sequence detected in ${context}`
    };
  }

  // 3. Normalize Unicode to NFC standard
  const normalized = text.normalize('NFC');
  return { ok: true, cleanText: normalized };
}

/**
 * Log rejected stories to quarantine for review
 */
function quarantineStory(story, reason) {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    let quarantineList = [];
    if (fs.existsSync(QUARANTINE_FILE)) {
      try {
        quarantineList = JSON.parse(fs.readFileSync(QUARANTINE_FILE, 'utf8'));
      } catch {}
    }

    const entry = {
      timestamp: new Date().toISOString(),
      title: story.title || 'Untitled',
      sourceUrl: story.link || story.sourceUrl || '',
      feedTitle: story.feedTitle || '',
      reason,
      snippet: (story.content || story.summary || '').slice(0, 300)
    };

    quarantineList.unshift(entry);
    fs.writeFileSync(QUARANTINE_FILE, JSON.stringify(quarantineList.slice(0, 200), null, 2), 'utf8');
    console.warn(`[QUARANTINE] Story quarantined: "${entry.title}" -> ${reason}`);
  } catch (err) {
    console.error('[QUARANTINE] Failed to save quarantine entry:', err.message);
  }
}

/**
 * Convert any outlet name to authentic Bengali script
 */
function resolveBengaliAttribution(sourceName = '') {
  if (!sourceName) return 'জনবার্তা ডেস্ক';
  const clean = sourceName.trim().toLowerCase();
  for (const [eng, bng] of Object.entries(BENGALI_OUTLET_MAP)) {
    if (clean === eng || clean.includes(eng)) {
      return bng;
    }
  }
  return sourceName;
}

/**
 * Scan body text for stray Latin-script words and translate or sanitize
 */
function scanAndCleanLatinWords(text = '') {
  if (!text || typeof text !== 'string') return '';

  // Match English words with optional punctuation/case
  return text.replace(/\b([a-zA-Z]+)\b/g, (match, word) => {
    const lower = word.toLowerCase();
    // Known banking/news terms translation
    if (LATIN_WORD_TRANSLATIONS[lower]) {
      return LATIN_WORD_TRANSLATIONS[lower];
    }
    // Allow recognized international acronyms (AI, GDP, VAT, IMF, WHO, UN)
    if (/^(AI|GDP|VAT|IMF|WB|WHO|UN|NASA|USA|UK|EU|BBS|BB)$/i.test(word)) {
      return word.toUpperCase();
    }
    // Otherwise return as is or transliterate
    return match;
  });
}

/**
 * Validate entire article for editorial publishing
 */
function validateStoryEditorial(article) {
  const fieldsToCheck = [
    { name: 'title', val: article.title },
    { name: 'summary', val: article.summary },
    { name: 'rewrittenPost', val: article.rewrittenPost },
    { name: 'paragraphs', val: Array.isArray(article.paragraphs) ? article.paragraphs.join(' ') : article.paragraphs }
  ];

  for (const field of fieldsToCheck) {
    if (field.val) {
      const res = sanitizeUnicodeAndMojibake(field.val, field.name);
      if (!res.ok) {
        return {
          valid: false,
          reason: res.rejectedReason
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Build Facebook post caption with STRICT ZERO LINKS and NO 'তথ্যসূত্র'
 * Structure:
 * Line 1: Headline
 * Line 2: Blank line
 * Line 3: 2-line journalistic summary
 * Line 4: Blank line
 * Line 5: 📰 বিস্তারিত খবর কমেন্ট বক্সে 👇
 * Line 6: Blank line
 * Line 7: #জনবার্তা #${category} ${tags}
 *
 * ('তথ্যসূত্র' / attribution is explicitly omitted from Facebook caption!)
 */
function buildCleanFacebookCaption(savedArticle) {
  const headline = (savedArticle.title || '').trim();
  const summary = (savedArticle.summary || '').trim();
  const categoryTag = savedArticle.category ? `#${savedArticle.category.replace(/\s+/g, '_')}` : '';
  const extraTags = Array.isArray(savedArticle.tags)
    ? savedArticle.tags.filter(t => t && t !== 'জনবার্তা' && t !== savedArticle.category).slice(0, 3).map(t => `#${t.replace(/\s+/g, '_')}`).join(' ')
    : '';
  const hashtags = ['#জনবার্তা', categoryTag, extraTags].filter(Boolean).join(' ');

  let caption = `${headline}\n\n${summary}\n\n📰 বিস্তারিত খবর কমেন্ট বক্সে 👇\n\n${hashtags}`;

  // STRICT ZERO-LINK ENFORCEMENT: Strip any URLs
  caption = caption.replace(/https?:\/\/[^\s]+/gi, '');
  // STRICT EXCLUSION OF 'তথ্যসূত্র' / attribution from caption
  caption = caption.replace(/📌\s*তথ্যসূত্র[^\n]*/gi, '');
  caption = caption.replace(/তথ্যসূত্র[^\n]*/gi, '');
  caption = caption.replace(/সূত্র:[^\n]*/gi, '');
  // Clean up excess newlines
  caption = caption.replace(/\n{3,}/g, '\n\n').trim();

  return caption;
}

module.exports = {
  sanitizeUnicodeAndMojibake,
  quarantineStory,
  resolveBengaliAttribution,
  scanAndCleanLatinWords,
  validateStoryEditorial,
  buildCleanFacebookCaption,
  BENGALI_OUTLET_MAP,
  LATIN_WORD_TRANSLATIONS,
  QUARANTINE_FILE
};
