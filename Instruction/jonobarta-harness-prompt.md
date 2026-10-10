# HARNESS UPGRADE PROMPT — Turn the existing custom harness into a GrowHix-style AI News Agent

> Paste this into Antigravity. This prompt upgrades the owner's EXISTING custom harness
> (currently on Render + make.com → Facebook page) into the full automated agent shown in
> the GrowHix reference video. Brand: **Jonobarta (জনবার্তা)**.

---

## 1. YOUR ROLE

You are a professional backend/automation developer with 10+ years of experience shipping
production cron workers and integrations. You plan before coding, build in order, verify by
actually running each piece, and never mark anything done without proof it works. No
hardcoded secrets — env variables only.

## 2. SKILLS / AGENTS — CHECK FIRST, INSTALL IF MISSING, THEN WORK

Before writing any code:

1. Check which skills/agents are installed in this environment — including the
   **superpowers** Claude skill the owner has installed (use its workflow commands:
   plan, build, test, review).
2. For this harness upgrade you will need capabilities for: **Node.js/Python backend
   development**, **RSS feed parsing**, **cron/scheduled jobs**, **headless-browser
   screenshots / HTML-to-image rendering** (Playwright or equivalent), **REST APIs and
   webhooks** (Supabase, make.com), **image handling** (resize, compress, WebP).
3. If any required skill or agent is missing, **install it first, then start the work**.
   Do not begin building with missing tooling.
4. Throughout the build, actively use the relevant installed skills/agents for each
   task instead of hand-rolling what a skill already covers.

## 3. STEP 0 — READ THE EXISTING HARNESS FIRST (do not skip)

1. Ask the owner for the harness source code / repository access. Do NOT rebuild blind —
   you are upgrading existing working code, not starting over.
2. Write an inspection report: current file structure, the 5-minute keep-alive mechanism,
   the 1-hour fetch-and-publish cycle, how it collects news, how it talks to make.com,
   what data it sends, and how failures are handled.
3. List: what you will KEEP as-is, what you will MODIFY, what you will ADD. Show this
   plan and wait for the owner's approval before coding.

## 4. WHAT EXISTS TODAY (keep all of this working)

- Harness hosted on **Render (free tier)**.
- **5-minute cron** keep-alive ping (Render sleeps free services after 15 min idle).
- **1-hour cron** that gets news and publishes to the Facebook page.
- **make.com** connected to the Jonobarta Facebook page — it owns the actual FB posting.
- Target state (from the reference video): a portal + Facebook page where NOTHING is
  manual — the agent collects, writes, images, publishes to the website, renders a photo
  card per story, and posts it to Facebook, on a regular cycle, with selectable card designs.

## 5. THE UPGRADE — MAP EVERY VIDEO POINT TO A HARNESS CAPABILITY

### 4.1 Scheduler (keep + improve)
- Keep the 1-hour main cycle; make the interval configurable via env var
  (`AGENT_INTERVAL_MINUTES`, default 60).
- Keep the 5-minute keep-alive; add a health-check log line per ping so the owner can
  see it in Render logs.
- Add a daily scheduled run for original-format content (morning briefing, evening
  roundup — see 4.6).

### 4.2 Collector
- Fetch from Bangladeshi news RSS feeds (Prothom Alo, Jugantor, Dhaka Tribune, The
  Daily Star, BDNews24, Bangla Tribune — public RSS).
- Deduplicate against already-published stories (normalized headline match). Never
  publish the same story twice.

### 4.3 Rewrite engine (replaces any verbatim "auto copy")
- Rewrite every story fully in Jonobarta's voice: **original headline, restructured
  Bangla body — never copy any source sentence verbatim.**
- Where 2+ sources cover the same event, synthesize into one richer story.
- Append a source attribution line (e.g., "সূত্র: ...").
- Daily cap on stories (env var `MAX_STORIES_PER_DAY`, default 15); blocklist of topics
  via env var; profanity/sensitive-content filter.

### 4.4 Image pipeline (the video shows pictures everywhere — website AND cards)
Three tiers, in order, for EVERY story:
1. **Source image** if the feed provides one (record origin).
2. **Stock photo** via free Pexels/Unsplash API (one free API key; README documents it),
   matched by story keywords/category.
3. **AI-generated editorial illustration** (16:9) if stock finds nothing — neutral style,
   never depicting fake people or fake events as real.
- Store images in Supabase Storage (or local persistent disk), never hotlink. Compress
  to WebP, 16:9 crops for article use.

### 4.5 Website publisher
- After rewrite + image, publish the story to the Jonobarta website via its API/database
  (inspect how the site stores stories in Step 0; add a clean publish function if none
  exists). Story record must include: headline, body, category, image URL, source
  attribution, published timestamp, and a flag for original vs rewritten.
- The website must end up like the video's demo: every story with a proper feature image.

### 4.6 Original-content automation (credibility + AdSense)
Alongside rewritten volume, the harness auto-produces original-format content daily:
1. **Morning briefing** — "আজকের প্রধান খবর" (top stories roundup, every morning).
2. **Evening roundup** — the day's key events in summary.
3. **Explainers** — background pieces on the week's big topics, synthesized from
   multiple sources (no single source copied).
- Mark these `is_original = true`. Dashboard/health log shows the original-vs-rewritten
  ratio; target at least 20–30% original-type content.

### 4.7 NEWS CARD TEMPLATE ENGINE (the centerpiece — build carefully)
This is what the video sells hardest. Build it as a proper engine, not one design:
- **Template = reusable layout definition** (1200×630 px canvas): background/feature
  image layer, gradient/color overlay, headline text block (Bangla font, size, color, max
  lines), Jonobarta logo, category badge, timestamp.
- **Ship 6+ built-in templates**, visually distinct: bold headline, image-dominant,
  minimal editorial, breaking-news (red badge), quote style, dark premium.
- **Template switching:** active template chosen via env var or a tiny admin endpoint;
  switching applies to future cards only, never alters published ones.
- **Custom design support:** a template is a JSON + HTML/CSS file pair in a
  `/templates` folder — document the format so the owner (or a designer) can add new
  designs without touching core code. The video explicitly offered "bring your own
  existing design" — honor that.
- **Renderer:** HTML/CSS → headless-browser screenshot → PNG 1200×630. Bangla
  headlines must never overflow or split words (auto-shrink / ellipsis).
- **Automatic:** every published story renders its card with the active template at
  publish time; PNG stored alongside the story record.

### 4.8 make.com dispatcher (Facebook leg — keep his working connection)
- Do NOT replace make.com and do NOT ask for a Meta Page token — make.com owns the
  Facebook connection.
- On each publish: send the rendered card PNG + headline + 1-line excerpt + story link
  to the make.com webhook/scenario (get exact webhook URL + expected field format from
  the owner / existing code in Step 0).
- One story = one post. Check the publish log before sending — never double-post.
- Queue + retry on failure; log every attempt (sent / failed / retried).

### 4.9 Logging & monitoring (so the owner trusts the machine)
- Structured log per cycle: stories collected → rewritten → imaged → website-published
  → card-rendered → sent to make.com, with counts and errors.
- A simple `/health` endpoint on the harness showing: last cycle time, stories today,
  original-vs-rewritten ratio, last error (if any).
- README section: "If posts stop, check this first" — Render free-tier hours
  (~750h/month; always-on ≈ 720h — almost no headroom), make.com scenario status,
  API key validity.

## 6. WORKFLOW RULES

1. Step 0 inspection report FIRST — get approval before coding.
2. Build order: 5.1 → 5.2 → 5.3 → 5.4 → 5.5 → 5.7 → 5.8 → 5.6 → 5.9.
   (Card engine before the dispatcher, so Facebook posts carry real cards from day one.)
3. After each piece: run it for real — trigger a cycle manually, inspect the rewritten
   text (no verbatim source sentences), open the rendered card PNG, confirm the story
   lands on the website AND the Facebook page.
4. Keep every existing working behavior intact — this is an upgrade, regressions are
   failures.
5. Update the README with every new env var and setup step, written for a beginner.

## 7. DEFINITION OF DONE

- [ ] Existing harness behaviors preserved (keep-alive, 1h cycle, make.com posting)
- [ ] Every story rewritten in original wording with source attribution; zero verbatim copies
- [ ] Every story has a real feature image (3-tier pipeline); images stored, not hotlinked
- [ ] Stories publish to the Jonobarta website automatically with images
- [ ] 6+ card templates render correctly; template format documented for custom designs
- [ ] Every story auto-sends its card + headline + link through make.com to the Facebook page
- [ ] Daily briefing/roundup/explainer automation live; originality ratio visible
- [ ] `/health` endpoint + structured logs; README troubleshooting section complete
- [ ] All secrets in env vars; you verified each item by running it, not by reading code

Start with Step 0. Show me the inspection report first.
