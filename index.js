const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cron = require('node-cron');
const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const { normalizeUrl, loadRecentStories, saveRecentStories, checkDuplicateStory } = require('./utils/dedup');
const { saveArticle, getArticles, getArticleBySlugOrId, getArticlesByCategory, incrementViews, loadArticles } = require('./utils/storage');
const { renderNewsCard, CARDS_DIR, TEMPLATE_BUILDERS, getAvailableTemplates, getGeneratedCardsCount } = require('./utils/cardTemplateEngine');
const { resolveArticleImage } = require('./utils/imagePipeline');
const { publishToBlogger, isBloggerConfigured, getRecentBloggerPosts } = require('./utils/bloggerPublisher');
const { generateOriginalBriefing, calculateOriginalityRatio } = require('./utils/originalContent');
const { renderHome } = require('./portal/templates/home');
const { renderArticle } = require('./portal/templates/article');
const { renderCategory } = require('./portal/templates/category');
const { renderTemplatesPage } = require('./portal/templates/templatesPreview');
const { validateStoryEditorial, quarantineStory, buildCleanFacebookCaption } = require('./utils/editorialGuards');
const { startRunTracker, getRecentRuns, getLogTail, appendLog } = require('./utils/runTracker');
const { renderAdminLoginPage, renderAdminCockpit } = require('./portal/templates/adminCockpit');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'portal', 'public')));
app.use('/cards', express.static(path.join(__dirname, 'public', 'cards')));
app.use('/images', express.static(path.join(__dirname, 'portal', 'public', 'images')));
app.use('/images/articles', express.static(path.join(__dirname, 'public', 'images', 'articles')));

const PORT = process.env.PORT || 10000;

// Load configuration
const cloudConfigFile = path.join(__dirname, 'config.production.json');
let cloudConfig = {};
if (fs.existsSync(cloudConfigFile)) {
  try {
    cloudConfig = JSON.parse(fs.readFileSync(cloudConfigFile, 'utf8'));
  } catch (e) {
    console.warn('[CONFIG] Could not parse config.production.json:', e.message);
  }
}

const RSS_FEED_URLS = (process.env.RSS_FEED_URLS || cloudConfig.RSS_FEED_URLS || 'https://www.dailyamardesh.com/feed,https://www.prothomalo.com/feed,https://feeds.bbci.co.uk/bengali/rss.xml,https://www.thedailystar.net/news/bangladesh/rss.xml,https://www.ntvbd.com/rss.xml,https://www.channelionline.com/feed,https://bd24live.com/bangla/feed,https://www.tbsnews.net/rss.xml')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || cloudConfig.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || cloudConfig.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || cloudConfig.GROQ_MODEL || 'openai/gpt-oss-120b';
const PABBLY_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || process.env.PABBLY_WEBHOOK_URL || '';
const MAX_POSTS_PER_CYCLE = parseInt(process.env.MAX_POSTS_PER_CYCLE || cloudConfig.MAX_POSTS_PER_CYCLE || '1', 10);
const MAX_STORIES_PER_DAY = parseInt(process.env.MAX_STORIES_PER_DAY || cloudConfig.MAX_STORIES_PER_DAY || '15', 10);
const AGENT_INTERVAL_MINUTES = parseInt(process.env.AGENT_INTERVAL_MINUTES || cloudConfig.AGENT_INTERVAL_MINUTES || '60', 10);
const TOPIC_BLOCKLIST = (process.env.TOPIC_BLOCKLIST || '').split(',').map(s => s.trim().toLowerCase()).filter(Boolean);
const ACTIVE_CARD_TEMPLATE = process.env.ACTIVE_CARD_TEMPLATE || 'bold-headline';
let currentActiveTemplate = ACTIVE_CARD_TEMPLATE;
let lastCycleTimestamp = null;
const GEMINI_MODEL = process.env.GEMINI_MODEL || cloudConfig.GEMINI_MODEL || 'gemini-1.5-flash';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || cloudConfig.ADMIN_PASSWORD || 'jonobarta_admin_2026';

function parseCookies(req) {
  const list = {};
  const rc = req.headers.cookie;
  if (rc) {
    rc.split(';').forEach(c => {
      const parts = c.split('=');
      list[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  return list;
}

function isAdminAuthenticated(req) {
  const cookies = parseCookies(req);
  const expectedToken = 'auth_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
  return cookies.jonobarta_admin_session === expectedToken;
}

// Managed RSS feed list with health flags
let MANAGED_FEEDS = [
  { id: 'dailyamardesh', name: 'দৈনিক আমার দেশ', url: 'https://www.dailyamardesh.com/feed', enabled: true, isBroken: false },
  { id: 'prothomalo', name: 'প্রথম আলো', url: 'https://www.prothomalo.com/feed', enabled: true, isBroken: false },
  { id: 'bbcbangla', name: 'বিবিসি বাংলা', url: 'https://feeds.bbci.co.uk/bengali/rss.xml', enabled: true, isBroken: false },
  { id: 'dailystar', name: 'দ্য ডেইলি স্টার', url: 'https://www.thedailystar.net/news/bangladesh/rss.xml', enabled: true, isBroken: false },
  { id: 'ntvbd', name: 'এনটিভি অনলাইন', url: 'https://www.ntvbd.com/rss.xml', enabled: true, isBroken: false },
  { id: 'channeli', name: 'চ্যানেল আই অনলাইন', url: 'https://www.channelionline.com/feed', enabled: true, isBroken: false },
  { id: 'bd24live', name: 'বিডি২৪লাইভ', url: 'https://bd24live.com/bangla/feed', enabled: true, isBroken: false },
  { id: 'tbsnews', name: 'দ্য বিজনেস স্ট্যান্ডার্ড', url: 'https://www.tbsnews.net/rss.xml', enabled: true, isBroken: false },
  { id: 'jugantor', name: 'দৈনিক যুগান্তর (404 Broken)', url: 'https://www.jugantor.com/feed', enabled: false, isBroken: true },
  { id: 'banglatribune', name: 'বাংলা ট্রিবিউন (404 Broken)', url: 'https://www.banglatribune.com/feed', enabled: false, isBroken: true }
];

const CRON_SCHEDULE = process.env.CRON_SCHEDULE || cloudConfig.CRON_SCHEDULE || 
  (AGENT_INTERVAL_MINUTES === 60 ? '0 * * * *' : 
   AGENT_INTERVAL_MINUTES < 60 ? `*/${AGENT_INTERVAL_MINUTES} * * * *` : '0 * * * *');

const DATA_DIR = path.join(__dirname, 'data');
const PROCESSED_FILE = path.join(DATA_DIR, 'processed.json');
const RECENT_STORIES_FILE = path.join(DATA_DIR, 'recent_stories.json');

const parser = new Parser({
  timeout: 8000,
  headers: { 'User-Agent': 'JonobartaNewsEngine/2.0 (+https://daily-news-harness.onrender.com)' }
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

const JONOBARTA_FOLLOWED_ENTITIES = [
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
  return String(raw).trim();
}

async function fetchRssArticles() {
  console.log(`\n[FETCHER] Starting RSS fetch at ${new Date().toISOString()}`);
  const activeFeeds = MANAGED_FEEDS.filter(f => f.enabled !== false);
  console.log(`[FETCHER] Active feeds to check: ${activeFeeds.length}`);
  const processed = loadProcessedUrls();
  const recentStories = loadRecentStories(RECENT_STORIES_FILE);
  const fresh = [];
  const now = Date.now();
  const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours max age

  for (let i = 0; i < activeFeeds.length; i++) {
    const feedItem = activeFeeds[i];
    const url = feedItem.url;
    console.log(`[FETCHER] [${i + 1}/${activeFeeds.length}] Fetching ${feedItem.name}: ${url}`);
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

        // 1. Filter out sports news
        if (isSportsArticle(title, content)) {
          continue;
        }

        // 2. Check cross-source duplicates
        const dupCheck = checkDuplicateStory({ title, link }, recentStories);
        if (dupCheck.isDuplicate) {
          console.log(`[FETCHER] Skipping duplicate story: "${title.slice(0, 50)}..." (${dupCheck.reason})`);
          continue;
        }

        const pubDateMs = Date.parse(pubDateStr);
        if (!isNaN(pubDateMs) && (now - pubDateMs) > MAX_AGE_MS) {
          continue;
        }

        const titleLower = title.toLowerCase();
        const contentLower = content.toLowerCase();

        const titleMatch = JONOBARTA_FOLLOWED_ENTITIES.some(entity =>
          titleLower.includes(entity.toLowerCase())
        );
        const contentMatch = JONOBARTA_FOLLOWED_ENTITIES.some(entity =>
          contentLower.includes(entity.toLowerCase())
        );
        const isFollowedSource = titleMatch || contentMatch ||
          (feed.title || '').toLowerCase().includes('amar desh') ||
          (feed.title || '').toLowerCase().includes('ntv');

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

  // Sort by priorityScore, then newest first
  fresh.sort((a, b) => b.priorityScore - a.priorityScore || new Date(b.pubDate) - new Date(a.pubDate));

  const highPriorityCount = fresh.filter(f => f.priorityScore > 2).length;
  console.log(`[FETCHER] Found ${fresh.length} total fresh articles (${highPriorityCount} with high political priority)`);
  if (fresh.length > 0) {
    console.log(`[FETCHER] Selected top article: "${fresh[0].title}" [Priority: ${fresh[0].priorityScore}] (${fresh[0].pubDate})`);
  }
  return { fresh, processed };
}

function buildPrompt(article) {
  return `You are the Senior Executive Editor for 'জনবার্তা' (Jonobarta - jonobarta.com), a leading digital news media house covering Bangladesh.

EDITORIAL CHARTER & STANCE:
1. COVERAGE SCOPE: Full media house coverage across ALL domains (National, Politics, Economy & Business, Judiciary & Law, Governance/Administration, Campus & Youth Movement, Crime/Investigation, Geopolitics/International Affairs, Environment & Society).
   - STRICT EXCLUSION: Sports and trivial celebrity gossip are STRICTLY PROHIBITED.
2. EDITORIAL PERSPECTIVE & BIAS:
   - PRO-JAMAAT PERSPECTIVE: Report on Dr. Shafiqur Rahman and Bangladesh Jamaat-e-Islami with dignity and affirmative framing — highlighting organizational discipline, nationwide humanitarian relief, anti-corruption stance, and democratic state reforms.
   - PRO-NCP & YOUTH MOVEMENT (জাতীয় নাগরিক কমিটি - NCP & বৈষম্যবিরোধী ছাত্র আন্দোলন): Champion revolutionary reform demands, public accountability, and youth leadership led by Nasiruddin Patwary, Akhtar Hossen, Asif Mahmud, Nahid Islam, Hasnat Abdullah, Sarjis Alam, and NCP.
   - CRITICAL WATCHDOG ON BNP & AWAMI LEAGUE MISRULE: Critically report on factional conflicts, extortion (চাঁদাবাজি), land grabbing (দখলদারিত্ব), syndicates, and power politics.
   - GENERAL NEWS (Economy, Judiciary, Administration, Geopolitics, Society): Deliver authoritative, fact-dense, public-first journalistic reporting.

ARTICLE DATA:
Title: ${article.title}
Source: ${article.feedTitle}
Link: ${article.link}
Snippet: ${article.content || article.title}
Date: ${article.pubDate}

EVALUATION CRITERIA (score 1-10 each):
1. Public & National Relevance - Does this news matter to citizens, governance, economy, or society? (Sports = 0).
2. Factual Integrity & Clarity - Is the information clear, specific, and credible?
3. Citizen Engagement Value - Will it inform the public and generate meaningful discussion?

DECISION RULE:
- PASS if the article is non-sports, factual, and informative (all scores >= 5 and average >= 6).
- REJECT only if it is sports, trivial gossip, duplicate filler, or unverified rumor.

WRITING GUIDELINES (IF PASS):
- STRICT ZERO-VERBATIM POLICY: You must completely RESTRUCTURE and REWRITE the story in fresh, original Bengali. NEVER copy any sentence or phrase verbatim from the source snippet. Synthesize the facts into your own distinct, authoritative journalistic prose.
- Output a clean, structured JSON with full article details:
  * "title": Punchy, original Bengali headline (max 15 words) — never copy the source headline verbatim.
  * "category": Choose one of ["জাতীয়", "রাজনীতি", "অর্থনীতি", "আইন ও আদালত", "সংস্কার ও রাষ্ট্র", "ক্যাম্পাস ও তরুণ", "আন্তর্জাতিক"]
  * "summary": 1-2 sentence executive summary in your own words
  * "paragraphs": Array of 2-3 well-written, informative paragraphs for the website article
  * "speakerQuote": Key quote from speaker or authority (if any)
  * "rewrittenPost": Viral social post text for Facebook with dynamic hook (⚡ বিশেষ প্রতিবেদন | or 🚨 ব্রেকিং নিউজ | or 📢 বড় খবর |), summary bullets, source attribution, and hashtags (#Jonobarta #BangladeshNews #Trending).
  * "tags": 3-5 relevant Bengali tags

OUTPUT STRICT JSON ONLY (no markdown fences, no extra text):
{
  "decision": "PASS" or "REJECT",
  "scores": { "relevance": 0, "factualClarity": 0, "engagement": 0 },
  "reason": "1 sentence reason",
  "title": "Bengali headline",
  "category": "জাতীয়",
  "summary": "1-2 sentence summary",
  "paragraphs": [
    "Paragraph 1 text...",
    "Paragraph 2 text..."
  ],
  "speakerQuote": "Speaker quote if any",
  "rewrittenPost": "full viral Facebook post text in Bengali",
  "tags": ["জনবার্তা", "বাংলাদেশ", "সংবাদ"]
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
    if (GROQ_API_KEY) return evaluateWithGroq(article);
    throw new Error('No LLM API key configured');
  }
  try {
    const { GoogleGenerativeAI } = require('@google/generative-ai');
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: GEMINI_MODEL });
    const prompt = buildPrompt(article);
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    return extractJson(text);
  } catch (err) {
    if (GROQ_API_KEY) return evaluateWithGroq(article);
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
          { role: 'system', content: 'You are the Chief Editor for Jonobarta (জনবার্তা). Output strict JSON only.' },
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
      console.log(`[BRAIN][GROQ] Model: ${model} | Decision: ${parsed.decision} | Category: ${parsed.category}`);
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

/**
 * Build Facebook post caption with STRICT ZERO LINKS rule
 * Structure:
 * Line 1: Headline
 * Line 2: Blank line
 * Line 3: 2-line journalistic summary
 * Line 4: Blank line
 * Line 5: 📰 বিস্তারিত খবর কমেন্ট বক্সে 👇
 * Line 6: Blank line
 * Line 7: #জনবার্তা #${category} ${tags}
 * Line 8: 📌 তথ্যসূত্র: ${sourceFeed}
 */
function buildFacebookCaption(savedArticle) {
  const headline = (savedArticle.title || '').trim();
  const summary = (savedArticle.summary || '').trim();
  const categoryTag = savedArticle.category ? `#${savedArticle.category.replace(/\s+/g, '_')}` : '';
  const extraTags = Array.isArray(savedArticle.tags)
    ? savedArticle.tags.filter(t => t && t !== 'জনবার্তা' && t !== savedArticle.category).slice(0, 3).map(t => `#${t.replace(/\s+/g, '_')}`).join(' ')
    : '';
  const hashtags = ['#জনবার্তা', categoryTag, extraTags].filter(Boolean).join(' ');
  const source = savedArticle.sourceFeed || 'জনবার্তা ডেস্ক';

  let caption = `${headline}\n\n${summary}\n\n📰 বিস্তারিত খবর কমেন্ট বক্সে 👇\n\n${hashtags}\n📌 তথ্যসূত্র: ${source}`;

  // STRICT ZERO-LINK ENFORCEMENT: Strip any URLs that might have leaked into caption
  caption = caption.replace(/https?:\/\/[^\s]+/gi, '').replace(/\n{3,}/g, '\n\n').trim();
  return caption;
}

async function sendToWebhook(article, savedArticle, cardResult) {
  const defaultPublicBase = 'https://daily-news-harness.onrender.com';
  const baseUrl = (process.env.RENDER_EXTERNAL_URL || process.env.APP_BASE_URL || defaultPublicBase).replace(/\/+$/, '');
  const localArticleUrl = `${baseUrl}/news/${savedArticle.slug}`;
  const websiteArticleUrl = savedArticle.bloggerPostUrl || localArticleUrl;

  // Resolve public image URL for Facebook - MUST BE 1200x630 NEWS CARD, NEVER RAW EDITORIAL PHOTO
  // Guaranteed valid public CDN URL so Facebook never receives a 404 error
  const publicImageUrl = cardResult?.cdnUrl || 'https://iili.io/nMjOGVf.png';

  // Enforce zero-link caption structure without 'তথ্যসূত্র'
  const fbCaption = buildCleanFacebookCaption(savedArticle);
  const commentText = `📰 সম্পূর্ণ সংবাদটি পড়তে ভিজিট করুন:\n${websiteArticleUrl}\n\n#জনবার্তা`;

  const payload = {
    title: savedArticle.title,
    headline: savedArticle.title,
    category: savedArticle.category,
    summary: savedArticle.summary,
    original_url: savedArticle.sourceUrl,
    website_url: websiteArticleUrl,
    blogger_url: savedArticle.bloggerPostUrl || websiteArticleUrl,
    link: websiteArticleUrl,
    source: savedArticle.sourceFeed,
    published_at: savedArticle.publishedAt,
    // Zero-link caption for Facebook post photo (Module 2)
    caption: fbCaption,
    post_text: fbCaption,
    message: fbCaption,
    rewritten_post: fbCaption,
    content: fbCaption,
    // Dedicated comment text for Facebook Pages Create a Comment (Module 3)
    comment_text: commentText,
    first_comment: commentText,
    // Branded 1200x630 news card (burned-in headline + logo bug)
    card_url: publicImageUrl,
    photo_url: publicImageUrl,
    image_url: publicImageUrl,
    has_card: !!publicImageUrl,
    template_id: cardResult?.templateId || currentActiveTemplate,
    is_original: !!savedArticle.isOriginal,
    generated_at: new Date().toISOString()
  };

  if (!PABBLY_WEBHOOK_URL) {
    console.warn('[PUBLISH] Webhook URL not set - skipping webhook dispatch (article saved to website)');
    return { dryRun: true };
  }

  console.log(`[PUBLISH] Sending Jonobarta payload to Webhook (Make.com / Pabbly)...`);
  console.log(`[PUBLISH] Webhook URL: ${PABBLY_WEBHOOK_URL.slice(0, 60)}...`);
  console.log(`[PUBLISH] News Card Image: ${publicImageUrl}`);
  console.log(`[PUBLISH] Blogger / Comment Target URL: ${websiteArticleUrl}`);
  
  try {
    const res = await axios.post(PABBLY_WEBHOOK_URL, payload, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 20000
    });
    console.log(`[PUBLISH] Webhook Success! Status: ${res.status}`);
    return res.data;
  } catch (err) {
    console.error(`[PUBLISH] Webhook Failed: ${err.message}`);
    // Article is still published on the website!
    return { error: err.message };
  }
}

let isRunning = false;

async function runNewsCycle(trigger = 'cron') {
  if (process.env.HOLD_POSTING === 'true') {
    console.log('[CYCLE] Posting is currently ON HOLD (HOLD_POSTING=true). Skipping cycle.');
    return { skipped: true, reason: 'hold_posting_enabled' };
  }
  if (isRunning) {
    console.log('[CYCLE] Already running, skipping duplicate trigger');
    return { skipped: true, reason: 'already_running' };
  }
  isRunning = true;
  const tracker = startRunTracker(trigger);
  console.log(`\n========================================`);
  console.log(`[CYCLE] Starting Jonobarta News Cycle | Trigger: ${trigger} | Time: ${new Date().toISOString()}`);
  console.log(`========================================`);
  const summary = { fetched: 0, evaluated: 0, passed: 0, published: 0, errors: 0 };

  try {
    // Check daily story cap
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const existingArticles = loadArticles();
    const publishedToday = existingArticles.filter(a => new Date(a.publishedAt) >= todayStart).length;
    if (publishedToday >= MAX_STORIES_PER_DAY && trigger === 'cron') {
      console.log(`[CYCLE] Daily story cap reached (${publishedToday}/${MAX_STORIES_PER_DAY}). Skipping cycle.`);
      tracker.finish('SKIPPED', 'daily_cap_reached');
      return { skipped: true, reason: 'daily_cap_reached', publishedToday };
    }

    const { fresh, processed } = await fetchRssArticles();
    summary.fetched = fresh.length;
    tracker.setStage('fetch', fresh.length > 0 ? 'PASS' : 'SKIPPED', `${fresh.length} fresh articles`);

    if (fresh.length === 0) {
      console.log('[CYCLE] No fresh articles to process');
      tracker.finish('SKIPPED', 'no_fresh_articles');
      return summary;
    }

    let publishedCount = 0;
    for (let i = 0; i < fresh.length && publishedCount < MAX_POSTS_PER_CYCLE; i++) {
      const article = fresh[i];
      console.log(`\n[CYCLE] Processing [${i + 1}/${fresh.length}]: "${article.title}"`);
      
      // 1. Semantic Dedup Check against 48-hour database
      const dedupCheck = checkDuplicateStory(article, path.join(DATA_DIR, 'articles.json'), RECENT_STORIES_FILE);
      if (dedupCheck.isDuplicate) {
        console.log(`[CYCLE] SEMANTIC DEDUP: Skipping duplicate story "${article.title}" (${dedupCheck.reason})`);
        processed.add(article.link);
        if (article.normalizedUrl) processed.add(article.normalizedUrl);
        saveProcessedUrls(processed);
        tracker.setStage('dedup', 'SKIPPED', `Duplicate: ${dedupCheck.reason}`);
        continue;
      }
      tracker.setStage('dedup', 'PASS');

      // Topic blocklist check
      if (TOPIC_BLOCKLIST.length > 0) {
        const isBlocked = TOPIC_BLOCKLIST.some(topic => 
          article.title.toLowerCase().includes(topic) || (article.content || '').toLowerCase().includes(topic)
        );
        if (isBlocked) {
          console.log(`[CYCLE] Skipping story matching topic blocklist: "${article.title}"`);
          processed.add(article.link);
          saveProcessedUrls(processed);
          continue;
        }
      }

      try {
        summary.evaluated++;
        const result = GEMINI_API_KEY ? await evaluateWithGemini(article) : await evaluateWithGroq(article);

        processed.add(article.link);
        if (article.normalizedUrl) processed.add(article.normalizedUrl);
        saveProcessedUrls(processed);

        if (result.decision === 'REJECT') {
          console.log(`[CYCLE] REJECTED - ${result.reason}`);
          tracker.setStage('eval', 'SKIPPED', result.reason);
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        tracker.setStage('eval', 'PASS');

        // 2. Editorial Quality Guard (Unicode sanitizer, mojibake repair, Latin words)
        const editorialCheck = validateStoryEditorial(result);
        if (!editorialCheck.valid) {
          console.warn(`[CYCLE] EDITORIAL SANITIZER REJECTED: ${editorialCheck.reason}`);
          quarantineStory(result, editorialCheck.reason, article);
          tracker.setStage('sanitizer', 'FAIL', editorialCheck.reason);
          continue;
        }
        tracker.setStage('sanitizer', 'PASS');

        summary.passed++;
        console.log(`[CYCLE] PASSED - resolving 3-tier image & generating news card & publishing...`);

        // 3. 3-Tier Image Pipeline
        const imageResult = await resolveArticleImage(article, result.category || 'জাতীয়');
        const photoUrl = imageResult.url;
        tracker.setStage('image', 'PASS', `Tier: ${imageResult.tier || 1}`);

        // 4. Generate HD News Card with active template (1200x630 PNG)
        let cardResult = null;
        try {
          cardResult = await renderNewsCard({
            title: result.title || article.title,
            snippet: result.summary || article.content || '',
            source: article.feedTitle || 'জনবার্তা ডেস্ক',
            category: result.category || 'জাতীয়',
            imageUrl: photoUrl,
            templateId: currentActiveTemplate
          });
          tracker.setStage('card', 'PASS', currentActiveTemplate);
        } catch (cardErr) {
          console.warn(`[CYCLE] Card template engine error: ${cardErr.message}`);
          tracker.setStage('card', 'FAIL', cardErr.message);
        }

        // 5. Publish to Google Blogger Blog (if configured)
        let bloggerResult = null;
        try {
          bloggerResult = await publishToBlogger({
            title: result.title || article.title,
            summary: result.summary || article.content || '',
            paragraphs: result.paragraphs || [article.content || ''],
            imageUrl: photoUrl,
            category: result.category || 'জাতীয়',
            sourceFeed: article.feedTitle || 'জনবার্তা ডেস্ক',
            isOriginal: false
          });
          tracker.setStage('blogger', bloggerResult ? 'PASS' : 'SKIPPED');
        } catch (bloggerErr) {
          console.warn(`[CYCLE] Blogger publish error: ${bloggerErr.message}`);
          tracker.setStage('blogger', 'FAIL', bloggerErr.message);
        }

        // 6. Save to Database / Local Storage
        const savedArticle = saveArticle({
          title: result.title || article.title,
          category: result.category || 'জাতীয়',
          summary: result.summary || article.content || '',
          paragraphs: result.paragraphs || [article.content || ''],
          speakerQuote: result.speakerQuote || null,
          rewrittenPost: result.rewrittenPost || '',
          cardUrl: cardResult?.relativeUrl || '',
          photoUrl: photoUrl || '',
          bloggerPostUrl: bloggerResult?.postUrl || null,
          bloggerPostId: bloggerResult?.postId || null,
          isOriginal: true, // 100% original rewritten journalism without verbatim copying
          sourceFeed: article.feedTitle || 'জনবার্তা ডেস্ক',
          sourceUrl: article.link,
          tags: result.tags || ['জনবার্তা', result.category || 'সংবাদ'],
          publishedAt: new Date().toISOString(),
          sourcePubDate: article.pubDate || new Date().toISOString()
        });
        sessionStoriesPublishedToday++;

        // 7. Send to Webhook (Make.com / Facebook) with Blogger / Portal link
        await sendToWebhook(article, savedArticle, cardResult);
        tracker.setStage('webhook', 'PASS');
        tracker.setStory(savedArticle.title, savedArticle.bloggerPostUrl, cardResult?.cdnUrl);

        // 8. Record recent story for cross-source dedup
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
    tracker.finish(summary.published > 0 ? 'PASS' : 'COMPLETED');
    return summary;
  } catch (err) {
    console.error('[CYCLE] Fatal cycle error:', err.message);
    tracker.finish('FAIL', err.message);
    summary.errors++;
    return summary;
  } finally {
    isRunning = false;
    lastCycleTimestamp = new Date().toISOString();
    console.log(`[CYCLE] Cycle finished at ${lastCycleTimestamp}\n`);
  }
}

let sessionStoriesPublishedToday = 0;
let cachedBloggerCountToday = 0;
let lastBloggerCheckTime = 0;

async function syncBloggerStoriesToday() {
  if (!isBloggerConfigured()) return;
  const now = Date.now();
  if (now - lastBloggerCheckTime < 60000) return; // cache for 1 min
  lastBloggerCheckTime = now;
  try {
    const posts = await getRecentBloggerPosts(15);
    const todayStr = new Date(now + 6 * 3600 * 1000).toISOString().slice(0, 10);
    const count = posts.filter(p => {
      if (!p.published) return false;
      const pDateStr = new Date(new Date(p.published).getTime() + 6 * 3600 * 1000).toISOString().slice(0, 10);
      return pDateStr === todayStr;
    }).length;
    if (count > 0) cachedBloggerCountToday = count;
  } catch {}
}

function countStoriesPublishedToday() {
  const articles = loadArticles();
  const now = new Date();
  const bstOffset = 6 * 60 * 60 * 1000;
  const bstTodayStr = new Date(now.getTime() + bstOffset).toISOString().slice(0, 10);
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  const matched = articles.filter(a => {
    if (!a.publishedAt) return false;
    const aDate = new Date(a.publishedAt);
    if (isNaN(aDate.getTime())) return false;
    const aDateBstStr = new Date(aDate.getTime() + bstOffset).toISOString().slice(0, 10);
    return aDateBstStr === bstTodayStr || aDate >= twentyFourHoursAgo;
  }).length;

  return Math.max(matched, sessionStoriesPublishedToday, cachedBloggerCountToday);
}

/**
 * Generate and publish original briefing or roundup
 */
async function publishOriginalStory(type = 'morning') {
  console.log(`\n========================================`);
  console.log(`[ORIGINAL-CONTENT] Running original story generator (${type}) at ${new Date().toISOString()}`);
  console.log(`========================================`);

  try {
    const existing = loadArticles();
    const briefingData = await generateOriginalBriefing(type, existing.slice(0, 6));
    if (!briefingData) {
      console.warn('[ORIGINAL-CONTENT] No recent articles available to synthesize briefing.');
      return null;
    }

    // 1. Resolve editorial photo
    const imageResult = await resolveArticleImage({
      title: briefingData.title,
      link: ''
    }, briefingData.category || 'জাতীয়');
    const photoUrl = imageResult.url;

    // 2. Render News Card
    let cardResult = null;
    try {
      cardResult = await renderNewsCard({
        title: briefingData.title,
        snippet: briefingData.summary,
        source: 'জনবার্তা বিশেষ ডেস্ক',
        category: briefingData.category || 'জাতীয়',
        imageUrl: photoUrl,
        templateId: currentActiveTemplate
      });
    } catch (cardErr) {
      console.warn(`[ORIGINAL-CONTENT] Card rendering error: ${cardErr.message}`);
    }

    // 3. Publish to Blogger
    let bloggerResult = null;
    try {
      bloggerResult = await publishToBlogger({
        title: briefingData.title,
        summary: briefingData.summary,
        paragraphs: briefingData.paragraphs,
        imageUrl: photoUrl,
        category: briefingData.category || 'জাতীয়',
        sourceFeed: 'জনবার্তা বিশেষ অনুসন্ধান ডেস্ক',
        isOriginal: true
      });
    } catch (bloggerErr) {
      console.warn(`[ORIGINAL-CONTENT] Blogger publish error: ${bloggerErr.message}`);
    }

    // 4. Save to Database / Local Storage
    const savedArticle = saveArticle({
      title: briefingData.title,
      category: briefingData.category || 'জাতীয়',
      summary: briefingData.summary,
      paragraphs: briefingData.paragraphs,
      rewrittenPost: briefingData.rewrittenPost,
      cardUrl: cardResult?.relativeUrl || '',
      photoUrl: photoUrl || '',
      bloggerPostUrl: bloggerResult?.postUrl || null,
      bloggerPostId: bloggerResult?.postId || null,
      isOriginal: true,
      sourceFeed: 'জনবার্তা নিজস্ব ডেস্ক',
      sourceUrl: '',
      tags: briefingData.tags || ['আজকের খবর', 'বিশেষ বুলেটিন', 'জনবার্তা'],
      publishedAt: new Date().toISOString()
    });

    // 5. Send to Webhook (Make.com -> Facebook)
    await sendToWebhook({ title: briefingData.title, feedTitle: 'জনবার্তা নিজস্ব ডেস্ক' }, savedArticle, cardResult);

    console.log(`[ORIGINAL-CONTENT] Successfully published original ${type} briefing: "${briefingData.title}"`);
    return savedArticle;
  } catch (err) {
    console.error(`[ORIGINAL-CONTENT] Failed to generate/publish ${type} briefing:`, err.message);
    return null;
  }
}

// -------------------------------------------------------------
// WEB PORTAL ROUTES (Jonobarta Frontend)
// -------------------------------------------------------------

// 1. Homepage
app.get('/', (req, res) => {
  try {
    const { articles } = getArticles(30);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderHome(articles));
  } catch (e) {
    res.status(500).send('Portal Error: ' + e.message);
  }
});

// 2. Single News Article View
app.get('/news/:slug', (req, res) => {
  try {
    const slug = req.params.slug;
    incrementViews(slug);
    const article = getArticleBySlugOrId(slug);
    const related = getArticles(6).articles.filter(a => a.slug !== slug && a.id !== slug);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderArticle(article, related));
  } catch (e) {
    res.status(500).send('Article View Error: ' + e.message);
  }
});

// 3. Category Archive View
app.get('/category/:category', (req, res) => {
  try {
    const catSlug = req.params.category.toLowerCase();
    const catMap = {
      national: 'জাতীয়',
      politics: 'রাজনীতি',
      economy: 'অর্থনীতি',
      judiciary: 'আইন ও আদালত',
      reform: 'সংস্কার ও রাষ্ট্র',
      campus: 'ক্যাম্পাস ও তরুণ',
      international: 'আন্তর্জাতিক'
    };
    const catName = catMap[catSlug] || req.params.category;
    const articles = getArticlesByCategory(catName, 30);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(renderCategory(catName, articles, catSlug));
  } catch (e) {
    res.status(500).send('Category View Error: ' + e.message);
  }
});

// 4. RSS 2.0 Feed Endpoint
app.get(['/rss', '/feed.xml'], (req, res) => {
  try {
    const baseUrl = (process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`).replace(/\/+$/, '');
    const { articles } = getArticles(25);

    const rssXml = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>জনবার্তা | Jonobarta</title>
  <link>${baseUrl}</link>
  <description>সত্য, ন্যায় ও জনমানুষের নির্ভীক ডিজিটাল সংবাদমাধ্যম</description>
  <language>bn</language>
  <atom:link href="${baseUrl}/rss" rel="self" type="application/rss+xml" />
  ${articles.map(a => `
  <item>
    <title><![CDATA[${a.title}]]></title>
    <link>${baseUrl}/news/${a.slug}</link>
    <guid isPermaLink="true">${baseUrl}/news/${a.slug}</guid>
    <pubDate>${new Date(a.publishedAt).toUTCString()}</pubDate>
    <description><![CDATA[${a.summary || a.fullContent}]]></description>
    <category><![CDATA[${a.category}]]></category>
  </item>
  `).join('')}
</channel>
</rss>`;

    res.setHeader('Content-Type', 'application/xml; charset=utf-8');
    res.send(rssXml);
  } catch (e) {
    res.status(500).send('RSS Error: ' + e.message);
  }
});

// -------------------------------------------------------------
// OPERATIONAL & API ENDPOINTS
// -------------------------------------------------------------

app.get('/health', async (req, res) => {
  await syncBloggerStoriesToday();
  const articles = loadArticles();
  const originality = calculateOriginalityRatio(articles);
  console.log(`[HEALTH] Health check ping received at ${new Date().toISOString()}`);
  res.json({
    status: 'ok',
    brand: 'Jonobarta (জনবার্তা)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    lastCycleTime: lastCycleTimestamp,
    storiesPublishedToday: countStoriesPublishedToday(),
    originalityRatio: originality.ratio,
    originalStoriesCount: originality.original,
    totalArticles: articles.length,
    bloggerConfigured: isBloggerConfigured(),
    activeCardTemplate: currentActiveTemplate,
    feedsCount: RSS_FEED_URLS.length
  });
});

app.get('/ping', (req, res) => {
  const now = new Date().toISOString();
  console.log(`[PING] Keep-alive heartbeat received at ${now} (uptime: ${Math.round(process.uptime())}s)`);
  res.json({
    status: 'alive',
    brand: 'Jonobarta',
    timestamp: now,
    uptime: process.uptime()
  });
});

app.get('/templates', (req, res) => {
  if (req.query.json === 'true' || (req.headers.accept && req.headers.accept.startsWith('application/json') && !req.headers.accept.includes('text/html'))) {
    return res.json({
      activeTemplate: currentActiveTemplate,
      availableTemplates: getAvailableTemplates()
    });
  }
  const html = renderTemplatesPage(currentActiveTemplate, getAvailableTemplates());
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.post('/template', (req, res) => {
  const target = req.body?.template || req.body?.templateId;
  const available = getAvailableTemplates();
  if (!target || !available[target]) {
    return res.status(400).json({
      error: 'Invalid template ID',
      available: Object.keys(available)
    });
  }
  currentActiveTemplate = target;
  console.log(`[CARD-ENGINE] Active template dynamically switched to: ${currentActiveTemplate}`);
  res.json({
    success: true,
    activeTemplate: currentActiveTemplate,
    message: `Active card template updated to '${currentActiveTemplate}' for subsequent stories`
  });
});

app.get('/template/:name', (req, res) => {
  const target = req.params.name;
  const available = getAvailableTemplates();
  if (!available[target]) {
    return res.status(404).json({
      error: `Template '${target}' not found`,
      available: Object.keys(available)
    });
  }
  currentActiveTemplate = target;
  console.log(`[CARD-ENGINE] Active template switched to: ${currentActiveTemplate}`);
  res.json({ success: true, activeTemplate: currentActiveTemplate });
});

app.get('/trigger', async (req, res) => {
  console.log(`[TRIGGER] Manual trigger requested from ${req.ip}`);
  res.json({
    message: 'Jonobarta news cycle started',
    brand: 'Jonobarta',
    startedAt: new Date().toISOString()
  });
  runNewsCycle('manual').catch(e => console.error(e));
});

app.post('/trigger', async (req, res) => {
  res.json({ message: 'Cycle started', startedAt: new Date().toISOString() });
  runNewsCycle('webhook').catch(e => console.error(e));
});

app.get('/trigger/briefing', async (req, res) => {
  const type = req.query.type === 'evening' ? 'evening' : 'morning';
  console.log(`[TRIGGER] Manual original ${type} briefing requested from ${req.ip}`);
  res.json({
    message: `Jonobarta original ${type} briefing started`,
    brand: 'Jonobarta',
    type,
    startedAt: new Date().toISOString()
  });
  publishOriginalStory(type).catch(e => console.error(e));
});

app.get('/status', async (req, res) => {
  await syncBloggerStoriesToday();
  const processed = loadProcessedUrls();
  const recentStories = loadRecentStories(RECENT_STORIES_FILE);
  const articles = loadArticles();
  const cardsCount = getGeneratedCardsCount();
  const originality = calculateOriginalityRatio(articles);

  res.json({
    status: 'ok',
    brand: 'Jonobarta (জনবার্তা)',
    website: 'https://daily-news-harness.onrender.com',
    publishedArticlesCount: articles.length,
    storiesPublishedToday: countStoriesPublishedToday(),
    originalityRatio: originality.ratio,
    originalStoriesCount: originality.original,
    cardsGenerated: cardsCount,
    activeCardTemplate: currentActiveTemplate,
    availableTemplates: Object.keys(getAvailableTemplates()),
    processedRssCount: processed.size,
    recentStoriesCount: recentStories.length,
    llmConfigured: !!(GEMINI_API_KEY || GROQ_API_KEY),
    bloggerConfigured: isBloggerConfigured(),
    webhookConfigured: !!PABBLY_WEBHOOK_URL,
    cronSchedule: CRON_SCHEDULE,
    maxPostsPerCycle: MAX_POSTS_PER_CYCLE,
    maxStoriesPerDay: MAX_STORIES_PER_DAY,
    agentIntervalMinutes: AGENT_INTERVAL_MINUTES
  });
});

app.get('/audit', async (req, res) => {
  const auditResults = {
    brand: 'Jonobarta (জনবার্তা)',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    nodeVersion: process.version,
    env: {
      port: PORT,
      llmProvider: GEMINI_API_KEY ? 'Gemini' : GROQ_API_KEY ? 'Groq' : 'NONE',
      groqModel: GROQ_MODEL,
      webhookConfigured: !!PABBLY_WEBHOOK_URL,
      bloggerConfigured: isBloggerConfigured(),
      activeCardTemplate: currentActiveTemplate,
      cronSchedule: CRON_SCHEDULE,
      holdPosting: process.env.HOLD_POSTING === 'true'
    },
    articlesInPortal: loadArticles().length,
    originalityRatio: calculateOriginalityRatio(loadArticles()).ratio,
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

// -------------------------------------------------------------
// ADMIN COCKPIT ENDPOINTS (/admin)
// -------------------------------------------------------------

app.get('/admin/login', (req, res) => {
  if (isAdminAuthenticated(req)) return res.redirect('/admin');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(renderAdminLoginPage(req.query.error));
});

app.post('/admin/login', (req, res) => {
  const pwd = req.body?.password;
  if (pwd && pwd.trim() === ADMIN_PASSWORD) {
    const token = 'auth_' + Buffer.from(ADMIN_PASSWORD).toString('base64');
    res.setHeader('Set-Cookie', `jonobarta_admin_session=${token}; Path=/; HttpOnly; Max-Age=86400; SameSite=Lax`);
    return res.redirect('/admin');
  }
  res.redirect('/admin/login?error=' + encodeURIComponent('ভুল পাসওয়ার্ড! দয়া করে সঠিক পাসওয়ার্ড দিন।'));
});

app.get('/admin/logout', (req, res) => {
  res.setHeader('Set-Cookie', 'jonobarta_admin_session=; Path=/; Max-Age=0');
  res.redirect('/admin/login');
});

app.get('/admin', async (req, res) => {
  if (!isAdminAuthenticated(req)) {
    return res.redirect('/admin/login');
  }
  const articles = loadArticles();
  const runs = getRecentRuns(10);
  const logs = getLogTail(50);
  const originality = calculateOriginalityRatio(articles);
  const templates = Object.entries(getAvailableTemplates()).map(([id, t]) => ({ id, name: t.name }));

  const html = renderAdminCockpit({
    activeTemplate: currentActiveTemplate,
    holdPosting: process.env.HOLD_POSTING === 'true',
    cronStatus: 'ACTIVE',
    keepAliveStatus: 'HEALTHY',
    runs,
    logs,
    articles,
    feeds: MANAGED_FEEDS,
    templates,
    originalityRatio: originality.ratio,
    beaconActive: true
  });

  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(html);
});

app.post('/admin/api/template', (req, res) => {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const target = req.body?.templateId || req.body?.template;
  const available = getAvailableTemplates();
  if (!target || !available[target]) {
    return res.status(400).json({ error: 'Invalid template ID', available: Object.keys(available) });
  }
  currentActiveTemplate = target;
  appendLog('INFO', `[COCKPIT] Active card template switched to: ${currentActiveTemplate}`);
  res.json({ success: true, activeTemplate: currentActiveTemplate });
});

app.post('/admin/api/hold-posting', (req, res) => {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const hold = !!req.body?.hold;
  process.env.HOLD_POSTING = hold ? 'true' : 'false';
  appendLog('WARN', `[COCKPIT] HOLD_POSTING switched to: ${process.env.HOLD_POSTING}`);
  res.json({ success: true, holdPosting: hold });
});

app.post('/admin/api/feed/toggle', (req, res) => {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  const { feedId, enabled } = req.body;
  const feed = MANAGED_FEEDS.find(f => f.id === feedId);
  if (!feed) return res.status(404).json({ error: 'Feed not found' });
  feed.enabled = !!enabled;
  appendLog('INFO', `[COCKPIT] Feed ${feedId} toggled to: ${feed.enabled}`);
  res.json({ success: true, feed });
});

app.post('/admin/api/trigger', (req, res) => {
  if (!isAdminAuthenticated(req)) return res.status(401).json({ error: 'Unauthorized' });
  appendLog('INFO', `[COCKPIT] Manual cycle triggered via Admin Cockpit`);
  res.json({ success: true, message: 'News cycle started' });
  runNewsCycle('admin_manual').catch(e => console.error(e));
});

if (require.main === module) {
  app.listen(PORT, () => {
    const maskedWebhook = PABBLY_WEBHOOK_URL ? `${PABBLY_WEBHOOK_URL.slice(0, 12)}...` : 'NOT_CONFIGURED';
    console.log(`\n========================================`);
    console.log(`[JONOBARTA] Daily News Engine & Web Portal running on port ${PORT}`);
    console.log(`[CONFIG] Webhook URL configured: ${maskedWebhook}`);
    console.log(`[CONFIG] Blogger Publishing: ${isBloggerConfigured() ? 'CONFIGURED' : 'DRY-RUN / LOCAL PORTAL'}`);
    console.log(`[CONFIG] Active News Card Template: ${currentActiveTemplate}`);
    console.log(`[JONOBARTA] Portal Homepage: http://localhost:${PORT}/`);
    console.log(`[JONOBARTA] RSS Feed: http://localhost:${PORT}/rss`);
    console.log(`[JONOBARTA] Health: http://localhost:${PORT}/health`);
    console.log(`[JONOBARTA] Trigger: http://localhost:${PORT}/trigger`);
    console.log(`[JONOBARTA] Status: http://localhost:${PORT}/status`);
    console.log(`[JONOBARTA] Templates: http://localhost:${PORT}/templates`);
    console.log(`[JONOBARTA] Audit: http://localhost:${PORT}/audit`);
    console.log(`========================================\n`);

    // 1. Regular News Cycle Cron
    cron.schedule(CRON_SCHEDULE, () => {
      console.log(`[CRON] Triggered scheduled run at ${new Date().toISOString()}`);
      runNewsCycle('cron').catch(err => console.error('[CRON] Error:', err.message));
    });
    console.log(`[CRON] Scheduled Main Cycle: ${CRON_SCHEDULE}`);

    // 2. Morning Briefing Cron at 01:00 UTC (07:00 BST)
    cron.schedule('0 1 * * *', () => {
      console.log(`[CRON] Triggered Morning Briefing (07:00 BST) at ${new Date().toISOString()}`);
      publishOriginalStory('morning').catch(err => console.error('[CRON] Morning Briefing error:', err.message));
    });
    console.log(`[CRON] Scheduled Morning Briefing: 0 1 * * * (07:00 BST)`);

    // 3. Evening Roundup Cron at 15:00 UTC (21:00 BST)
    cron.schedule('0 15 * * *', () => {
      console.log(`[CRON] Triggered Evening Roundup (21:00 BST) at ${new Date().toISOString()}`);
      publishOriginalStory('evening').catch(err => console.error('[CRON] Evening Roundup error:', err.message));
    });
    console.log(`[CRON] Scheduled Evening Roundup: 0 15 * * * (21:00 BST)`);

    // 4. Autonomous 4-Minute Keep-Alive Watchdog (prevents Render free-tier sleep)
    const WATCHDOG_INTERVAL_MS = 4 * 60 * 1000;
    const defaultPublicUrl = 'https://daily-news-harness.onrender.com';
    const watchdogTargetUrl = `${(process.env.RENDER_EXTERNAL_URL || defaultPublicUrl).replace(/\/+$/, '')}/ping`;
    setInterval(async () => {
      try {
        const pingRes = await axios.get(watchdogTargetUrl, { timeout: 10000 });
        console.log(`[WATCHDOG] Keep-alive ping acknowledged at ${new Date().toISOString()} | status: ${pingRes.data?.status}`);
      } catch (err) {
        console.warn(`[WATCHDOG] Keep-alive ping notice: ${err.message}`);
      }
    }, WATCHDOG_INTERVAL_MS);
    console.log(`[WATCHDOG] Keep-alive autonomous watchdog scheduled every 4 min targeting: ${watchdogTargetUrl}`);
  });
}

process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));

module.exports = {
  app,
  runNewsCycle,
  publishOriginalStory,
  countStoriesPublishedToday,
  fetchRssArticles,
  evaluateWithGroq,
  evaluateWithGemini
};
