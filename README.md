# 📰 Jonobarta (জনবার্তা) — AI Newsroom Automation Agent

> **Brand**: **Jonobarta (জনবার্তা)** — *সত্য, ন্যায় ও জনমানুষের নির্ভীক ডিজিটাল সংবাদমাধ্যম*  
> An autonomous, 24/7 AI-powered news engine inspired by GrowHix media automation. It monitors Bangladeshi news RSS feeds, produces 100% original rewritten journalism without verbatim copying, resolves a 3-tier editorial image pipeline, generates 1200×630 news cards across 6 distinct templates, publishes full articles to Google Blogger, and dispatches rich card posts to Facebook via Make.com.

---

## 🌟 Key Architecture & Capabilities

```
                  ┌──────────────────────────────────────────────┐
                  │ 1. RSS COLLECTOR & DEDUPLICATION (Every 1h)  │
                  │ Prothom Alo, Amar Desh, BBC Bangla, etc.     │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 2. ZERO-VERBATIM LLM REWRITE ENGINE          │
                  │ Strict Bangla journalistic synthesis & audit │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 3. 3-TIER EDITORIAL IMAGE PIPELINE           │
                  │ Tier 1: Source Press Photo                   │
                  │ Tier 2: Free Unsplash Stock API              │
                  │ Tier 3: Curated Editorial Category Artwork   │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 4. GOOGLE BLOGGER API v3 PUBLISHER           │
                  │ Creates live post with featured image & tags │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 5. 1200×630 NEWS CARD TEMPLATE ENGINE        │
                  │ 6 Built-in templates + /templates custom dir │
                  └──────────────────────┬───────────────────────┘
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ 6. MAKE.COM WEBHOOK DISPATCHER               │
                  │ Posts card PNG + headline + Blogger URL to FB│
                  └──────────────────────────────────────────────┘
```

---

## ⚙️ Environment Variables Reference

Configure these in your Render Dashboard (**Environment** tab) or your local `.env` file:

| Variable Name | Default | Required? | Description |
|---|---|---|---|
| `PORT` | `10000` | No | Server listening port |
| `RSS_FEED_URLS` | 8 Bangladeshi feeds | Yes | Comma-separated list of RSS feeds to monitor |
| `GROQ_API_KEY` | - | Yes (or Gemini) | Groq API Key for fast LLM inference (`gsk_...`) |
| `GROQ_MODEL` | `openai/gpt-oss-120b` | No | Preferred Groq model |
| `GEMINI_API_KEY` | - | Optional | Fallback Google Gemini API key (`AIzaSy...`) |
| `MAKE_WEBHOOK_URL` | - | Yes | Make.com webhook URL connected to Facebook Page |
| `AGENT_INTERVAL_MINUTES`| `60` | No | Main news check cycle frequency in minutes |
| `MAX_POSTS_PER_CYCLE` | `1` | No | Max stories published per cron execution |
| `MAX_STORIES_PER_DAY` | `15` | No | Daily publication cap to prevent spam |
| `TOPIC_BLOCKLIST` | `""` | No | Comma-separated banned keywords/topics |
| `ACTIVE_CARD_TEMPLATE`| `bold-headline` | No | Active news card design (`bold-headline`, `image-dominant`, `minimal`, `breaking-news`, `quote-style`, `dark-premium`) |
| `UNSPLASH_ACCESS_KEY` | - | Optional | Free Unsplash API access key for Tier 2 stock photos |
| `BLOGGER_BLOG_ID` | - | Optional | Blogger numeric blog ID |
| `BLOGGER_CLIENT_ID` | - | Optional | Google Cloud OAuth 2.0 Client ID |
| `BLOGGER_CLIENT_SECRET` | - | Optional | Google Cloud OAuth 2.0 Client Secret |
| `BLOGGER_REFRESH_TOKEN` | - | Optional | Long-lived Google OAuth 2.0 refresh token |
| `HOLD_POSTING` | `false` | No | Emergency switch: set `true` to pause Facebook posting |

*(For step-by-step instructions on setting up Blogger API credentials, see [`Instruction/blogger-api-guide.md`](Instruction/blogger-api-guide.md)).*

---

## 🎨 1200×630 News Card Templates

Jonobarta includes 6 built-in, production-ready news card designs:

1. **`bold-headline`**: Signature Al Jazeera-inspired deep crimson card with auto-shrinking Bengali typography.
2. **`image-dominant`**: TV news lower-third overlay style (Somoy TV / BBC Bangla look).
3. **`minimal`**: Crisp light editorial layout with high-contrast text and subtle borders.
4. **`breaking-news`**: Urgent flash layout with dark background and crimson alert banner.
5. **`quote-style`**: Editorial statement design with oversized quotation marks and speaker prominence.
6. **`dark-premium`**: Obsidian background with gold borders and exclusive badges.

### Template Switching & Custom Templates
- **Dynamic Switch**: Change the active template anytime without restarting via `POST /template` with `{"template": "image-dominant"}` or `GET /template/image-dominant`.
- **Custom Templates**: Add your own HTML/CSS template in `/templates/<template-name>/template.html` and `template.json`. The engine automatically detects and serves it. See [`templates/README.md`](templates/README.md) for specs.

---

## 📅 Daily Original Content Automation

To build domain authority and qualify for Google AdSense, the agent auto-produces 20–30% original content:
- **Morning Briefing ("আজকের প্রধান খবর")**: Runs automatically every morning at `01:00 UTC` (**07:00 AM BST**).
- **Evening Roundup ("দিনের খতিয়ান")**: Runs automatically every evening at `15:00 UTC` (**09:00 PM BST**).
- Marked with `is_original: true` and labeled `নিজস্ব প্রতিবেদন`.
- **Manual Trigger**: Run `GET /trigger/briefing?type=morning` or `GET /trigger/briefing?type=evening` anytime.

---

## 📊 Endpoints & Health Monitoring

- `GET /health`: JSON status containing uptime, last cycle timestamp, stories published today, originality ratio, and active template.
- `GET /ping`: Render keep-alive heartbeat endpoint with timestamped logging.
- `GET /status`: Detailed metrics including processed URLs, card counts, and active templates.
- `GET /templates`: List all built-in and custom card templates.
- `GET /trigger`: Manually trigger a news fetch-and-publish cycle.
- `GET /trigger/briefing?type=morning`: Manually generate an original morning briefing.
- `GET /audit`: Deep diagnostic check of all monitored RSS feeds and latency.

---

## 🚨 If Posts Stop: Check This First

When automated posts stop appearing on Facebook or Blogger, verify these 4 potential failure points:

### 1. Render Free-Tier Sleep / Hours Budget
- **The Issue**: Render free tier provides 750 free instance hours per month. If you run multiple web services on the same free account, your monthly budget may run out before the end of the month.
- **Fix**: Check your Render account usage at [dashboard.render.com](https://dashboard.render.com). Ensure only one free service is running, and confirm an external 5-minute ping (e.g., via [cron-job.org](https://cron-job.org) targeting `/ping`) is keeping the container awake.

### 2. Make.com Scenario Status
- **The Issue**: Make.com free tier scenarios will stop if:
  - The scenario was manually deactivated or turned OFF.
  - The monthly operation limit (1,000 ops/month) was reached.
  - Facebook Page permissions or session tokens expired.
- **Fix**: Log in to [make.com](https://make.com), open scenario ID `9939541` (or your scenario), click **History**, and inspect recent runs for errors. Ensure the toggle switch is **ON**.

### 3. Blogger OAuth Token Validity
- **The Issue**: If Blogger credentials are configured but posts fail to appear on your blog, the OAuth refresh token may have been revoked or Google Cloud credentials expired.
- **Fix**: Inspect the `/health` endpoint to verify `"bloggerConfigured": true`. Check Render logs for `[BLOGGER] Token refresh failed`. If needed, re-generate your refresh token following [`Instruction/blogger-api-guide.md`](Instruction/blogger-api-guide.md).

### 4. AI Provider Rate Limits (Groq / Gemini)
- **The Issue**: If the LLM provider returns `429 Too Many Requests`, story evaluation will pause.
- **Fix**: The harness automatically falls back from Groq to Gemini if both keys are set. Verify your API keys in the Render Environment tab.

---

## 🛠️ Local Development & Testing

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Edit .env with your keys

# 3. Start server
npm start

# 4. Check status in browser
http://localhost:10000/health
http://localhost:10000/templates
http://localhost:10000/status
```

---

## 🔒 Security Policy
- **Zero Hardcoded Secrets**: All webhook URLs, API keys, and client secrets are strictly loaded via environment variables.
- `.env` and `config.production.json` are excluded via `.gitignore`.
- Placeholders only are used in documentation and version-controlled files.
