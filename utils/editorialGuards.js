const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const QUARANTINE_FILE = path.join(DATA_DIR, 'quarantine_stories.json');
const NEUTRALITY_AUDIT_FILE = path.join(DATA_DIR, 'neutrality_audit.json');

// Comprehensive blocklist of outlets forbidden from sources, images, or attribution
// Owner judges these biased: Prothom Alo, Daily Star, Kaler Kantho, all Indian outlets, all Israeli outlets
const SOURCE_BLOCKLIST_DOMAINS = [
  // Prothom Alo (all feeds & subdomains)
  'prothomalo.com', 'images.prothomalo.com', 'media.prothomalo.com', 'assets.prothomalo.com', 'palo-images', 'palo.blob', 'prothomalo',
  // Daily Star
  'thedailystar.net', 'dailystar.net', 'daily-star', 'dailystar',
  // Kaler Kantho
  'kalerkantho.com', 'kaler-kantho', 'kalerkantho',
  // ALL Indian outlets
  'timesofindia.indiatimes.com', 'timesofindia', 'indiatimes.com',
  'ndtv.com', 'ndtv.in', 'ndtv',
  'thehindu.com', 'thehindu',
  'indianexpress.com', 'indianexpress',
  'hindustantimes.com', 'hindustantimes',
  'anandabazar.com', 'anandabazar',
  'zeenews.india.com', 'zeenews',
  'news18.com', 'news18',
  'indiatoday.in', 'indiatoday',
  'firstpost.com', 'firstpost',
  'theprint.in', 'theprint',
  'thewire.in', 'thewire',
  'republicworld.com', 'republicworld',
  // ALL Israeli outlets
  'haaretz.com', 'haaretz.co.il', 'haaretz',
  'timesofisrael.com', 'timesofisrael',
  'jpost.com', 'jerusalempost.com', 'jerusalempost',
  'ynetnews.com', 'ynet.co.il', 'ynet',
  'i24news.tv', 'i24news',
  'israelnationalnews.com', 'israelhayom.com'
];

/**
 * Check if a source URL, domain, or name is on the forbidden blocklist
 */
function isBlocklistedSource(url = '', sourceName = '') {
  const combined = (String(url) + ' ' + String(sourceName)).toLowerCase();
  for (const domain of SOURCE_BLOCKLIST_DOMAINS) {
    if (combined.includes(domain.toLowerCase())) {
      return { isBlocklisted: true, matchedDomain: domain };
    }
  }
  return { isBlocklisted: false, matchedDomain: null };
}

// Mapping approved and neutral source titles to authentic Bengali typography
const BENGALI_OUTLET_MAP = {
  'amar desh': 'আমার দেশ',
  'amardesh': 'আমার দেশ',
  'dailyamardesh': 'আমার দেশ',
  'ntv online': 'এনটিভি',
  'ntv': 'এনটিভি',
  'channel one': 'চ্যানেল ওয়ান',
  'channel one news': 'চ্যানেল ওয়ান',
  'channelone': 'চ্যানেল ওয়ান',
  'jamuna television': 'যমুনা টেলিভিশন',
  'jamuna tv': 'যমুনা টেলিভিশন',
  'bbc news বাংলা': 'বিবিসি বাংলা',
  'bbc news': 'বিবিসি বাংলা',
  'bbc news bangla': 'বিবিসি বাংলা',
  'bbc': 'বিবিসি বাংলা',
  'voa bangla': 'ভয়েস অব আমেরিকা (VOA বাংলা)',
  'voice of america': 'ভয়েস অব আমেরিকা (VOA বাংলা)',
  'voa': 'ভয়েস অব আমেরিকা (VOA বাংলা)',
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
 * Ensure article contains at least 3 substantive paragraphs by intelligently splitting or expanding
 */
function ensureMinimumParagraphs(paragraphs = [], summary = '') {
  let list = Array.isArray(paragraphs) ? [...paragraphs.filter(p => typeof p === 'string' && p.trim())] : [];
  if (typeof paragraphs === 'string' && paragraphs.trim()) {
    list = paragraphs.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  }

  if (list.length >= 3) return list;

  const expanded = [];
  for (const para of list) {
    const sentences = para.split(/(?<=[।?!])\s+/).filter(s => s.trim().length > 15);
    if (sentences.length >= 2 && (expanded.length + (list.length - 1)) < 3) {
      const mid = Math.ceil(sentences.length / 2);
      expanded.push(sentences.slice(0, mid).join(' '));
      expanded.push(sentences.slice(mid).join(' '));
    } else {
      expanded.push(para);
    }
  }

  if (expanded.length < 3 && summary && summary.trim()) {
    if (!expanded.some(p => p.includes(summary.trim().slice(0, 30)))) {
      expanded.unshift(summary.trim());
    }
  }

  return expanded;
}

/**
 * Validate entire article for editorial publishing
 */
function validateStoryEditorial(article) {
  // Check minimum 3 substantive paragraphs
  const paras = Array.isArray(article.paragraphs)
    ? article.paragraphs.filter(p => typeof p === 'string' && p.trim().length > 15)
    : [];
  if (paras.length < 3) {
    return {
      valid: false,
      reason: `Story has only ${paras.length} substantive paragraphs (minimum 3 substantive paragraphs required)`
    };
  }

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
 * Caption format v2 (replaces old caption spec)
 * Structure:
 * 🚨 ব্রেকিং নিউজ | [headline]    (or 📰 [headline] for non-breaking stories)
 * • [key point 1]
 * • [key point 2]
 * • [key point 3]
 * 
 * 📰 বিস্তারিত খবর কমেন্ট বক্সে 👇
 * 
 * #Jonobarta #BangladeshNews #Trending #[Bengali category tag]
 * 
 * HARD BANS:
 * - NO 📌 তথ্যসূত্র line
 * - NO সূত্র: line
 * - NO source name (NTV, Jamuna, Amar Desh, etc.)
 * - NO source URL
 * - NO article URL — anywhere!
 */
function buildFacebookCaptionV2(savedArticle) {
  const headline = (savedArticle.title || '').trim();
  const isBreaking = !!savedArticle.isBreaking;
  const headerLine = isBreaking ? `🚨 ব্রেকিং নিউজ | ${headline}` : `📰 ${headline}`;

  let points = [];
  if (Array.isArray(savedArticle.keyPoints) && savedArticle.keyPoints.length > 0) {
    points = savedArticle.keyPoints
      .map(p => String(p).trim().replace(/^[•\-\*]\s*/, ''))
      .filter(p => p.length > 10);
  }

  // Fallback: extract from paragraphs or summary if fewer than 3 key points
  if (points.length < 3) {
    const candidateSentences = [];
    if (savedArticle.summary) {
      candidateSentences.push(...savedArticle.summary.split(/(?<=[।?!])\s+/).map(s => s.trim().replace(/[।?!]+$/, '')).filter(Boolean));
    }
    if (Array.isArray(savedArticle.paragraphs)) {
      for (const p of savedArticle.paragraphs) {
        if (typeof p === 'string') {
          candidateSentences.push(...p.split(/(?<=[।?!])\s+/).map(s => s.trim().replace(/[।?!]+$/, '')).filter(Boolean));
        }
      }
    }

    for (const sent of candidateSentences) {
      if (points.length >= 3) break;
      const clean = sent.replace(/^[•\-\*]\s*/, '').trim();
      if (clean.length > 20 && !points.some(pt => pt.includes(clean.slice(0, 20)))) {
        points.push(clean);
      }
    }
  }

  // Ensure exactly 3 key points
  const fallbackPoints = [
    'ঘটনা প্রবাহের সার্বিক তথ্য ও সর্বশেষ পরিস্থিতি পর্যালোচনা',
    'সংশ্লিষ্ট কর্তৃপক্ষ ও দায়িত্বশীল মহলের পর্যবেক্ষণ',
    'আইনশৃঙ্খলা পরিস্থিতি স্বাভাবিক রাখতে নেওয়া হয়েছে বাড়তি সতর্কতা'
  ];
  while (points.length < 3) {
    points.push(fallbackPoints[points.length]);
  }

  const bulletLines = points.slice(0, 3).map(p => `• ${p}`).join('\n');
  const rawCat = (savedArticle.category || 'জাতীয়').replace(/\s+/g, '_');
  const categoryTag = `#${rawCat}`;

  let caption = `${headerLine}\n${bulletLines}\n\n📰 বিস্তারিত খবর কমেন্ট বক্সে 👇\n\n#Jonobarta #BangladeshNews #Trending ${categoryTag}`;

  // HARD BANS SANITIZATION:
  // 1. Strip any URLs (http/https/www/domains)
  caption = caption.replace(/https?:\/\/[^\s]+/gi, '');
  caption = caption.replace(/www\.[^\s]+/gi, '');

  // 2. Strip any 'তথ্যসূত্র' or 'সূত্র:' lines
  caption = caption.replace(/📌\s*তথ্যসূত্র[^\n]*/gi, '');
  caption = caption.replace(/তথ্যসূত্র[^\n]*/gi, '');
  caption = caption.replace(/সূত্র:[^\n]*/gi, '');
  caption = caption.replace(/সূত্র[^\n]*/gi, '');

  // 3. Strip any source outlet names
  const BANNED_OUTLETS_IN_CAPTION = [
    'আমার দেশ', 'দৈনিক আমার দেশ', 'Amar Desh',
    'এনটিভি', 'এনটিভি অনলাইন', 'NTV Online', 'NTV',
    'যমুনা টেলিভিশন', 'যমুনা টিভি', 'Jamuna TV', 'Jamuna Television',
    'চ্যানেল আই অনলাইন', 'চ্যানেল আই', 'Channel i Online', 'Channel i',
    'চ্যানেল ওয়ান', 'চ্যানেল ১', 'Channel One',
    'বিবিসি বাংলা', 'বিবিসি', 'BBC Bangla', 'BBC',
    'ভয়েস অব আমেরিকা', 'ভিওএ বাংলা', 'VOA Bangla', 'VOA',
    'দ্য বিজনেস স্ট্যান্ডার্ড', 'বিজনেস স্ট্যান্ডার্ড', 'TBS News', 'TBS',
    'বিডি২৪লাইভ', 'BD24Live',
    'প্রথম আলো', 'Prothom Alo',
    'দ্য ডেইলি স্টার', 'ডেইলি স্টার', 'The Daily Star', 'Daily Star',
    'কালের কণ্ঠ', 'Kaler Kantho',
    'রয়টার্স', 'এএফপি', 'বাসস', 'ইউএনবি'
  ];

  for (const src of BANNED_OUTLETS_IN_CAPTION) {
    const esc = src.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${esc}\\b`, 'gi');
    caption = caption.replace(regex, '');
  }

  // Clean excess spaces and formatting
  caption = caption.replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  return caption;
}

// Backward-compatible alias
const buildCleanFacebookCaption = buildFacebookCaptionV2;

// Neutrality checking keywords
const UNATTRIBUTED_LOADED_TERMS = [
  'কুখ্যাত', 'স্বৈরাচারী', 'ফ্যাসিস্ট', 'দালাল', 'বিশ্বাসঘাতক', 'খলনায়ক',
  'নরপিশাচ', 'মীরজাফর', 'দানবীয়', 'ধিক্কারজনক', 'কাপুরুষোচিত',
  'মহান নেতা', 'বীরোচিত', 'যুগান্তকারী বিজয়ের মহানায়ক', 'অবিসংবাদিত নেতা'
];

const ATTRIBUTION_VERBS = [
  'দাবি করেছেন', 'দাবি করেন', 'বলে দাবি', 'জানিয়েছেন', 'জানান', 'বলে জানান',
  'মন্তব্য করেছেন', 'মন্তব্য করেন', 'উল্লেখ করেছেন', 'উল্লেখ করেন',
  'অভিযোগ করেছেন', 'অভিযোগ করেন', 'বলে অভিযোগ', 'বলেন', 'বিবৃতিতে বলা হয়',
  'জানিয়েছে', 'জানায়'
];

/**
 * Second-pass neutrality check:
 * Ensures no un-attributed attack or praise language toward any party, person, or government.
 * Logs any flagged story to data/neutrality_audit.json.
 */
function validateStoryNeutrality(story) {
  const title = story.title || '';
  const summary = story.summary || '';
  const paras = Array.isArray(story.paragraphs) ? story.paragraphs.join(' ') : (story.paragraphs || '');
  const combined = `${title} ${summary} ${paras}`;

  const flagged = [];
  const sentences = combined.split(/(?<=[।?!])\s+/);

  for (const sent of sentences) {
    for (const term of UNATTRIBUTED_LOADED_TERMS) {
      if (sent.includes(term)) {
        const hasAttribution = ATTRIBUTION_VERBS.some(v => sent.includes(v));
        if (!hasAttribution) {
          flagged.push({ term, sentence: sent.trim() });
        }
      }
    }
  }

  if (flagged.length > 0) {
    try {
      if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
      let auditList = [];
      if (fs.existsSync(NEUTRALITY_AUDIT_FILE)) {
        try {
          auditList = JSON.parse(fs.readFileSync(NEUTRALITY_AUDIT_FILE, 'utf8'));
        } catch {}
      }
      auditList.unshift({
        timestamp: new Date().toISOString(),
        title: story.title || 'Untitled',
        flaggedTerms: flagged.map(f => f.term),
        details: flagged
      });
      fs.writeFileSync(NEUTRALITY_AUDIT_FILE, JSON.stringify(auditList.slice(0, 200), null, 2), 'utf8');
      console.warn(`[NEUTRALITY-PASS] Flagged loaded language in story "${title}": ${flagged.map(f => f.term).join(', ')}`);
    } catch (e) {
      console.error('[NEUTRALITY-PASS] Error logging neutrality audit:', e.message);
    }

    return { isNeutral: false, flaggedTerms: flagged.map(f => f.term), flagged };
  }

  return { isNeutral: true, flaggedTerms: [], flagged: [] };
}

module.exports = {
  sanitizeUnicodeAndMojibake,
  quarantineStory,
  resolveBengaliAttribution,
  scanAndCleanLatinWords,
  validateStoryEditorial,
  buildCleanFacebookCaption,
  buildFacebookCaptionV2,
  validateStoryNeutrality,
  ensureMinimumParagraphs,
  isBlocklistedSource,
  SOURCE_BLOCKLIST_DOMAINS,
  BENGALI_OUTLET_MAP,
  LATIN_WORD_TRANSLATIONS,
  QUARANTINE_FILE,
  NEUTRALITY_AUDIT_FILE
};
