const { calculateSimilarity } = require('./dedup');

// Breaking news trigger patterns
const BREAKING_PATTERNS = [
  'ব্রেকিং',
  'আটক',
  'গ্রেফতার',
  'সংঘর্ষ',
  'হামলা',
  'বিক্ষোভ',
  'হত্যাকাণ্ড',
  'পদত্যাগ',
  'বিস্ফোরণ',
  'যুদ্ধ',
  'বিমান হামলা',
  'মিসাইল',
  'নিহত',
  'গাজা',
  'লেবানন',
  'ইরান',
  'দিল্লি',
  'ধ্রুব রাঠি',
  'জরুরি অবস্থা',
  'তেল ও গ্যাস'
];

// International news indicators
const INTERNATIONAL_KEYWORDS = [
  'আন্তর্জাতিক',
  'যুক্তরাষ্ট্র',
  'আমেরিকা',
  'ভারত',
  'চীন',
  'পাকিস্তান',
  'রাশিয়া',
  'রাশিয়া',
  'ইউক্রেন',
  'গাজা',
  'ফিলিস্তিন',
  'ইসরায়েল',
  'ইসরায়েল',
  'লেবানন',
  'ইরান',
  'মধ্যপ্রাচ্য',
  'জাতিসংঘ',
  'ইউরোপ',
  'ট্রাম্প',
  'বাইডেন',
  'মোদি',
  'পুতিন'
];

/**
 * Check if a story matches breaking news patterns
 */
function checkBreakingNews(title = '', content = '') {
  const combined = (title + ' ' + content).toLowerCase();
  for (const pat of BREAKING_PATTERNS) {
    if (combined.includes(pat.toLowerCase())) {
      return { isBreaking: true, pattern: pat };
    }
  }
  return { isBreaking: false, pattern: null };
}

/**
 * Check if story belongs to international category
 */
function isInternationalStory(title = '', content = '') {
  const combined = (title + ' ' + content).toLowerCase();
  for (const kw of INTERNATIONAL_KEYWORDS) {
    if (combined.includes(kw.toLowerCase())) {
      return true;
    }
  }
  return false;
}

/**
 * Score an individual story 0-100 on Recency, Importance signals, and Corroboration
 */
function scoreStory(article, allCandidates = []) {
  const title = article.title || '';
  const content = article.content || article.snippet || '';
  const pubDateStr = article.pubDate || article.isoDate;
  
  let recencyScore = 20;
  let isStale = false;
  let ageHours = null;

  if (pubDateStr) {
    const pubMs = Date.parse(pubDateStr);
    if (!isNaN(pubMs)) {
      ageHours = Math.max(0, (Date.now() - pubMs) / (1000 * 60 * 60));
      if (ageHours <= 2) {
        recencyScore = 40;
      } else if (ageHours <= 6) {
        recencyScore = 30;
      } else if (ageHours <= 12) {
        recencyScore = 15;
      } else {
        recencyScore = 0;
        isStale = true; // Stale: older than 12 hours
      }
    }
  }

  // 2. Importance Signals (0-40)
  let importanceScore = 0;
  const fullText = (title + ' ' + content).toLowerCase();

  // Casualties / Disasters / Fires / Explosions (+15)
  if (/(?:নিহত|মৃত|মৃত্যু|আহত|লাশ|ক্ষতিগ্রস্ত|\d+\s*জন|বিস্ফোরণ|আগুন|অগ্নিকাণ্ড|বোমা)/i.test(fullText)) {
    importanceScore += 15;
  }
  // Heads of State / Governance / Major Reforms (+15)
  if (/(?:প্রধান উপদেষ্টা|মুহাম্মদ ইউনূস|ড\. ইউনূস|রাষ্ট্রপতি|উপদেষ্টা পরিষদ|জাতীয় সংসদ|নির্বাচন কমিশন|সংস্কার কমিশন)/i.test(fullText)) {
    importanceScore += 15;
  }
  // Detentions / Extortion / Legal (+12)
  if (/(?:আটক|গ্রেফতার|রিমান্ড|দুদক|দুর্নীতি|চাঁদাবাজি|সিন্ডিকেট|অর্থপাচার|হাইকোর্ট|সুপ্রিম কোর্ট)/i.test(fullText)) {
    importanceScore += 12;
  }
  // Wars / Geopolitics / Clashes (+12)
  if (/(?:যুদ্ধ|হামলা|সংঘর্ষ|বিক্ষোভ|মিসাইল|গাজা|লেবানন|ইরান|ইসরায়েল)/i.test(fullText)) {
    importanceScore += 12;
  }
  // Economy / Banking (+10)
  if (/(?:বাংলাদেশ ব্যাংক|রিজার্ভ|মুদ্রাস্ফীতি|মূল্যবৃদ্ধি|রেমিট্যান্স|খেলাপি ঋণ)/i.test(fullText)) {
    importanceScore += 10;
  }
  importanceScore = Math.min(40, importanceScore);

  // 3. Corroboration (0-20): Appears across 2+ outlets (cross-outlet corroboration threshold 0.45)
  let corroborationScore = 0;
  let corroboratedBy = null;
  for (const other of allCandidates) {
    if (other !== article && other.title && other.feedTitle !== article.feedTitle) {
      const sim = calculateSimilarity(title, other.title);
      if (sim >= 0.45) {
        corroborationScore = 20;
        corroboratedBy = other.feedTitle;
        break;
      }
    }
  }

  // Penalties
  let penalty = 0;
  if (content.length < 70) {
    penalty += 15; // 1-sentence brief penalty
  }

  const breakingCheck = checkBreakingNews(title, content);
  if (breakingCheck.isBreaking) {
    importanceScore = Math.min(40, importanceScore + 15);
  }

  const totalScore = Math.max(0, Math.min(100, recencyScore + importanceScore + corroborationScore - penalty));

  return {
    score: totalScore,
    recencyScore,
    importanceScore,
    corroborationScore,
    isStale,
    ageHours: ageHours !== null ? Math.round(ageHours * 10) / 10 : null,
    corroboratedBy,
    isBreaking: breakingCheck.isBreaking,
    breakingPattern: breakingCheck.pattern,
    isInternational: isInternationalStory(title, content)
  };
}

/**
 * Rank all candidate stories and prioritize top scoring story
 */
function rankCandidates(candidates = []) {
  const scored = candidates.map(article => {
    const analysis = scoreStory(article, candidates);
    return {
      ...article,
      ...analysis
    };
  });

  // Filter out hard-stale stories (>12h) UNLESS national emergency/breaking
  const eligible = scored.filter(s => !s.isStale || s.isBreaking);
  const rejectedStale = scored.filter(s => s.isStale && !s.isBreaking);

  // Sort descending: breaking stories first, then highest score
  eligible.sort((a, b) => {
    if (a.isBreaking && !b.isBreaking) return -1;
    if (!a.isBreaking && b.isBreaking) return 1;
    return b.score - a.score;
  });

  return {
    ranked: eligible,
    topStory: eligible[0] || null,
    rejectedStale
  };
}

module.exports = {
  scoreStory,
  rankCandidates,
  checkBreakingNews,
  isInternationalStory,
  BREAKING_PATTERNS
};
