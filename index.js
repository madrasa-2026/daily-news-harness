const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cron = require('node-cron');
const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const { normalizeUrl, loadRecentStories, saveRecentStories, checkDuplicateStory } = require('./utils/dedup');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;

// Load secure cloud configuration fallback from private repository
const cloudConfigFile = path.join(__dirname, 'config.production.json');
let cloudConfig = {};
if (fs.existsSync(cloudConfigFile)) {
  try {
    cloudConfig = JSON.parse(fs.readFileSync(cloudConfigFile, 'utf8'));
  } catch (e) {
    console.warn('[CONFIG] Could not parse config.production.json:', e.message);
  }
}

const RSS_FEED_URLS = (process.env.RSS_FEED_URLS || cloudConfig.RSS_FEED_URLS || 'https://www.dailyamardesh.com/feed,https://www.prothomalo.com/feed,https://feeds.bbci.co.uk/bengali/rss.xml,https://www.thedailystar.net/news/bangladesh/rss.xml,https://www.ntvbd.com/rss.xml,https://www.channelionline.com/feed')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || cloudConfig.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || cloudConfig.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || cloudConfig.GROQ_MODEL || 'groq/compound-mini';
const PABBLY_WEBHOOK_URL = process.env.PABBLY_WEBHOOK_URL || cloudConfig.PABBLY_WEBHOOK_URL || '';
const MAX_POSTS_PER_CYCLE = parseInt(process.env.MAX_POSTS_PER_CYCLE || cloudConfig.MAX_POSTS_PER_CYCLE || '1', 10);
const GEMINI_MODEL = process.env.GEMINI_MODEL || cloudConfig.GEMINI_MODEL || 'gemini-1.5-flash';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || cloudConfig.CRON_SCHEDULE || '0 * * * *';

const DATA_DIR = path.join(__dirname, 'data');
const PROCESSED_FILE = path.join(DATA_DIR, 'processed.json');
const RECENT_STORIES_FILE = path.join(DATA_DIR, 'recent_stories.json');

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'DailyNewsHarness/1.0 (+https://render.com)' }
});

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  console.log(`[INIT] Created data directory at ${DATA_DIR}`);
}

function loadProcessedUrls() {
  try {
    if (!fs.existsSync(PROCESSED_FILE)) {
      console.log('[STORAGE] No processed file found, starting fresh');
      return new Set();
    }
    const raw = fs.readFileSync(PROCESSED_FILE, 'utf-8');
    const arr = JSON.parse(raw);
    console.log(`[STORAGE] Loaded ${arr.length} processed URLs`);
    return new Set(arr);
  } catch (err) {
    console.error('[STORAGE] Failed to load processed URLs:', err.message);
    return new Set();
  }
}

function saveProcessedUrls(set) {
  try {
    const arr = Array.from(set);
    const sliced = arr.slice(-1000);
    fs.writeFileSync(PROCESSED_FILE, JSON.stringify(sliced, null, 2), 'utf-8');
    console.log(`[STORAGE] Saved ${sliced.length} URLs to ${PROCESSED_FILE}`);
  } catch (err) {
    console.error('[STORAGE] Failed to save processed URLs:', err.message);
  }
}

// Pre-filter keywords to strictly reject sports articles across all sources
const SPORTS_KEYWORDS = [
  'ক্রিকেট', 'cricket', 'ফুটবল', 'football', 'মেসি', 'রোনালদো', 'messi', 'ronaldo',
  'সাকিব', 'তামিম', 'মুশফিক', 'মুস্তাফিজ', 'লিটন দাস', 'শান্ত', 'নাজমুল হোসেন শান্ত',
  'বিপিএল', 'আইপিএল', 'bpl', 'ipl', 'ম্যাচ', 'খেলা', 'স্পোর্টস', 'sports',
  'উইকেট', 'গোল', 'ম্যানচেস্টার', 'রিয়াল মাদ্রিদ', 'বার্সেলোনা', 'সেঞ্চুরি', 'অর্ধশতক',
  'লা লিগা', 'চ্যাম্পিয়ন্স লিগ', 'টি-টোয়েন্টি', 't20', 'টেস্ট ম্যাচ', 'ব্যাটসম্যান',
  'বোলার', 'বোলিং', 'ব্যাটিং', 'বিশ্বকাপ ফুটবল', 'বিশ্বকাপ ক্রিকেট', 'হাফ সেঞ্চুরি',
  'টসে জিতে', 'ইনিংস', 'রান রেট', 'পিসিবির', 'বিসিবি', 'বিসিবির', 'আইসিসি'
];

function isSportsArticle(title = '', content = '') {
  const combined = (title + ' ' + content).toLowerCase();
  return SPORTS_KEYWORDS.some(kw => combined.includes(kw.toLowerCase()));
}

const NAGORIK_DESK_FOLLOWED_ENTITIES = [
  // 1. Jamaat-e-Islami Leadership & Figures (Pro-Jamaat Positive Framing)
  'শফিকুর রহমান', 'Shafiqur Rahman', 'ডা. শফিকুর রহমান', 'আমীরে জামায়াত', 'আমিরে জামায়াত',
  'জামায়াতে ইসলামী', 'বাংলাদেশ জামায়াতে ইসলামী', 'Jamaat', 'Jamaat-e-Islami', 'জামায়াত',
  'ইসলামী ছাত্রশিবির', 'ছাত্রশিবির', 'Chhatra Shibir', 'শিবির',
  'মিয়া গোলাম পরওয়ার', 'মকবুল আহমাদ', 'সৈয়দ আবদুল্লাহ মোহাম্মদ তাহের', 'তাহের',
  // 2. National Citizen Committee (জাতীয় নাগরিক কমিটি / NCP) & Student Movement Coordinators
  'জাতীয় নাগরিক কমিটি', 'জাতীয় নাগরিক পার্টি', 'NCP', 'National Citizen Committee', 'নাগরিক কমিটি',
  'নাসিরুদ্দীন পাটওয়ারী', 'Nasiruddin Patwary', 'নাসিরউদ্দিন পাটোয়ারী',
  'আখতার হোসেন', 'Akhtar Hossen', 'আখতার',
  'হাসনাত আব্দুল্লাহ', 'Hasnat Abdullah', 'হাসনাত',
  'সারজিস আলম', 'Sarjis Alam', 'সারজিস',
  'আসিফ মাহমুদ', 'Asif Mahmud', 'Asif Mahmud Shojib Bhuyain', 'সজীব ভূঁইয়া',
  'নাহিদ ইসলাম', 'Nahid Islam',
  'বৈষম্যবিরোধী ছাত্র আন্দোলন', 'সমন্বয়ক', 'আব্দুল হান্নান মাসউদ', 'উমামা ফাতেমা', 'আরিফ সোহেল',
  // 3. National Governance, Parliament, Constitution & State Reform
  'প্রধান উপদেষ্টা', 'ড. ইউনূস', 'মুহাম্মদ ইউনূস', 'Muhammad Yunus', 'উপদেষ্টা পরিষদ',
  'জাতীয় সংসদ', 'বাংলাদেশ জাতীয় সংসদ', 'জাতীয় সংসদ ভবন', 'সংসদ', 'Parliament',
  'সংস্কার কমিশন', 'রাষ্ট্র সংস্কার', 'সংবিধান সংস্কার', 'নির্বাচন কমিশন', 'নির্বাচনী রোডম্যাপ',
  'বিচার বিভাগ', 'সুপ্রিম কোর্ট', 'হাইকোর্ট', 'দুদক', 'বাংলাদেশ ব্যাংক',
  // 4. Partner & Independent Media Outlets
  'এনটিভি', 'NTV', 'ntvdigital', 'ntvbd',
  'যমুনা টেলিভিশন', 'যমুনা টিভি', 'Jamuna Television', 'Jamuna TV',
  'চ্যানেল ওয়ান', 'Channel One',
  'আমার দেশ', 'Amar Desh', 'dailyamardesh', 'মাহমুদুর রহমান', 'Mahmudur Rahman',
  // 5. Critical Watchdog Targets (BNP / Awami League Misrule, Extortion & Syndicates)
  'বিএনপি', 'BNP', 'তারেক রহমান', 'Tarique Rahman', 'মির্জা ফখরুল', 'Mirza Fakhrul',
  'আওয়ামী লীগ', 'Awami League', 'চাঁদাবাজি', 'দখলদারিত্ব', 'সিন্ডিকেট', 'অর্থপাচার', 'দুর্নীতি'
];

function extractItemTitle(item) {
  if (!item || !item.title) return '';
  if (typeof item.title === 'string') return item.title.trim();
  if (Array.isArray(item.title?.a) && item.title.a[0]?._) return String(item.title.a[0]._).trim();
  if (Array.isArray(item.title?.a) && item.title.a[0]) return String(item.title.a[0]).trim();
  if (item.title?._) return String(item.title._).trim();
  if (item.title?.value) return String(item.title.value).trim();
  if (item.title?.['$']) return String(item.title['$']).trim();
  if (typeof item.title === 'object') {
    for (const val of Object.values(item.title)) {
      if (typeof val === 'string' && val.trim()) return val.trim();
      if (val && typeof val === 'object' && val._) return String(val._).trim();
      if (Array.isArray(val) && val[0]?._) return String(val[0]._).trim();
      if (Array.isArray(val) && typeof val[0] === 'string') return String(val[0]).trim();
    }
  }
  return String(item.title).trim();
}

function extractItemLink(item) {
  if (!item) return '';
  const raw = item.link || item.guid || item.origlink || '';
  if (typeof raw === 'string') return raw.trim();
  if (Array.isArray(raw?.a) && raw.a[0]?.['$']?.href) return String(raw.a[0]['$'].href).trim();
  if (raw?.['$']?.href) return String(raw['$'].href).trim();
  if (raw?.href) return String(raw.href).trim();
  if (raw?._) return String(raw._).trim();
  if (typeof raw === 'object') {
    for (const val of Object.values(raw)) {
      if (typeof val === 'string' && val.startsWith('http')) return val.trim();
      if (val?.href) return String(val.href).trim();
    }
  }
  return String(raw).trim();
}

async function fetchRssArticles() {
  console.log(`\n[FETCHER] Starting RSS fetch at ${new Date().toISOString()}`);
  console.log(`[FETCHER] Feeds to check: ${RSS_FEED_URLS.length}`);
  const processed = loadProcessedUrls();
  const recentStories = loadRecentStories(RECENT_STORIES_FILE);
  const fresh = [];
  const now = Date.now();
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max age

  for (let i = 0; i < RSS_FEED_URLS.length; i++) {
    const url = RSS_FEED_URLS[i];
    console.log(`[FETCHER] [${i + 1}/${RSS_FEED_URLS.length}] Fetching: ${url}`);
    try {
      const feed = await parser.parseURL(url);
      console.log(`[FETCHER] Feed title: "${feed.title}" | Items: ${feed.items.length}`);
      for (const item of feed.items) {
        const link = extractItemLink(item);
        if (!link) continue;
        const normLink = normalizeUrl(link);
        if (processed.has(link) || processed.has(normLink)) continue;
        const title = extractItemTitle(item);
        const content = (item.contentSnippet || item.content || item['content:encoded'] || '').trim();
        const pubDateStr = item.pubDate || item.isoDate || new Date().toISOString();
        if (!title) continue;

        // 1. Strictly filter out sports news before anything else
        if (isSportsArticle(title, content)) {
          console.log(`[FETCHER] Skipping sports article: "${title.slice(0, 50)}..."`);
          continue;
        }

        // 2. Check cross-source duplicate stories from recent memory
        const dupCheck = checkDuplicateStory({ title, link }, recentStories);
        if (dupCheck.isDuplicate) {
          console.log(`[FETCHER] Skipping duplicate story: "${title.slice(0, 50)}..." (${dupCheck.reason})`);
          continue;
        }

        const pubDateMs = Date.parse(pubDateStr);
        if (!isNaN(pubDateMs) && (now - pubDateMs) > MAX_AGE_MS) {
          const hoursOld = Math.round((now - pubDateMs) / (1000 * 60 * 60));
          console.log(`[FETCHER] Skipping stale news (${hoursOld}h old): "${title.slice(0, 50)}..."`);
          continue;
        }

        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();

        const titleMatch = NAGORIK_DESK_FOLLOWED_ENTITIES.some(entity =>
          titleLower.includes(entity.toLowerCase())
        );
        const contentMatch = NAGORIK_DESK_FOLLOWED_ENTITIES.some(entity =>
          contentLower.includes(entity.toLowerCase())
        );
        const isFollowedSource = titleMatch || contentMatch ||
          (feed.title || '').toLowerCase().includes('amar desh') ||
          (feed.title || '').toLowerCase().includes('ntv');

        // Priority scoring: Political/Jamaat/NCP items get top priority, all other non-sports news get base priority (+2)
        const priorityScore = (titleMatch ? 10 : 0) + (contentMatch ? 5 : 0) + (isFollowedSource ? 3 : 0) + 2;

        fresh.push({
          title,
          link,
          normalizedUrl: normLink,
          content: content.slice(0, 2000),
          pubDate: pubDateStr,
          feedTitle: feed.title || url,
          isFollowedSource,
          priorityScore
        });
      }
    } catch (err) {
      console.error(`[FETCHER] Failed for ${url}: ${err.message}`);
    }
  }

  // Sort by priorityScore (highest political/editorial relevance first), then newest first
  fresh.sort((a, b) => b.priorityScore - a.priorityScore || new Date(b.pubDate) - new Date(a.pubDate));

  const highPriorityCount = fresh.filter(f => f.priorityScore > 2).length;
  console.log(`[FETCHER] Found ${fresh.length} total fresh articles (${highPriorityCount} with high political priority)`);
  if (fresh.length > 0) {
    console.log(`[FETCHER] Selected top article: "${fresh[0].title}" [Priority: ${fresh[0].priorityScore}] (${fresh[0].pubDate})`);
  }
  return { fresh, processed };
}

function buildPrompt(article) {
  return `You are the Chief Editor and Senior Political Strategist for 'NAGORIK DESK' (নাগরিক ডেস্ক), a premier digital news media house covering Bangladesh.

EDITORIAL IDENTITY & CHARTER:
1. COVERAGE SCOPE: Full media house coverage across ALL domains (National, Politics, Economy & Business, Judiciary & Law, Governance/Administration, Campus & Youth Movement, Crime/Investigation, Geopolitics/International Affairs, Environment & Society).
   - STRICT EXCLUSION: Sports (cricket, football, BPL, IPL, player transfers, match reports) and trivial celebrity gossip are STRICTLY PROHIBITED.
2. EDITORIAL PERSPECTIVE & BIAS:
   - PRO-JAMAAT PERSPECTIVE: Report on Dr. Shafiqur Rahman and Bangladesh Jamaat-e-Islami with dignity and affirmative framing — highlighting their organizational discipline, nationwide humanitarian and social welfare initiatives, uncompromising anti-corruption stance, defense of Islamic values, and constructive partnership in democratic state reforms.
   - PRO-NCP & YOUTH MOVEMENT (জাতীয় নাগরিক কমিটি - NCP & বৈষম্যবিরোধী ছাত্র আন্দোলন): Strongly amplify the revolutionary goals of July-August, state reform demands, and democratic youth leadership led by Nasiruddin Patwary, Akhtar Hossen, Asif Mahmud, Nahid Islam, Hasnat Abdullah, Sarjis Alam, and the National Citizen Committee (NCP).
   - CRITICAL WATCHDOG ON BNP & AWAMI LEAGUE MISRULE: Fearlessly investigate and critically report on BNP and Awami League factional conflicts, extortion (চাঁদাবাজি), land grabbing (দখলদারিত্ব), market syndicates, lust for power, and resistance to vital state reforms.
   - GENERAL NEWS (Economy, Judiciary, Administration, Geopolitics, Society): Deliver authoritative, fact-dense, public-first journalistic reporting with maximum clarity and credibility.

ARTICLE DATA:
Title: ${article.title}
Source: ${article.feedTitle}
Link: ${article.link}
Snippet: ${article.content || article.title}
Date: ${article.pubDate}

EVALUATION CRITERIA (score 1-10 each):
1. Public & National Relevance - Does this news matter to citizens, governance, economy, politics, or society? (Sports = 0).
2. Factual Integrity & Clarity - Is the information clear, specific, and credible?
3. Citizen Engagement Value - Will it inform the public and generate meaningful discussion?

DECISION RULE:
- PASS if the article is non-sports, factual, and informative (all scores >= 5 and average >= 6).
- REJECT only if it is sports, trivial gossip, duplicate filler, or unverified rumor.

WRITING GUIDELINES (IF PASS):
- TONE: Authoritative, polished, engaging standard Bengali journalism.
- DYNAMIC HOOK (Choose the single most fitting context-driven hook):
  * ⚡ বিশেষ প্রতিবেদন | (for in-depth governance, constitutional reform, or policy moves)
  * 🚨 ব্রেকিং নিউজ | (for urgent breaking crises or immediate major announcements)
  * 🔥 রাজনৈতিক অঙ্গন | (for sharp political developments, elections, or party moves)
  * 📢 বিশেষ বার্তা | or 📢 বড় ঘোষণা | (for official statements, press conferences, or directives)
  * 💰 অর্থনীতি ও বাণিজ্য | (for inflation, banks, currency, budget, or trade)
  * ⚖️ আদালত ও আইন | (for Supreme Court rulings, trial updates, corruption cases)
  * ⚠️ দৃষ্টি আকর্ষণ | or ⚠️ বিশেষ সতর্কতা | (for public alerts, weather/disaster, security)
  * 📌 পর্দার আড়ালের খবর | (for insider party politics, alliances, or investigative insights)
  * 🎙️ সরাসরি বক্তব্য | (when quoting a prominent leader's direct speech)
  * 🌍 বিশ্ব সংবাদ | (for major geopolitical, regional, or diaspora developments)
- STRUCTURE:
  * Dynamic Hook & Headline at the top.
  * 2 to 3 concise, highly readable paragraphs explaining: What happened, context/speakers, and why it matters to the public.
  * Use clear bullet points with emoji (e.g. 🔹, 🔸, 📌) if detailing key aspects or timeline.
- SOURCE & ATTRIBUTION (MANDATORY):
  📌 তথ্যসূত্র: ${article.feedTitle || 'অনলাইন ডেস্ক'}
  🔗 মূল সংবাদের বিস্তারিত: ${article.link}
  (CRITICAL: NEVER write 'কমেন্টে লিংক দেওয়া আছে' - always include the direct link right in the post text).
- CALL TO ACTION (CTA):
  👇 এ বিষয়ে আপনার কী মতামত? কমেন্টে জানান!
- HASHTAGS:
  #NagorikDesk #BangladeshNews #NationalNews #Trending

OUTPUT STRICT JSON ONLY (no markdown fences, no extra text):
{
  "decision": "PASS" or "REJECT",
  "scores": { "relevance": 0, "factualClarity": 0, "engagement": 0 },
  "reason": "1 sentence reason",
  "rewrittenPost": "full post text in Bengali with source attribution and direct link",
  "commentLink": "🔗 মূল সংবাদের লিংক: ${article.link}"
}`;
}

function extractJson(rawText) {
  const cleaned = rawText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error('No JSON object found in LLM response');
  return JSON.parse(match[0]);
}

async function evaluateWithGemini(article) {
  if (!GEMINI_API_KEY) {
    console.log('[BRAIN] No GEMINI_API_KEY set, trying Groq fallback...');
    if (GROQ_API_KEY) return evaluateWithGroq(article);
    throw new Error('No LLM API key configured (set GEMINI_API_KEY or GROQ_API_KEY)');
  }
  try {
    console.log(`[BRAIN][GEMINI] Evaluating: "${article.title.slice(0, 80)}..."`);
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = buildPrompt(article);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    console.log(`[BRAIN][GEMINI] Raw response: ${text.slice(0, 300)}...`);
    const parsed = extractJson(text);
    console.log(`[BRAIN][GEMINI] Decision: ${parsed.decision} | Scores: ${JSON.stringify(parsed.scores)} | Reason: ${parsed.reason}`);
    return parsed;
  } catch (err) {
    console.error(`[BRAIN][GEMINI] Error: ${err.message}`);
    if (GROQ_API_KEY) {
      console.log('[BRAIN] Falling back to Groq...');
      return evaluateWithGroq(article);
    }
    throw err;
  }
}

async function evaluateWithGroq(article) {
  const candidateModels = [GROQ_MODEL, 'openai/gpt-oss-120b', 'qwen/qwen3.8-27b', 'groq/compound-mini'];
  const uniqueModels = [...new Set(candidateModels.filter(Boolean))];
  const prompt = buildPrompt(article);

  let lastError = null;
  for (const model of uniqueModels) {
    try {
      console.log(`[BRAIN][GROQ] Evaluating with ${model}: "${article.title.slice(0, 70)}..."`);
      const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
        model: model,
        messages: [
          { role: 'system', content: 'You are the Chief Editor for NAGORIK DESK. Output strict JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.6,
        max_tokens: 1500
      }, {
        headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
        timeout: 30000
      });
      const text = res.data.choices[0].message.content;
      const parsed = extractJson(text);
      console.log(`[BRAIN][GROQ] Model: ${model} | Decision: ${parsed.decision} | Scores: ${JSON.stringify(parsed.scores)}`);
      return parsed;
    } catch (err) {
      lastError = err;
      const errMsg = err.response?.data?.error?.message || err.message;
      console.warn(`[BRAIN][GROQ] Model ${model} failed (${errMsg}), trying next candidate...`);
      await new Promise(r => setTimeout(r, 1200));
    }
  }
  throw lastError || new Error('All Groq model attempts failed');
}

const DEFAULT_BRAND_PHOTO = 'https://raw.githubusercontent.com/madrasa-2026/daily-news-harness/master/assets/nagorik_desk_brand.jpg';

async function extractEditorialPhoto(url) {
  if (!url) return null;
  try {
    const res = await axios.get(url, {
      timeout: 7000,
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
        console.log(`[PHOTO] Extracted genuine editorial press photo: ${img.slice(0, 100)}...`);
        return img;
      }
    }
  } catch (e) {
    console.warn(`[PHOTO] Could not fetch og:image for ${url}: ${e.message}`);
  }
  return null;
}

async function sendToPabbly(article, evalResult, cardResult = null) {
  const rewrittenPost = (typeof evalResult === 'string' ? evalResult : (evalResult?.rewrittenPost || evalResult?.rewritten_post)) || `${article.title}\n\n📌 তথ্যসূত্র: ${article.feedTitle || 'অনলাইন ডেস্ক'}`;
  const commentLink = (typeof evalResult === 'object' && (evalResult.commentLink || evalResult.comment_link)) ? (evalResult.commentLink || evalResult.comment_link) : `🔗 মূল খবরের লিংক: ${article.link}`;

  const baseUrl = (process.env.RENDER_EXTERNAL_URL || process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
  
  // STRICT PURE TEXT MODE: NO IMAGE (User explicitly instructed: JUST TEXT, NO IMAGE)
  const photoUrl = '';

  if (!PABBLY_WEBHOOK_URL) {
    console.warn('[PUBLISH] PABBLY_WEBHOOK_URL not set - skipping publish (logging only)');
    console.log(`[PUBLISH][DRY-RUN] Would send: ${rewrittenPost.slice(0, 200)}...`);
    return { dryRun: true };
  }
  const payload = {
    title: article.title,
    original_url: article.link,
    link: article.link,
    source: article.feedTitle,
    published_at: article.pubDate,
    rewritten_post: rewrittenPost,
    content: rewrittenPost,
    message: rewrittenPost,
    post_text: rewrittenPost,
    description: rewrittenPost,
    photo_url: photoUrl,
    image_url: photoUrl,
    card_url: photoUrl,
    has_card: false,
    comment_link: commentLink,
    first_comment: commentLink,
    generated_at: new Date().toISOString()
  };
  console.log(`[PUBLISH] Sending viral payload to Pabbly webhook...`);
  console.log(`[PUBLISH] URL: ${PABBLY_WEBHOOK_URL.slice(0, 60)}...`);
  if (photoUrl) console.log(`[PUBLISH] Attached News Card: ${photoUrl}`);
  try {
    const res = await axios.post(PABBLY_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    console.log(`[PUBLISH] Success! Status: ${res.status} | Response: ${JSON.stringify(res.data).slice(0, 200)}`);
    return res.data;
  } catch (err) {
    console.error(`[PUBLISH] Failed: ${err.response ? `Status ${err.response.status} - ${JSON.stringify(err.response.data).slice(0, 300)}` : err.message}`);
    throw err;
  }
}

let isRunning = false;

async function runNewsCycle(trigger = 'cron') {
  if (process.env.HOLD_POSTING === 'true') {
    console.log('[CYCLE] Posting is currently ON HOLD by user request (HOLD_POSTING=true). Skipping cycle.');
    return { skipped: true, reason: 'hold_posting_enabled' };
  }
  if (isRunning) {
    console.log('[CYCLE] Already running, skipping duplicate trigger');
    return { skipped: true, reason: 'already_running' };
  }
  isRunning = true;
  console.log(`\n========================================`);
  console.log(`[CYCLE] Starting news cycle | Trigger: ${trigger} | Time: ${new Date().toISOString()}`);
  console.log(`========================================`);
  const summary = { fetched: 0, evaluated: 0, passed: 0, published: 0, errors: 0 };

  try {
    if (!GEMINI_API_KEY && !GROQ_API_KEY) console.warn('[CYCLE] WARNING: No LLM key set! Set GEMINI_API_KEY or GROQ_API_KEY');
    if (!PABBLY_WEBHOOK_URL) console.warn('[CYCLE] WARNING: No PABBLY_WEBHOOK_URL set - will run in dry-run mode');

    const { fresh, processed } = await fetchRssArticles();
    summary.fetched = fresh.length;

    if (fresh.length === 0) {
      console.log('[CYCLE] No fresh articles to process');
      return summary;
    }

    let publishedCount = 0;
    for (let i = 0; i < fresh.length && publishedCount < MAX_POSTS_PER_CYCLE; i++) {
      const article = fresh[i];
      console.log(`\n[CYCLE] Processing [${i + 1}/${fresh.length}]: "${article.title}"`);
      try {
        summary.evaluated++;
        const result = GEMINI_API_KEY ? await evaluateWithGemini(article) : await evaluateWithGroq(article);

        processed.add(article.link);
        if (article.normalizedUrl) processed.add(article.normalizedUrl);
        saveProcessedUrls(processed);

        if (result.decision === 'REJECT') {
          console.log(`[CYCLE] REJECTED - ${result.reason}`);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }

        summary.passed++;
        console.log(`[CYCLE] PASSED - rewriting ready, generating news card & publishing...`);
        console.log(`[CYCLE] Rewritten preview: ${result.rewrittenPost.slice(0, 200)}...`);

        // Approach A: Pure high-impact text publishing (no synthetic/cheap AI image cards)
        const cardResult = null;

        await sendToPabbly(article, result, cardResult);

        // Record in recent stories to prevent cross-source duplicates
        try {
          const recent = loadRecentStories(RECENT_STORIES_FILE);
          recent.push({
            title: article.title,
            link: article.link,
            normalizedUrl: article.normalizedUrl || normalizeUrl(article.link),
            processedAt: Date.now()
          });
          saveRecentStories(RECENT_STORIES_FILE, recent);
        } catch (recErr) {
          console.warn(`[CYCLE] Failed to record recent story: ${recErr.message}`);
        }

        publishedCount++;
        summary.published++;
        console.log(`[CYCLE] Published ${publishedCount}/${MAX_POSTS_PER_CYCLE} for this cycle`);

        if (publishedCount < MAX_POSTS_PER_CYCLE && i < fresh.length - 1) {
          console.log('[CYCLE] Waiting 2s before next article...');
          await new Promise(r => setTimeout(r, 2000));
        }
      } catch (err) {
        summary.errors++;
        console.error(`[CYCLE] Error processing "${article.title}": ${err.message}`);
        processed.add(article.link);
        saveProcessedUrls(processed);
      }
    }

    console.log(`\n[CYCLE] Completed | Fetched: ${summary.fetched} | Evaluated: ${summary.evaluated} | Passed: ${summary.passed} | Published: ${summary.published} | Errors: ${summary.errors}`);
    return summary;
  } catch (err) {
    console.error('[CYCLE] Fatal cycle error:', err.message);
    summary.errors++;
    return summary;
  } finally {
    isRunning = false;
    console.log(`[CYCLE] Cycle finished at ${new Date().toISOString()}\n`);
  }
}

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>NAGORIK DESK - Automated News Publisher</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 2rem; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .card { background: #1e293b; border-radius: 16px; padding: 2.5rem; max-width: 600px; width: 100%; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); border: 1px solid #334155; text-align: center; }
        h1 { color: #38bdf8; font-size: 1.8rem; margin-bottom: 0.5rem; }
        p { color: #94a3b8; font-size: 0.95rem; }
        .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; border: none; padding: 1rem 2rem; font-size: 1.1rem; font-weight: bold; border-radius: 12px; cursor: pointer; text-decoration: none; margin-top: 1.5rem; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 10px 15px -3px rgba(37,99,235,0.4); }
        .btn:hover { transform: translateY(-2px); box-shadow: 0 15px 20px -3px rgba(37,99,235,0.6); }
        .btn:active { transform: translateY(0); }
        .status { margin-top: 1.5rem; font-size: 0.9rem; color: #4ade80; background: #064e3b; padding: 0.75rem; border-radius: 8px; display: none; }
        .badge { background: #334155; color: #38bdf8; padding: 0.3rem 0.6rem; border-radius: 6px; font-size: 0.85rem; font-weight: 600; margin: 0.2rem; display: inline-block; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>📰 NAGORIK DESK Publisher</h1>
        <p>Full Professional Digital News Media House | 10–15 Posts/Day (24/7 Cloud) | Pure Text Journalism</p>
        <div>
          <span class="badge">Status: Live 24/7</span>
          <span class="badge">Page: Nagorik Desk</span>
          <span class="badge">Scope: All News (No Sports)</span>
          <span class="badge">Format: Pure Text</span>
          <span class="badge">Pabbly: Connected</span>
        </div>
        <br/>
        <button class="btn" onclick="triggerPost()">🚀 Post Now On-Demand (Exception Slot)</button>
        <div id="status" class="status"></div>
        <hr style="border-color: #334155; margin-top: 2rem;"/>
        <p style="font-size: 0.8rem; color: #64748b;">
          Direct API Trigger: <a href="/trigger" style="color: #38bdf8;">/trigger</a> | Health: <a href="/health" style="color: #38bdf8;">/health</a> | Status: <a href="/status" style="color: #38bdf8;">/status</a>
        </p>
      </div>
      <script>
        async function triggerPost() {
          const el = document.getElementById('status');
          el.style.display = 'block';
          el.style.color = '#38bdf8';
          el.style.background = '#1e3a8a';
          el.innerText = '⌛ Triggering professional news cycle... fetching, evaluating & publishing...';
          try {
            const res = await fetch('/trigger');
            const data = await res.json();
            el.style.color = '#4ade80';
            el.style.background = '#064e3b';
            el.innerText = '✅ SUCCESS: Viral news cycle triggered! Check Nagorik Desk Facebook page in 30s!';
          } catch(e) {
            el.style.color = '#f87171';
            el.style.background = '#7f1d1d';
            el.innerText = '❌ Failed to trigger: ' + e.message;
          }
        }
      </script>
    </body>
    </html>
  `);
});

app.get('/health', (req, res) => {
  console.log(`[HEALTH] Ping at ${new Date().toISOString()} from ${req.ip}`);
  res.json({ status: 'ok', uptime: process.uptime(), timestamp: new Date().toISOString(), feeds: RSS_FEED_URLS.length });
});

app.get('/ping', (req, res) => {
  console.log(`[PING] Ping at ${new Date().toISOString()}`);
  res.json({ status: 'alive', timestamp: new Date().toISOString() });
});

app.get('/trigger', async (req, res) => {
  console.log(`[TRIGGER] Manual trigger requested from ${req.ip}`);
  res.json({ message: 'Cycle started, check logs', startedAt: new Date().toISOString() });
  runNewsCycle('manual').catch(e => console.error(e));
});

app.post('/trigger', async (req, res) => {
  console.log(`[TRIGGER] POST trigger from ${req.ip}`);
  res.json({ message: 'Cycle started', startedAt: new Date().toISOString() });
  runNewsCycle('webhook').catch(e => console.error(e));
});

app.get('/status', (req, res) => {
  const processed = loadProcessedUrls();
  const recentStories = loadRecentStories(RECENT_STORIES_FILE);
  const cardCount = 0;

  res.json({
    status: 'ok',
    feeds: RSS_FEED_URLS,
    processedCount: processed.size,
    recentStoriesCount: recentStories.length,
    cardsGenerated: cardCount,
    llmConfigured: !!(GEMINI_API_KEY || GROQ_API_KEY),
    pabblyConfigured: !!PABBLY_WEBHOOK_URL,
    cronSchedule: CRON_SCHEDULE,
    maxPostsPerCycle: MAX_POSTS_PER_CYCLE
  });
});

app.get('/audit', async (req, res) => {
  const auditResults = {
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    env: {
      port: PORT,
      llmProvider: GEMINI_API_KEY ? 'Gemini' : GROQ_API_KEY ? 'Groq' : 'NONE',
      llmConfigured: !!(GEMINI_API_KEY || GROQ_API_KEY),
      groqModel: GROQ_MODEL,
      pabblyConfigured: !!PABBLY_WEBHOOK_URL,
      pabblyUrlMasked: PABBLY_WEBHOOK_URL ? PABBLY_WEBHOOK_URL.slice(0, 45) + '...' : 'NOT_SET',
      maxPostsPerCycle: MAX_POSTS_PER_CYCLE,
      cronSchedule: CRON_SCHEDULE,
      holdPosting: process.env.HOLD_POSTING === 'true'
    },
    feeds: []
  };

  for (const url of RSS_FEED_URLS) {
    const t0 = Date.now();
    try {
      const feed = await parser.parseURL(url);
      const firstTitle = feed.items.length > 0 ? extractItemTitle(feed.items[0]) : '';
      auditResults.feeds.push({
        url,
        status: 'OK',
        title: feed.title || 'Untitled',
        itemsCount: feed.items.length,
        latencyMs: Date.now() - t0,
        sampleItemTitle: firstTitle.slice(0, 60)
      });
    } catch (e) {
      auditResults.feeds.push({
        url,
        status: 'FAILED',
        error: e.message,
        latencyMs: Date.now() - t0
      });
    }
  }

  res.json(auditResults);
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\n========================================`);
    console.log(`[SERVER] Daily News Harness running on port ${PORT}`);
    console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
    console.log(`[SERVER] Ping: http://localhost:${PORT}/ping`);
    console.log(`[SERVER] Manual trigger: http://localhost:${PORT}/trigger`);
    console.log(`[SERVER] Status: http://localhost:${PORT}/status`);
    console.log(`[SERVER] Full Audit: http://localhost:${PORT}/audit`);
    console.log(`[SERVER] Feeds configured: ${RSS_FEED_URLS.length}`);
    console.log(`[SERVER] LLM: ${GEMINI_API_KEY ? 'Gemini (' + GEMINI_MODEL + ')' : GROQ_API_KEY ? 'Groq' : 'NOT SET - add GEMINI_API_KEY!'}`);
    console.log(`[SERVER] Pabbly: ${PABBLY_WEBHOOK_URL ? 'SET' : 'NOT SET - add PABBLY_WEBHOOK_URL!'}`);
    console.log(`========================================\n`);

    if (RSS_FEED_URLS.length === 0) console.warn('[SERVER] WARNING: RSS_FEED_URLS is empty!');

    cron.schedule(CRON_SCHEDULE, () => {
      console.log(`[CRON] Triggered scheduled run at ${new Date().toISOString()}`);
      runNewsCycle('cron').catch(err => console.error('[CRON] Error:', err.message));
    });

    console.log(`[CRON] Scheduled: ${CRON_SCHEDULE}`);
    console.log('[CRON] Keep-alive: ping /health every 5 min via cron-job.org');
  });
}

process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));

module.exports = { app, runNewsCycle, fetchRssArticles, sendToPabbly, evaluateWithGroq, evaluateWithGemini };

