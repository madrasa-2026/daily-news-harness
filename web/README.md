# 📰 NAGORIK DESK (নাগরিক ডেস্ক) — News Portal Website

> Next.js 15 (App Router), TypeScript, Tailwind CSS, Supabase PostgreSQL, and Bangla-First Editorial Media Platform.

---

## ⚡ Quick Start (Local Development)

```bash
cd web
npm install
npm run dev
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🗄️ Database Setup (Supabase in 2 Minutes)

1. Create a free account at **[supabase.com](https://supabase.com)** and create a new project.
2. In your Supabase project dashboard, open **SQL Editor** on the left menu.
3. Open [`supabase/schema.sql`](../supabase/schema.sql), copy all SQL text, paste it into the editor, and click **Run**.
   - This creates all 4 tables (`articles`, `templates`, `settings`, `publish_logs`) and inserts the 6 default news card templates.
4. Go to **Project Settings → API** and copy:
   - `Project URL`
   - `anon public key`
5. In your `web/.env.local` (or Vercel Environment Variables), set:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
   ADMIN_PASSWORD=nagorik2026
   ```

*(Note: If Supabase keys are not set, the website automatically loads rich local seed news stories so you can test immediately without any errors!)*

---

## 🚀 Vercel 1-Click Deployment

1. Push this repository to your GitHub account.
2. Go to **[vercel.com](https://vercel.com)** → Add New Project → Import this repository.
3. In **Build and Output Settings**:
   - Set **Root Directory** to `web`
4. In **Environment Variables**, add:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `ADMIN_PASSWORD` (default: `nagorik2026`)
   - `NEXT_PUBLIC_SITE_URL` (your Vercel URL, e.g. `https://nagorik-desk.vercel.app`)
5. Click **Deploy**.

---

## 🛡️ Admin Control Panel

- URL: `/admin` (e.g. `http://localhost:3000/admin`)
- Default Passcode: `nagorik2026`
- Features:
  - **Pause / Resume Switch**: Stop or restart 24/7 automated RSS posting instantly.
  - **Daily Cap Slider**: Control maximum stories posted per day (3 to 30).
  - **Template Selector**: Choose which 1200×630 news card design is active.
  - **Articles Table**: View and inspect all published stories.
  - **Audit Logs**: See automated fetch and publish status in real-time.

---

## 📡 Feeds & SEO

- **RSS 2.0 Feed**: `/rss.xml` and `/feed.xml`
- **Dynamic XML Sitemap**: `/sitemap.xml`
- **Search**: `/search?q=...`
- **Category Pages**: `/category/politics`, `/category/economy`, `/category/technology`, etc.
