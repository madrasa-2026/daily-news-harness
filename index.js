require('dotenv').config();
const express = require('express');
const cron = require('node-cron');
const Parser = require('rss-parser');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 10000;
const RSS_FEED_URLS = (process.env.RSS_FEED_URLS || 'https://www.prothomalo.com/feed,https://feeds.bbci.co.uk/bengali/rss.xml,https://www.thedailystar.net/news/bangladesh/rss.xml,https://feeds.bbci.co.uk/news/world/rss.xml')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const PABBLY_WEBHOOK_URL = process.env.PABBLY_WEBHOOK_URL || '';
const MAX_POSTS_PER_CYCLE = parseInt(process.env.MAX_POSTS_PER_CYCLE || '2', 10);
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

const DATA_DIR = path.join(__dirname, 'data');
const PROCESSED_FILE = path.join(DATA_DIR, 'processed.json');

const parser = new Parser({
  timeout: 15000,
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

async function fetchRssArticles() {
  console.log(`\n[FETCHER] Starting RSS fetch at ${new Date().toISOString()}`);
  console.log(`[FETCHER] Feeds to check: ${RSS_FEED_URLS.length}`);
  const processed = loadProcessedUrls();
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
        const link = (item.link || item.guid || '').trim();
        if (!link) continue;
        if (processed.has(link)) continue;
        const title = (item.title || '').trim();
        const content = (item.contentSnippet || item.content || item['content:encoded'] || '').trim();
        const pubDateStr = item.pubDate || item.isoDate || new Date().toISOString();
        if (!title) continue;

        const pubDateMs = Date.parse(pubDateStr);
        if (!isNaN(pubDateMs) && (now - pubDateMs) > MAX_AGE_MS) {
          const hoursOld = Math.round((now - pubDateMs) / (1000 * 60 * 60));
          console.log(`[FETCHER] Skipping stale news (${hoursOld}h old): "${title.slice(0, 50)}..."`);
          continue;
        }

        fresh.push({
          title,
          link,
          content: content.slice(0, 2000),
          pubDate: pubDateStr,
          feedTitle: feed.title || url
        });
      }
    } catch (err) {
      console.error(`[FETCHER] Failed for ${url}: ${err.message}`);
    }
  }

  fresh.sort((a, b) => new Date(b.pubDate) - new Date(a.pubDate));
  console.log(`[FETCHER] Found ${fresh.length} fresh (today's unprocessed) articles`);
  if (fresh.length > 0) console.log(`[FETCHER] Newest article: "${fresh[0].title}" (${fresh[0].pubDate})`);
  return { fresh, processed };
}

function buildPrompt(article) {
  return `You are a viral social media strategist and senior editor for 'NAGORIK DESK' (নাগরিক ডেস্ক).

TASK: Evaluate the news article below on 3 criteria, then decide PASS or REJECT. If PASS, craft a highly viral, engaging Facebook post.

ARTICLE:
Title: ${article.title}
Source: ${article.feedTitle}
Link: ${article.link}
Snippet: ${article.content || article.title}
Date: ${article.pubDate}

EVALUATION CRITERIA (score 1-10 each):
1. Newsworthiness - Is it timely, impactful, high-interest to general audience?
2. Factual Clarity - Is it clear, specific, reliable?
3. Viral Potential - Will people comment, share, or react?

DECISION RULE: PASS only if all 3 scores >= 6 AND average >= 7. Otherwise REJECT.

VIRAL WRITING FORMAT (IF PASS):
- Write in clear, punchy, highly engaging language (prioritize Bengali for local/regional news, English for global tech/world news).
- HOOK: 1 viral opening line with emojis (e.g. 🚨 ব্রেকিং নিউজ | 🔥 বড় তথ্য | ⚠️ আলোচিত খবর).
- BODY: 2-3 short, scannable paragraphs highlighting key facts and real-world impact.
- ENGAGEMENT QUESTION (Call to Action): 1 sentence asking readers for their opinion (e.g. "আপনার মতামত কী? কমেন্টে জানান! 👇").
- HASHTAGS: 4-5 high-volume trending hashtags at end (e.g. #NagorikDesk #BreakingNews #Trending #NewsUpdate).
- IMPORTANT: DO NOT put any http/https link URLs inside the main post body text (to prevent Facebook algorithm reach throttling). End the post body text with: "👇 সংবাদের মূল লিংক প্রথম কমেন্টে দেখুন।"
- COMMENT LINK: Create a clean separate comment string: "🔗 মূল খবরের লিংক: ${article.link}"

OUTPUT STRICT JSON ONLY (no markdown, no extra text):
{
  "decision": "PASS" or "REJECT",
  "scores": { "newsworthiness": 0, "factualClarity": 0, "viralPotential": 0 },
  "reason": "1 sentence reason",
  "rewrittenPost": "full post text without external link",
  "commentLink": "🔗 মূল খবরের লিংক: ${article.link}"
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
  try {
    console.log(`[BRAIN][GROQ] Evaluating: "${article.title.slice(0, 80)}..."`);
    const prompt = buildPrompt(article);
    const res = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
      model: 'groq/compound-mini',
      messages: [
        { role: 'system', content: 'You are a news editor for NAGORIK DESK. Output strict JSON only.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
      max_tokens: 1500
    }, {
      headers: { Authorization: `Bearer ${GROQ_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: 30000
    });
    const text = res.data.choices[0].message.content;
    const parsed = extractJson(text);
    console.log(`[BRAIN][GROQ] Decision: ${parsed.decision} | Scores: ${JSON.stringify(parsed.scores)}`);
    return parsed;
  } catch (err) {
    console.error(`[BRAIN][GROQ] Error: ${err.response?.data ? JSON.stringify(err.response.data) : err.message}`);
    throw err;
  }
}

async function sendToPabbly(article, evalResult) {
  const rewrittenPost = (typeof evalResult === 'string' ? evalResult : (evalResult?.rewrittenPost || evalResult?.rewritten_post)) || `${article.title}\n\n👇 সংবাদের মূল লিংক প্রথম কমেন্টে দেখুন।`;
  const commentLink = (typeof evalResult === 'object' && (evalResult.commentLink || evalResult.comment_link)) ? (evalResult.commentLink || evalResult.comment_link) : `🔗 মূল খবরের লিংক: ${article.link}`;

  if (!PABBLY_WEBHOOK_URL) {
    console.warn('[PUBLISH] PABBLY_WEBHOOK_URL not set - skipping publish (logging only)');
    console.log(`[PUBLISH][DRY-RUN] Would send: ${rewrittenPost.slice(0, 200)}...`);
    return { dryRun: true };
  }
  const payload = {
    title: article.title,
    original_url: article.link,
    source: article.feedTitle,
    published_at: article.pubDate,
    rewritten_post: rewrittenPost,
    content: rewrittenPost,
    message: rewrittenPost,
    post_text: rewrittenPost,
    comment_link: commentLink,
    first_comment: commentLink,
    generated_at: new Date().toISOString()
  };
  console.log(`[PUBLISH] Sending viral payload to Pabbly webhook...`);
  console.log(`[PUBLISH] URL: ${PABBLY_WEBHOOK_URL.slice(0, 60)}...`);
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
        saveProcessedUrls(processed);

        if (result.decision === 'REJECT') {
          console.log(`[CYCLE] REJECTED - ${result.reason}`);
          continue;
        }

        summary.passed++;
        console.log(`[CYCLE] PASSED - rewriting ready, publishing...`);
        console.log(`[CYCLE] Rewritten preview: ${result.rewrittenPost.slice(0, 200)}...`);

        await sendToPabbly(article, result);
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
        <p>Automated Viral News Engine | 5 Posts/Day + On-Demand Exception Slot</p>
        <div>
          <span class="badge">Status: Live</span>
          <span class="badge">Page: Nagorik Desk</span>
          <span class="badge">Schedule: 5x Daily</span>
        </div>
        <br/>
        <button class="btn" onclick="triggerPost()">🚀 Post Now On-Demand (Exception Slot)</button>
        <div id="status" class="status"></div>
        <hr style="border-color: #334155; margin-top: 2rem;"/>
        <p style="font-size: 0.8rem; color: #64748b;">
          Direct API Trigger: <a href="/trigger" style="color: #38bdf8;">/trigger</a> | Health: <a href="/health" style="color: #38bdf8;">/health</a>
        </p>
      </div>
      <script>
        async function triggerPost() {
          const el = document.getElementById('status');
          el.style.display = 'block';
          el.style.color = '#38bdf8';
          el.style.background = '#1e3a8a';
          el.innerText = '⌛ Triggering viral news cycle... fetching & rewriting...';
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
  res.json({
    status: 'ok',
    feeds: RSS_FEED_URLS,
    processedCount: processed.size,
    llmConfigured: !!(GEMINI_API_KEY || GROQ_API_KEY),
    pabblyConfigured: !!PABBLY_WEBHOOK_URL,
    cronSchedule: '0 */4 * * * (every 4 hours)',
    maxPostsPerCycle: MAX_POSTS_PER_CYCLE
  });
});

app.listen(PORT, () => {
  console.log(`\n========================================`);
  console.log(`[SERVER] Daily News Harness running on port ${PORT}`);
  console.log(`[SERVER] Health: http://localhost:${PORT}/health`);
  console.log(`[SERVER] Ping: http://localhost:${PORT}/ping`);
  console.log(`[SERVER] Manual trigger: http://localhost:${PORT}/trigger`);
  console.log(`[SERVER] Feeds configured: ${RSS_FEED_URLS.length}`);
  console.log(`[SERVER] LLM: ${GEMINI_API_KEY ? 'Gemini (' + GEMINI_MODEL + ')' : GROQ_API_KEY ? 'Groq' : 'NOT SET - add GEMINI_API_KEY!'}`);
  console.log(`[SERVER] Pabbly: ${PABBLY_WEBHOOK_URL ? 'SET' : 'NOT SET - add PABBLY_WEBHOOK_URL!'}`);
  console.log(`========================================\n`);

  if (RSS_FEED_URLS.length === 0) console.warn('[SERVER] WARNING: RSS_FEED_URLS is empty!');
});

cron.schedule('0 0,5,10,15,20 * * *', () => {
  console.log(`[CRON] Triggered scheduled run at ${new Date().toISOString()}`);
  runNewsCycle('cron').catch(err => console.error('[CRON] Error:', err.message));
});

console.log('[CRON] Scheduled: 5 times daily at 00:00, 05:00, 10:00, 15:00, 20:00 UTC (0 0,5,10,15,20 * * *)');
console.log('[CRON] Keep-alive: ping /health every 5 min via cron-job.org');

process.on('unhandledRejection', (err) => console.error('[UNHANDLED]', err));
process.on('uncaughtException', (err) => console.error('[UNCAUGHT]', err));
