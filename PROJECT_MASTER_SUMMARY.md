# জনবার্তা (Jonobarta) — Automated Facebook News Publisher Architecture

> **Architecture & Scope Notice**: An experimental SSR web portal was evaluated, but because Render's free tier uses an ephemeral filesystem where disk-persisted articles vanish on container restart, all web portal claims and dead routes have been intentionally cut. This repository is dedicated exclusively as an honest, production-grade automated Facebook news publisher.

---

## 1. Executive Overview & Brand Identity
- **Project Name**: জনবার্তা (Jonobarta) Automated News Engine
- **Brand Slogan**: *সত্য, ন্যায় ও জনমানুষের নির্ভীক কণ্ঠ* (Truth, Justice & the Fearless Voice of the People)
- **Primary Mission**: A 100% automated Bengali digital journalism pipeline that aggregates verified news from 6+ top outlets, rewrites stories with AI (Groq LLM), creates branded 1200×630 HD news cards, and publishes directly to Facebook (Page **Nagorik Desk**) via Make.com.
- **Color Identity**:
  - Deep Emerald Green: `#047857` / `#064e3b`
  - National Crimson Red: `#dc2626` / `#b91c1c`
  - Slate Navy & Charcoal: `#0f172a` / `#1e293b`
  - Background Neutral: `#f8fafc` / `#ffffff`
- **Target Facebook Page**: **Nagorik Desk** (`Page ID: 1113447921841506`)
- **Repository**: `https://github.com/madrasa-2026/daily-news-harness` (Branches: `main`, `master`)

---

## 2. End-to-End Operational Pipeline

```
 ┌───────────────────────┐
 │ Verified Bengali RSS  │ (Prothom Alo, BBC Bangla, Daily Amar Desh,
 │ Feeds (6+ Outlets)    │  The Daily Star Bangla, NTV BD, Channel i)
 └──────────┬────────────┘
            │ (1) Fetch & Filter
            ▼
 ┌───────────────────────┐
 │ Intelligent Dedup &   │ (Keyword filter: rejects sports/cricket;
 │ 7-Day Memory Check    │  checks title cosine/dice similarity against
 └──────────┬────────────┘  data/processed.json & data/recent_stories.json)
            │ (2) Passed News
            ▼
 ┌───────────────────────┐
 │ Groq LLM Rewriter     │ (Model: openai/gpt-oss-120b or llama-3.3-70b;
 │ (Bengali Journalist)  │  Outputs: title, summary, category, keypoints,
 └──────────┬────────────┘  fullContent, shortCaption)
            │ (3) Structured JSON
            ▼
 ┌───────────────────────┐
 │ Dynamic 1200x630 HD   │ (Puppeteer/Chromium generates high-contrast 1200x630 PNG card
 │ News Card Generator   │  with Jonobarta branding, Bengali typography & category pill)
 └──────────┬────────────┘
            │ (4) Dispatch
            ▼
 ┌───────────────────────┐
 │ Make.com Webhook      │ (Scenario ID 9939541, EU2 Region)
 └──────────┬────────────┘
            │
            ▼
 📢 Facebook Page Post (Nagorik Desk)
    (HD 1200x630 Photo + Bengali Summary + Source Attribution)
```

---

## 3. Tech Stack & Key Files

| File / Folder | Role & Description |
| :--- | :--- |
| `index.js` | Express server, cron scheduler (`node-cron`), RSS ingestion, LLM orchestration, webhook publishing. |
| `utils/cardGenerator.js` | Generates 1200×630 HD PNG news cards with Bengali fonts (Hind Siliguri), category chips, and CDN timeout handler. |
| `utils/storage.js` | Flat-file runtime storage (`data/articles.json`) for active cycle memory. |
| `utils/dedup.js` | Article deduplication, URL normalization, recent stories similarity comparison. |
| `data/` | Runtime state (`processed.json`, `recent_stories.json`). |
| `.env` | Environment configuration (NEVER committed to git). |

---

## 4. Third-Party Integrations & Configurations

### A. Make.com (EU2 Region)
- **Scenario URL**: `https://eu2.make.com/1947110/scenarios/9939541/edit`
- **Webhook Endpoint**: `https://example.com/webhook-placeholder` (Read from runtime env var `MAKE_WEBHOOK_URL` / `PABBLY_WEBHOOK_URL`)
- **Status**: `Active` (Turned ON)
- **Execution Mode**: `Immediately as data arrives`
- **Scenario Pipeline**:
  1. `Module 1 (Webhooks)`: Custom Webhook ("Jonobarta Engine") receives payload:
     - `title`: Bengali headline
     - `message`: Full Facebook caption (headline + summary + source)
     - `image_url`: Direct URL to generated 1200x630 HD PNG news card
  2. `Module 2 (Facebook Pages)`: Action `Create a Post with Photos`
     - Page: `Nagorik Desk` (`1113447921841506`)
     - Photo URL: `1.image_url`
     - Caption: `1.message`
- **Quota Efficiency**: 2 operations per post (1 webhook + 1 Facebook post) = ~500 posts/month well within Make's 1,000 free operations.

### B. LLM (Groq & Gemini)
- **Primary LLM**: Groq Cloud API with `openai/gpt-oss-120b` or `llama-3.3-70b-versatile`.
- **Fallback LLM**: Google Gemini API (`gemini-1.5-flash`).
- **Prompt Guardrails**: Strict Bengali journalism persona, neutral objective tone, rejection of clickbait and sports stories.

### C. Cloud Hosting (Render)
- **Service URL**: `https://daily-news-harness.onrender.com`
- **Cron Automation**: Runs automatically on schedule `CRON_SCHEDULE="0 * * * *"` (every hour).
- **Manual Trigger**: `GET https://daily-news-harness.onrender.com/trigger` triggers an immediate news cycle.
- **Operational Endpoints**: `/health`, `/status`, `/audit`.

---

## 5. How to Run & Verify
```bash
# Start locally
npm install
node index.js

# Health & Status check
curl http://localhost:10000/health
curl http://localhost:10000/status

# Manual news cycle trigger
curl http://localhost:10000/trigger
```
