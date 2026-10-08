const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cron = require('node-cron');
const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const { normalizeUrl, loadRecentStories, saveRecentStories, checkDuplicateStory } = require('./utils/dedup');
const { saveArticle, getArticles, getArticleBySlugOrId, getArticlesByCategory, incrementViews, loadArticles } = require('./utils/storage');
const { generateNewsCard, CARDS_DIR } = require('./utils/cardGenerator');
const { renderHome } = require('./portal/templates/home');
const { renderArticle } = require('./portal/templates/article');
const { renderCategory } = require('./portal/templates/category');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static assets
app.use(express.static(path.join(__dirname, 'portal', 'public')));
app.use('/cards', express.static(path.join(__dirname, 'public', 'cards')));
app.use('/images', express.static(path.join(__dirname, 'portal', 'public', 'images')));

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

const RSS_FEED_URLS = (process.env.RSS_FEED_URLS || cloudConfig.RSS_FEED_URLS || 'https://www.dailyamardesh.com/feed,https://www.prothomalo.com/feed,https://feeds.bbci.co.uk/bengali/rss.xml,https://www.thedailystar.net/news/bangladesh/rss.xml,https://www.ntvbd.com/rss.xml,https://www.channelionline.com/feed')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || cloudConfig.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || cloudConfig.GROQ_API_KEY || '';
const GROQ_MODEL = process.env.GROQ_MODEL || cloudConfig.GROQ_MODEL || 'openai/gpt-oss-120b';
const PABBLY_WEBHOOK_URL = process.env.MAKE_WEBHOOK_URL || process.env.PABBLY_WEBHOOK_URL || '';
const MAX_POSTS_PER_CYCLE = parseInt(process.env.MAX_POSTS_PER_CYCLE || cloudConfig.MAX_POSTS_PER_CYCLE || '1', 10);
const GEMINI_MODEL = process.env.GEMINI_MODEL || cloudConfig.GEMINI_MODEL || 'gemini-1.5-flash';
const CRON_SCHEDULE = process.env.CRON_SCHEDULE || cloudConfig.CRON_SCHEDULE || '0 * * * *';

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
- Write an authoritative, professional news portal article in standard Bengali.
- Output a clean, structured JSON with full article details:
  * "title": Punchy, formal Bengali headline (max 15 words)
  * "category": Choose one of ["জাতীয়", "রাজনীতি", "অর্থনীতি", "আইন ও আদালত", "সংস্কার ও রাষ্ট্র", "ক্যাম্পাস ও তরুণ", "আন্তর্জাতিক"]
  * "summary": 1-2 sentence executive summary
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

async function sendToWebhook(article, savedArticle, cardResult) {
  const defaultPublicBase = 'https://daily-news-harness.onrender.com';
  const baseUrl = (process.env.RENDER_EXTERNAL_URL || process.env.APP_BASE_URL || defaultPublicBase).replace(/\/+$/, '');
  const websiteArticleUrl = `${baseUrl}/news/${savedArticle.slug}`;

  // Resolve public image URL for Facebook
  let publicImageUrl = '';
  if (cardResult?.cdnUrl) {
    publicImageUrl = cardResult.cdnUrl;
  } else if (cardResult?.relativeUrl) {
    publicImageUrl = `${baseUrl}${cardResult.relativeUrl}`;
  }
  if (!publicImageUrl && savedArticle.photoUrl) {
    publicImageUrl = savedArticle.photoUrl;
  }

  const postText = `${savedArticle.rewrittenPost || savedArticle.title}\n\n📌 তথ্যসূত্র: ${savedArticle.sourceFeed || 'জনবার্তা ডেস্ক'}\n🔗 সম্পূর্ণ সংবাদটি পড়তে ভিজিট করুন:\n${websiteArticleUrl}`;

  const payload = {
    title: savedArticle.title,
    headline: savedArticle.title,
    category: savedArticle.category,
    summary: savedArticle.summary,
    original_url: savedArticle.sourceUrl,
    website_url: websiteArticleUrl,
    link: websiteArticleUrl,
    source: savedArticle.sourceFeed,
    published_at: savedArticle.publishedAt,
    rewritten_post: postText,
    content: postText,
    message: postText,
    post_text: postText,
    card_url: publicImageUrl,
    photo_url: publicImageUrl,
    image_url: publicImageUrl,
    has_card: !!publicImageUrl,
    generated_at: new Date().toISOString()
  };

  if (!PABBLY_WEBHOOK_URL) {
    console.warn('[PUBLISH] Webhook URL not set - skipping webhook dispatch (article saved to website)');
    return { dryRun: true };
  }

  console.log(`[PUBLISH] Sending Jonobarta payload to Webhook (Make.com / Pabbly)...`);
  console.log(`[PUBLISH] Webhook URL: ${PABBLY_WEBHOOK_URL.slice(0, 60)}...`);
  console.log(`[PUBLISH] Target Article URL: ${websiteArticleUrl}`);
  
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
  console.log(`\n========================================`);
  console.log(`[CYCLE] Starting Jonobarta News Cycle | Trigger: ${trigger} | Time: ${new Date().toISOString()}`);
  console.log(`========================================`);
  const summary = { fetched: 0, evaluated: 0, passed: 0, published: 0, errors: 0 };

  try {
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
        console.log(`[CYCLE] PASSED - generating news card & publishing to Jonobarta website & Facebook...`);

        // 1. Extract photo
        const photoUrl = await extractEditorialPhoto(article.link);

        // 2. Generate HD News Card (1200x630 PNG)
        let cardResult = null;
        try {
          cardResult = await generateNewsCard({
            title: result.title || article.title,
            snippet: result.summary || article.content || '',
            source: article.feedTitle || 'অনলাইন ডেস্ক',
            link: article.link
          });
        } catch (cardErr) {
          console.warn(`[CYCLE] Card generator error: ${cardErr.message}`);
        }

        // 3. Save to Jonobarta Website Database
        const savedArticle = saveArticle({
          title: result.title || article.title,
          category: result.category || 'জাতীয়',
          summary: result.summary || article.content || '',
          paragraphs: result.paragraphs || [article.content || ''],
          speakerQuote: result.speakerQuote || null,
          rewrittenPost: result.rewrittenPost || '',
          cardUrl: cardResult?.relativeUrl || '',
          photoUrl: photoUrl || '',
          sourceFeed: article.feedTitle || 'জনবার্তা ডেস্ক',
          sourceUrl: article.link,
          tags: result.tags || ['জনবার্তা', result.category || 'সংবাদ'],
          publishedAt: article.pubDate || new Date().toISOString()
        });

        // 4. Send to Webhook (Make.com / Facebook) with link to our website
        await sendToWebhook(article, savedArticle, cardResult);

        // 5. Record recent story for cross-source dedup
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

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    brand: 'Jonobarta (জনবার্তা)',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    feeds: RSS_FEED_URLS.length
  });
});

app.get('/ping', (req, res) => {
  res.json({ status: 'alive', brand: 'Jonobarta', timestamp: new Date().toISOString() });
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

app.get('/status', (req, res) => {
  const processed = loadProcessedUrls();
  const recentStories = loadRecentStories(RECENT_STORIES_FILE);
  const articles = loadArticles();
  const cardsCount = fs.existsSync(CARDS_DIR)
    ? fs.readdirSync(CARDS_DIR).filter(f => f.endsWith('.png')).length
    : 0;

  res.json({
    status: 'ok',
    brand: 'Jonobarta (জনবার্তা)',
    website: 'https://daily-news-harness.onrender.com',
    publishedArticlesCount: articles.length,
    cardsGenerated: cardsCount,
    processedRssCount: processed.size,
    recentStoriesCount: recentStories.length,
    llmConfigured: !!(GEMINI_API_KEY || GROQ_API_KEY),
    webhookConfigured: !!PABBLY_WEBHOOK_URL,
    cronSchedule: CRON_SCHEDULE,
    maxPostsPerCycle: MAX_POSTS_PER_CYCLE
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
      cronSchedule: CRON_SCHEDULE,
      holdPosting: process.env.HOLD_POSTING === 'true'
    },
    articlesInPortal: loadArticles().length,
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
    const maskedWebhook = PABBLY_WEBHOOK_URL ? `${PABBLY_WEBHOOK_URL.slice(0, 12)}...` : 'NOT_CONFIGURED';
    console.log(`\n========================================`);
    console.log(`[JONOBARTA] Daily News Engine & Web Portal running on port ${PORT}`);
    console.log(`[CONFIG] Webhook URL configured: ${maskedWebhook}`);
    console.log(`[JONOBARTA] Portal Homepage: http://localhost:${PORT}/`);
    console.log(`[JONOBARTA] RSS Feed: http://localhost:${PORT}/rss`);
    console.log(`[JONOBARTA] Health: http://localhost:${PORT}/health`);
    console.log(`[JONOBARTA] Trigger: http://localhost:${PORT}/trigger`);
    console.log(`[JONOBARTA] Status: http://localhost:${PORT}/status`);
    console.log(`[JONOBARTA] Audit: http://localhost:${PORT}/audit`);
    console.log(`========================================\n`);

    cron.schedule(CRON_SCHEDULE, () => {
      console.log(`[CRON] Triggered scheduled run at ${new Date().toISOString()}`);
      runNewsCycle('cron').catch(err => console.error('[CRON] Error:', err.message));
    });

    console.log(`[CRON] Scheduled: ${CRON_SCHEDULE}`);
  });
}

process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));

module.exports = { app, runNewsCycle, fetchRssArticles, evaluateWithGroq, evaluateWithGemini };
