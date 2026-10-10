# Jonobarta on Blogger — Setup Guide

> Brand: **Jonobarta (জনবার্তা)** — Bangla-first news media.
> Goal: professional news site on Blogger, custom domain, AdSense-ready,
> with the automation harness publishing directly to the blog.

---

## PART A — Owner setup (Rana does these in the browser)

### 1. Create the blog
1. Go to **blogger.com** and sign in with your Google account.
2. **Create New Blog** — Title: `Jonobarta (জনবার্তা)`.
3. Address: pick a temporary one, e.g. `jonobarta-news.blogspot.com`
   (the custom domain replaces it later).

### 2. Install a news-style theme
1. Blogger's built-in themes look basic — for a mainstream media look,
   use a free news/magazine XML template.
2. Reputable sources: search "Blogger news magazine template XML"
   (btemplates, gooyaabitemplates).
3. Upload: **Theme → ⋮ menu → Restore → Upload** the XML file.

### 3. Core settings
- **Settings → Language:** Bengali (বাংলা)
- **Settings → Time zone:** (GMT+06:00) Dhaka
- **Settings → HTTPS:** redirect ON

### 4. Custom domain (do BEFORE applying for AdSense)
1. Buy `jonobarta.com` from a domain registrar
   (Namecheap / Cloudflare Registrar, roughly ৳1,000–1,500/year).
2. Blogger → **Settings → Publishing → Custom domain** → enter `jonobarta.com`.
3. Blogger shows DNS records to add — a **CNAME to ghs.google.com**
   plus **A records**. Add them at your registrar's DNS panel.
4. Wait for Blogger to verify, then enable HTTPS.

### 5. Categories (Labels)
Use Blogger **Labels** per post for:
`জাতীয়`, `রাজনীতি`, `আন্তর্জাতিক`, `স্বাস্থ্য`, `গেমিং`, `প্রযুক্তি`, `আজকের ইতিহাসে`, `মতামত`
Create **Pages** menu items linking each label as a category page.

### 6. Layout (the mainstream-media look)
- Header with Jonobarta logo lockup
- Top nav menu (categories from step 5)
- Sidebar: Popular Posts, Labels cloud
- Footer: about text, contact, copyright

### 7. AdSense
1. Left menu → **Earnings** → connect your AdSense account → apply.
2. Apply ONLY when the blog has **25–30+ quality posts** with the
   original-content mix running (rewritten news + Health/Gaming/History/Tech
   originals). Approval takes days to weeks.

---

## PART B — Agent tasks (Antigravity)

### 8. Blogger API publisher (harness integration)
Wire the automation harness to publish directly to the Blogger blog:

1. **One-time Google setup** (write a beginner guide for the owner):
   - Create a Google Cloud project → enable **Blogger API v3**.
   - Create OAuth 2.0 credentials (Desktop or Web app).
   - Owner authorizes once; store the **refresh token** in an env var
     (`BLOGGER_REFRESH_TOKEN`). The harness refreshes access tokens itself.
   - Env vars needed: `BLOGGER_BLOG_ID`, `BLOGGER_CLIENT_ID`,
     `BLOGGER_CLIENT_SECRET`, `BLOGGER_REFRESH_TOKEN`.
2. **Publisher module** in the harness:
   - `publishToBlogger({ title, bodyHtml, labels, imageUrl })` using
     `POST https://www.googleapis.com/blogger/v3/blogs/{blogId}/posts/`.
   - Body HTML includes the feature image at top, story text, and the
     source attribution line.
   - Labels = story category (+ `নিজস্ব প্রতিবেদন` for originals).
   - Save the returned Blogger post URL back to the story record —
     **this URL goes into the Facebook post** (card + link).
3. **Publish order per story:** rewrite → image → Blogger post →
   render news card → send card + headline + Blogger URL to make.com →
   Facebook page.
4. Never double-publish: check the story record's `blogger_post_id`
   before publishing.

### 9. Verification checklist
- [ ] Test post appears on the blog with image, labels, attribution
- [ ] Card PNG renders and posts to Facebook via make.com with working link
- [ ] No duplicate posts on re-runs
- [ ] README updated with the Google Cloud / OAuth steps for a beginner
- [ ] All secrets in env vars

---

## Notes
- AdSense cares about **content**, not platform — Blogger, Vercel, or custom
  code are all equally eligible. The custom domain + original-content mix are
  what move approval odds.
- If posts ever stop: check Render free-tier hours first (~750h/month budget),
  then make.com scenario status, then Blogger token validity.
