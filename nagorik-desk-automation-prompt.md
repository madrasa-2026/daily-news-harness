# BUILD PROMPT — Automated News Media System (Website + Facebook Page + News Cards)

> Paste this entire prompt into Antigravity as your build instruction.

---

## 1. YOUR ROLE

You are a professional full-stack developer with 10+ years of experience shipping production web products. You work methodically: plan before coding, build in phases, test each phase before moving on, and never mark anything "done" without verifying it actually works. You write clean, documented code. You ask for clarification when a requirement is genuinely ambiguous instead of guessing on something expensive.

You are building for a news media brand called **NAGORIK DESK** (Bangla-first Bangladeshi news outlet). The owner is non-technical; your output must work when he runs it, with setup steps written for a beginner.

## 2. WHAT WE ARE BUILDING (reference: GrowHix "AI News Agent" ad)

An automated news publishing machine with two outputs fed by one pipeline:

1. **News portal website** — professional, fast (<1 second load), mobile-responsive. Publishes news automatically, 24/7, with zero manual posting.
2. **Facebook page automation** — every published story automatically generates a branded **news photo card** (headline + feature image + design) and posts it to the Facebook page.
3. **News card template system** — multiple pre-made card designs the owner can choose between, plus the ability to create custom card designs.

The reference ad promised: 24/7 automated news posting, professional portal design, sub-second loading, mobile-responsive site, automatic photo-card generation per story, many card design variations to choose from, and full automation (content + images + posting, no manual work). **Replicate every one of these capabilities.** This is the benchmark — match it or beat it.

## 3. SKILLS / AGENTS — CHECK FIRST, INSTALL IF MISSING

Before writing any code:

1. Check which skills/agents are installed in this environment (including the **superpowers** Claude skill the owner has installed — use its workflow commands: plan, build, test, review).
2. You will need capabilities for: **Next.js/React web development**, **headless-browser screenshots / HTML-to-image rendering** (Playwright or equivalent), **scheduled jobs / cron**, **RSS feed parsing**, **SEO fundamentals**.
3. If any required skill or agent is missing, **install it first**, then proceed. Do not start building with missing tooling.
4. Work like a professional developer at every step: create a written plan, execute it in order, verify each phase.

## 4. FIXED TECH STACK (do not substitute without asking)

- **Website:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Hosting:** Vercel
- **Database:** Supabase (PostgreSQL) — stores stories, templates, publish log, settings
- **Scheduling:** cron jobs (Vercel Cron or equivalent) for the agent pipeline
- **Card rendering:** HTML/CSS templates rendered to PNG via headless browser screenshot (1200×630 px for Facebook)
- **Language:** Bangla-first UI and content, with English support

## 5. PHASE 1 — NEWS PORTAL WEBSITE

Build a complete, professional news portal:

- **Homepage:** breaking-news ticker, hero story, category sections (National, Politics, International, Sports, Entertainment, Opinion, Technology), latest-news feed, most-read sidebar.
- **Category pages** and **article pages** (headline, feature image, body, author, timestamp, category tag, share buttons).
- **Search** across all stories.
- **Admin panel** (password-protected): view scheduled/published stories, pause/resume automation, pick the active news-card template, see the publish log.
- **Performance:** sub-second page loads — static generation / ISR for article pages, optimized images, no render-blocking bloat. Verify with a Lighthouse run and report the score.
- **Mobile-responsive:** must look flawless on a phone (most readers are mobile).
- **SEO:** proper meta tags, Open Graph tags (using the news card image), sitemap, semantic HTML, Bangla-language markup.

**Done means:** deployed on Vercel, opening on a phone, Lighthouse performance score 90+, owner can browse categories and articles.

## 6. PHASE 2 — NEWS CARD TEMPLATE SYSTEM (core requirement — build carefully)

This is the heart of the request. Build a **template engine**, not one-off designs:

**What a template is:** a reusable layout definition — canvas 1200×630 px, with positioned layers: background/feature image, gradient or color overlay, headline text block (font, size, color, max lines), brand logo, category badge, timestamp. Each published story's data (headline, image, category) fills the template and renders to a PNG.

**Requirements:**

1. **Ship with at least 6 built-in templates**, each visually distinct:
   - Bold headline (big Bangla type over darkened image)
   - Image-dominant (large photo, headline bar at bottom)
   - Minimal (clean white/light, editorial style)
   - Breaking news (red "BREAKING" badge, urgent styling)
   - Quote style (for statements/interviews)
   - Dark premium (dark background, gold/white accents)
2. **Template picker in the admin panel** with **live preview** — the owner sees each design rendered with a sample story before choosing. Switching the active template applies to all future cards (already-published cards are never altered).
3. **Custom template support:** the owner can create his own design — upload logo, set brand colors, choose Bangla/English fonts, pick headline position (top/middle/bottom), toggle category badge and timestamp on/off. Save it as a new template alongside the built-ins. No code editing required.
4. **Rendering pipeline:** HTML/CSS per template → headless-browser screenshot → PNG (1200×630). Must handle long Bangla headlines gracefully (auto-shrink or clean truncation with ellipsis — never cut words mid-way, never overflow the canvas).
5. **Every story gets its card automatically** at publish time, stored and attached to the story record.

**Done means:** 6+ templates render correctly, live preview works in admin, owner creates one custom template himself through the UI, and a test story produces a pixel-perfect card PNG.

## 7. PHASE 3 — AI NEWS AGENT PIPELINE

The automation that fills the website:

1. **Collect (cron, every 30 min):** fetch from Bangladeshi news RSS feeds (Prothom Alo, Jugantor, Dhaka Tribune, The Daily Star, BDNews24, Bangla Tribune — use their public RSS feeds).
2. **Deduplicate:** skip stories already published (match by normalized headline similarity); skip non-news items.
3. **Rewrite:** rewrite each story in the outlet's voice — natural Bangla, original headline (not copied), 3–5 paragraph body. Must not be verbatim copy-paste of the source. Record the source outlet name for attribution.
4. **Categorize:** assign National / Politics / International / Sports / Entertainment / Opinion / Technology automatically.
5. **Feature image:** attach a relevant image per story (source feed image where licensed, otherwise a tasteful category-based placeholder from the template system — never hotlink random images).
6. **Publish:** insert into Supabase, generate the static article page, render the news card with the active template.
7. **Safety rails:** profanity/sensitive-content filter, a blocklist of topics the owner can edit, and a daily cap on story count (owner-configurable, default 15/day). Every automated action is written to a publish log the owner can review.

**Done means:** cron runs, fresh Bangla stories appear on the site without anyone touching it, no duplicates, log shows every action.

## 8. PHASE 4 — FACEBOOK AUTO-POSTING

When a story publishes:

1. Post to the owner's Facebook **Page** (not personal profile): the rendered news card image + headline + short excerpt + link to the full story on the website.
2. Use the official Meta Graph API with a Page access token. **You cannot generate this token — the owner must provide it** (Meta Business Suite → Page access token with `pages_manage_posts` permission). Write him a beginner-friendly, step-by-step guide to get it, and make the token a single env variable (`FB_PAGE_ACCESS_TOKEN`).
3. Respect Facebook rate limits; queue and retry failed posts; log every post attempt.
4. One story = one Facebook post. Never double-post.

**Done means:** a test story publishes and appears on the Facebook page with card image, headline, and working link back to the site.

## 9. PROFESSIONAL WORKFLOW RULES (follow strictly)

1. **Plan first:** before each phase, write a short plan (what you'll build, files you'll touch, how you'll verify) and show it.
2. **Phase order:** 1 → 2 → 3 → 4. Do not start the next phase until the current one's "done means" checklist passes.
3. **Verify, don't assume:** after building, actually run it — open the site on a mobile viewport, trigger the cron manually, inspect a rendered card PNG pixel by pixel, publish a test story end-to-end.
4. **Use the superpowers skill workflows** (planning, systematic debugging, test-driven development, verification-before-completion) where they apply.
5. **Beginner-proof setup:** a single README with every setup step numbered — env variables, Supabase setup, Vercel deploy, cron setup, Facebook token guide. Assume the owner has never done any of it.
6. **Never hardcode secrets.** All keys/tokens go in env variables.
7. If you hit a blocker you cannot solve (e.g., a missing credential only the owner has), stop, explain exactly what's needed and why, and wait — do not work around it with a hack.

## 10. DEFINITION OF DONE (entire project)

- [ ] News portal live on Vercel, fast, mobile-perfect, Bangla-first
- [ ] 6+ card templates with live preview; owner built one custom template via UI
- [ ] Agent publishes fresh stories 24/7 with zero manual input; no duplicates
- [ ] Every story auto-generates a correct 1200×630 news card PNG
- [ ] Stories auto-post to the Facebook page with card + link
- [ ] Admin panel: template picker, automation pause/resume, publish log, daily cap setting
- [ ] README a beginner can follow; all secrets in env variables
- [ ] You have verified each item above by actually running it, not by reading code

Start with Phase 1. Show me the plan first.
