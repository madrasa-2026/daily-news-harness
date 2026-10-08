# জনবার্তা (Jonobarta) — Automated News Engine & Portal Architecture

> **Notice for AI Assistants & Developers**: This document contains the complete architectural, operational, and configuration blueprint for the **Jonobarta (জনবার্তা)** project. Read this file to understand the system history, workflows, third-party integrations, and code structure.

---

## 1. Executive Overview & Brand Identity
- **Project Name**: জনবার্তা (Jonobarta) News Engine & Web Portal
- **Brand Slogan**: *সত্য, ন্যায় ও জনমানুষের নির্ভীক কণ্ঠ* (Truth, Justice & the Fearless Voice of the People)
- **Primary Mission**: A 100% automated Bengali digital journalism pipeline that aggregates verified news, rewrites stories with AI (Groq LLM), creates branded 1200×630 HD news cards, publishes to an SSR web portal, and broadcasts to social media (Facebook Page **Nagorik Desk**) via Make.com.
- **Color Identity**:
  - Deep Emerald Green: `#047857` / `#064e3b`
  - National Crimson Red: `#dc2626` / `#b91c1c`
  - Slate Navy & Charcoal: `#0f172a` / `#1e293b`
  - Background Neutral: `#f8fafc` / `#ffffff`
- **Target Facebook Page**: **Nagorik Desk** (`Page ID: 1113447921841506`)
- **Live Web Portal**: `https://daily-news-harness.onrender.com`
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
 │ Dynamic 1200x630 HD   │ (Generates SVG with sharp typography,
 │ News Card Generator   │  category badge, source photo, gradient overlay,
 └──────────┬────────────┘  branding header & footer -> saved to public/cards/)
            │ (4) Publish
            ├─────────────────────────────────────────┐
            ▼                                         ▼
 ┌───────────────────────┐                 ┌───────────────────────┐
 │ SSR Web Portal Storage│                 │ Make.com Webhook      │
 │ (data/articles.json)  │                 │ (Scenario ID 9939541) │
 └──────────┬────────────┘                 └──────────┬────────────┘
            │                                         │
            ▼                                         ▼
 🌐 Web Portal Live Article                📢 Facebook Page Post
    https://daily-news-harness.onrender.com/news/:slug   (HD Photo + Caption + Portal URL)
```

---

## 3. Tech Stack & Key Files

| File / Folder | Role & Description |
| :--- | :--- |
| `index.js` | Express server, cron scheduler (`node-cron`), RSS ingestion, LLM orchestration, routes. |
| `portal/` | SSR web portal engine (templates: `home.js`, `article.js`, `category.js`, `layout.js`, CSS: `portal/public/css/style.css`). |
| `utils/card_generator.js` | Generates 1200×630 SVG news cards with embedded images, Bengali fonts, category chips, and watermark. |
| `utils/storage.js` | JSON-based flat-file persistent storage (`data/articles.json`) with slugification, pagination, view counter. |
| `utils/dedup.js` | Article deduplication, URL normalization, recent stories similarity comparison. |
| `data/` | Persistent runtime state (`articles.json`, `processed.json`, `recent_stories.json`). |
| `config.production.json` | Production fallback credentials and URLs for cloud runtime. |
| `.env` | Local development environment configuration. |

---

## 4. Third-Party Integrations & Configurations

### A. Make.com (EU2 Region)
- **Scenario URL**: `https://eu2.make.com/1947110/scenarios/9939541/edit`
- **Webhook Endpoint**: `https://hook.eu2.make.com/fq5tx5zmwnrrkdvx7q6a1pxsiqn1y2mf`
- **Status**: `Active` (Turned ON)
- **Execution Mode**: `Immediately as data arrives`
- **Scenario Pipeline**:
  1. `Module 1 (Webhooks)`: Custom Webhook ("Jonobarta Engine") receives payload:
     - `title`: Bengali headline
     - `message`: Full Facebook caption (headline + summary + portal URL)
     - `image_url`: Direct URL to generated news card (`https://daily-news-harness.onrender.com/cards/...`)
     - `link`: Direct portal article URL (`https://daily-news-harness.onrender.com/news/...`)
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

---

## 5. Web Portal Features
- **Server-Side Rendered (SSR)**: Instant load speeds, zero client hydration delays.
- **Dynamic Breaking News Ticker**: Top 5 latest stories scrolling at header.
- **Lead Story Hero Layout**: Major headline with category chip and timestamp.
- **Responsive AdSense Placements**: Standard IAB banner slots ready for monetization.
- **Category Taxonomy**: `জাতীয়`, `রাজনীতি`, `অর্থনীতি`, `আইন ও আদালত`, `সংস্কার ও রাষ্ট্র`, `ক্যাম্পাস ও তরুণ`, `আন্তর্জাতিক`.
- **OpenGraph & Twitter Cards**: Dynamic social sharing cards previewing the exact generated news card image.
- **RSS 2.0 Feed**: Auto-generated XML feed at `/rss` and `/feed.xml`.

---

## 6. How to Run & Verify
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
