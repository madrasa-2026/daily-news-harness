# 🚀 Daily News Harness — Automated Facebook News Poster

> Zero-code knowledge needed. Follow this guide click-by-click and you will have a 24/7 bot that fetches news via RSS, rewrites it with AI, and posts to your Facebook Page via Pabbly.

---

## 📋 What This Does (Simple Explanation)

```
Every 4 hours:
RSS News Feeds (BBC, CNN, Reuters…) → Your Render Server → Google Gemini AI evaluates & rewrites → Pabbly Webhook → Your Facebook Page (auto post)
```

- **You NEVER pay for Facebook API** — Pabbly handles it.
- **You NEVER pay for AI** — Gemini free tier = 60 requests/min, more than enough.
- **Render Free Tier** hosts your code 24/7 (with a tiny keep-alive trick).
- **No duplicate posts** — URLs are saved in `data/processed.json`.

---

## 📦 What You Get In This Folder

```
daily-news-harness/
├── index.js          ← Main server + fetcher + brain + publisher
├── package.json      ← Dependencies
├── .env.example      ← Template for your keys (copy this)
├── .env              ← Your real keys (you will create this - NEVER share)
├── data/processed.json ← Auto-created - stores posted URLs
├── .gitignore
└── README.md         ← This file
```

---

## PART 1 — Get Your Free AI Key (5 minutes)

You need **ONE** of these. Gemini is recommended.

### Option A: Google Gemini (Recommended - Free Forever)

1. Go to **https://aistudio.google.com/app/apikey**
2. Sign in with any Google/Gmail account.
3. Click blue **"Create API key"** → **"Create API key in new project"** (name it anything, e.g. `news-harness`).
4. Copy the key that looks like `AIzaSy...` (starts with AIza). **Copy it to Notepad now.**
5. Free limit: **1500 requests/day** — your bot uses ~12/day. You will never hit it.

> If you see `Billing` warning, ignore — Gemini Flash is free, no credit card needed.

### Option B: Groq (Alternative, also free - even faster)

1. Go to **https://console.groq.com/keys**
2. Sign in → Click **"Create API Key"** → Copy key `gsk_...`
3. Use this as `GROQ_API_KEY` instead (code supports both, Gemini is prioritized if both are set).

**Save your key! You will paste it in Render in Part 3.**

---

## PART 2 — Set Up Pabbly Connect → Facebook Page (10 minutes)

This is how we post to Facebook WITHOUT coding.

### Step 2.1 - Create Pabbly Account

1. Go to **https://www.pabbly.com** → **Sign Up Free** (free tier = 100 tasks/month).
2. After login, go to **Pabbly Connect** dashboard → Click **"Create Workflow"** (top right).
3. Name it: `News Harness to Facebook`

### Step 2.2 - Set Trigger = Webhook

1. In **"Choose App"** search **"Webhook"** → Select **"Webhook by Pabbly"**
2. **Trigger Event** → Choose **"Catch Webhook"** → Click **Connect**
3. It gives you a URL like:
   ```
   https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjA...
   ```
   **COPY THIS URL — this is your `PABBLY_WEBHOOK_URL`**

4. **DO NOT click "Save & Send Test Request" yet.** Leave this tab open, we will test later.

### Step 2.3 - Set Action = Facebook Pages

1. Click **"+"** to add next step → Search **"Facebook Pages"**
2. **Action Event** → Choose **"Create Page Post"** → Click **Connect**
3. Click **"Add New Connection"** → Log in with Facebook → Select your **Facebook Page** (you must be Admin of that page. Create a page first at https://www.facebook.com/pages/create if you don't have one)
4. Approve all permissions.

### Step 2.4 - Map The Data

In the **Create Page Post** setup:

- **Message**: Click in field → Select from webhook data → Choose `rewritten_post` (or `content`). This is the AI-written post.
- **Link URL** (optional but recommended): Map → `original_url`
- Leave other fields default.

> Tip: Your webhook payload contains:
> ```json
> {
>   "title": "Original headline",
>   "original_url": "https://...",
>   "rewritten_post": "AI post with emojis + hashtags",
>   "source": "BBC News"
> }
> ```

5. Click **"Save & Send Test Request"** → It will say *Waiting for webhook response* until we send a test (next step).
6. **Keep Pabbly tab open.**

---

## PART 3 — Deploy to Render (Free, 7 minutes)

### Step 3.1 - Push Code to GitHub

1. Create GitHub account at **https://github.com** (free)
2. Click **"+" → New repository** → Name: `daily-news-harness` → Public → **Create repository**
3. Upload files: On repo page click **"Add file → Upload files"** → Drag ALL files from this folder (`index.js`, `package.json`, `.gitignore`, `README.md`, `data/.gitkeep`) → **Commit directly**
   
   > **IMPORTANT:** Do NOT upload your `.env` file! It contains secrets. Only upload `.env.example`.

   *Alternative: if you have Git installed:*
   ```bash
   git init
   git add .
   git commit -m "initial"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/daily-news-harness.git
   git push -u origin main
   ```

### Step 3.2 - Create Render Web Service

1. Go to **https://dashboard.render.com** → Sign up with GitHub → **Authorize**.
2. Click **"New +"** (top right) → **"Web Service"**
3. **Connect your `daily-news-harness` repo** → Click **Connect**.
4. Settings:
   - **Name**: `daily-news-harness` (any)
   - **Region**: Choose nearest to you
   - **Branch**: `main`
   - **Runtime**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Plan**: **Free** (crucial!)
   - **Instance Type**: Free

5. **DO NOT click Create yet** — Scroll down to **Environment Variables**.

### Step 3.3 - Add Environment Variables (Most Important Step)

Click **"Advanced" → "Add Environment Variable"** and add EACH of these exactly:

| Key | Value | Where to get it |
|-----|-------|-----------------|
| `RSS_FEED_URLS` | `https://rss.cnn.com/rss/edition.rss,https://feeds.bbci.co.uk/news/world/rss.xml,https://feeds.reutersagency.com/feed/?best-topics=tech&post_type=best` | Copy-paste this default, or add your own comma-separated RSS URLs |
| `GEMINI_API_KEY` | `AIzaSy...` | From Part 1 |
| `PABBLY_WEBHOOK_URL` | `https://connect.pabbly.com/workflow/sendwebhookdata/...` | From Part 2.2 |
| `MAX_POSTS_PER_CYCLE` | `2` | Max posts per 4h (2 is safe for free tiers) |
| `GEMINI_MODEL` | `gemini-1.5-flash` | Leave as is |

> To use Groq instead/additionally: also add `GROQ_API_KEY` = `gsk_...`

6. Now click **"Create Web Service"** → Render starts building (takes ~2 min). Watch logs.

7. When done, Render gives you a URL like:
   ```
   https://daily-news-harness-xxxx.onrender.com
   ```
   **COPY THIS URL.**

8. Test it: Open `https://YOUR-URL.onrender.com/health` → You should see `{"status":"ok", ...}`. Also try `/ping` and `/trigger`.

### Step 3.4 - Verify Logs

In Render dashboard → Your service → **Logs** tab → You should see:

```
[SERVER] Daily News Harness running on port 10000
[CRON] Scheduled: every 4 hours
```

If you see errors about missing `GEMINI_API_KEY`, you forgot env vars — go to **Environment** tab → add them → **Save Changes** (auto-redeploys).

---

## PART 4 — Keep Render Awake 24/7 (3 minutes)

Render Free spins down after 15 min of no traffic. We trick it by pinging `/health` every 5 min.

### Option A: cron-job.org (Recommended, Free)

1. Go to **https://cron-job.org** → Sign up free.
2. Click **"Create cronjob"**
3. Settings:
   - **Title**: `Keep News Harness Awake`
   - **URL**: `https://YOUR-RENDER-URL.onrender.com/health` (paste your Render URL + `/health`)
   - **Schedule**: **Every 5 minutes** (select `Every 5 minutes` from dropdown)
   - **Request method**: `GET`
4. **Save**. Done — it will ping forever.

### Option B: UptimeRobot

1. **https://uptimerobot.com** → Free account → **Add New Monitor**
2. **Type**: HTTP(s)
3. **URL**: `https://YOUR-URL.onrender.com/ping`
4. **Interval**: 5 minutes → Create.

> Test: Wait 20 min, revisit your Render URL — it should still load instantly (not "waking up").

---

## PART 5 — Test End-to-End (2 minutes)

1. Make sure Pabbly workflow is still on **"Waiting for webhook response"**.
2. In browser, open:
   ```
   https://YOUR-URL.onrender.com/trigger
   ```
   You should see `{"message":"Cycle started"...}`.

3. Go to **Render → Logs** → Watch:
   ```
   [FETCHER] Found 12 fresh articles
   [BRAIN][GEMINI] Decision: PASS ...
   [PUBLISH] Success! Status: 200
   ```
4. Go back to **Pabbly tab** → It should now show **captured data** → Click **Save**.
5. Click **"Save & Send Test Request"** on Facebook step → Check your **Facebook Page** — a post should appear!

> First run may take 30-60 sec (AI processing). If no post after 2 min, check logs for `REJECTED` (AI filtered low-quality news) — try triggering again, it will pick next article.

---

## 🔧 Configuration

### Change RSS Feeds

In Render → **Environment** → Edit `RSS_FEED_URLS` (comma-separated, no spaces needed):

```
https://feeds.bbci.co.uk/news/world/rss.xml,https://rss.nytimes.com/services/xml/rss/nyt/World.xml,https://feeds.washingtonpost.com/rss/world
```

Find RSS URLs by googling `"site name RSS feed"`. Any valid RSS works.

### Change Schedule

In `index.js` line ~160:
```js
cron.schedule('0 */4 * * *', ...) // every 4 hours
// Examples:
// '0 */2 * * *'  → every 2 hours
// '0 9,18 * * *' → 9 AM and 6 PM daily
// '*/30 * * * *' → every 30 min (not recommended - hits limits fast)
```

### Adjust Posts Per Cycle

Env var `MAX_POSTS_PER_CYCLE=2` → Set to `1` for less spam, `3`+ for more volume.

### View What Was Posted

In Render → **Logs** or check `data/processed.json` (if using disk persistence — note Render free disk resets on deploy, see below).

> **Note on Free Tier Storage:** Render free instances have ephemeral storage — `data/processed.json` resets on each deploy/restart. For 100% no-duplicate guarantee after restarts, upgrade to Render persistence or switch to a free external DB (e.g., Upstash Redis). For most users, duplicate risk after restart is tiny.

---

## 📊 Monitoring Your Bot

- **Render Logs**: Dashboard → Your service → Logs (live tail)
- **Health**: `GET /health` and `/ping` — returns uptime + status
- **Status**: `GET /status` — shows feeds count + config check
- **Manual Run**: `GET /trigger` (browser) or `POST /trigger`
- **Pabbly History**: Pabbly → Workflow → History → see every webhook + Facebook post result

All actions log with prefixes `[FETCHER]`, `[BRAIN]`, `[PUBLISH]`, `[CYCLE]`, `[STORAGE]` — search them in logs.

---

## 🐛 Troubleshooting

| Problem | Fix |
|---------|-----|
| `No LLM API key` in logs | Add `GEMINI_API_KEY` in Render → Environment → Save |
| `PABBLY_WEBHOOK_URL not set` | Add correct webhook URL (must start with `https://connect.pabbly.com`) |
| `Failed for RSS URL` | Feed URL dead — remove it from `RSS_FEED_URLS` or try another RSS |
| Posts never appear on Facebook | Check Pabbly → History → Did webhook arrive? Did Facebook step error? Reconnect Facebook Page. |
| AI always REJECTs | Normal — it filters clickbait. Trigger again or lower threshold in prompt (search `average >= 7` in `index.js`) |
| Render shows `Application exited` | Check Build Command = `npm install`, Start = `npm start`, Node >=18 |
| `429 Too Many Requests` from Gemini | You hit free limit — wait 1 min, lower `MAX_POSTS_PER_CYCLE` to 1 |

**Need help?** Copy your Render logs and ask for help at https://github.com/anomalyco/opencode/issues

---

## 🔒 Security Notes

- **NEVER** commit `.env` to GitHub — `.gitignore` already blocks it.
- Rotate keys if leaked: regenerate in Google AI Studio / Pabbly.
- Webhook URL is secret — treat like a password.

---

## 🚀 Local Development (Optional)

```bash
npm install
cp .env.example .env   # then edit .env with your keys
npm start              # or npm run dev for auto-reload
# Open http://localhost:10000/health
```

---

## 📄 License

MIT — free for personal/commercial use.

**You built it! 🎉 Your 24/7 AI newsroom is live. Check your Facebook Page in 4 hours.**
