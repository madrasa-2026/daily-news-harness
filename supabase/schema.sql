-- ==============================================================================
-- NAGORIK DESK (নাগরিক ডেস্ক) — SUPABASE DATABASE SCHEMA
-- Automated News Media System (Website + Facebook + News Cards)
-- ==============================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Articles Table
CREATE TABLE IF NOT EXISTS public.articles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    summary TEXT,
    content TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'জাতীয়',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    author TEXT DEFAULT 'নাগরিক ডেস্ক',
    photo_url TEXT,
    card_url TEXT,
    card_template_id TEXT DEFAULT 'bold-headline',
    source_feed TEXT DEFAULT 'নাগরিক ডেস্ক',
    source_url TEXT,
    status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft', 'published', 'archived')),
    views INTEGER NOT NULL DEFAULT 0,
    published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast queries
CREATE INDEX IF NOT EXISTS idx_articles_slug ON public.articles (slug);
CREATE INDEX IF NOT EXISTS idx_articles_category ON public.articles (category);
CREATE INDEX IF NOT EXISTS idx_articles_status_published ON public.articles (status, published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_published_at ON public.articles (published_at DESC);

-- 3. News Card Templates Table
CREATE TABLE IF NOT EXISTS public.templates (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    layout_config JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. Global Settings Table
CREATE TABLE IF NOT EXISTS public.settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Automation Publish Logs Table
CREATE TABLE IF NOT EXISTS public.publish_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    article_id UUID REFERENCES public.articles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('success', 'failed', 'skipped', 'info')),
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_publish_logs_created ON public.publish_logs (created_at DESC);

-- 6. Row Level Security (RLS) Policies
ALTER TABLE public.articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.publish_logs ENABLE ROW LEVEL SECURITY;

-- Public can read published articles
CREATE POLICY "Public articles are viewable by everyone" 
ON public.articles FOR SELECT 
USING (status = 'published');

-- Public can read card templates
CREATE POLICY "Templates are viewable by everyone" 
ON public.templates FOR SELECT 
USING (true);

-- Public can read site settings
CREATE POLICY "Settings are viewable by everyone" 
ON public.settings FOR SELECT 
USING (true);

-- Service role has full access (for cron pipeline and backend admin)
CREATE POLICY "Service role full access on articles" 
ON public.articles FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on templates" 
ON public.templates FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on settings" 
ON public.settings FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

CREATE POLICY "Service role full access on publish_logs" 
ON public.publish_logs FOR ALL 
USING (auth.jwt() ->> 'role' = 'service_role');

-- 7. Seed Initial Settings & 6 Built-in News Card Templates
INSERT INTO public.settings (key, value)
VALUES 
  ('automation_paused', 'false'::jsonb),
  ('daily_cap', '15'::jsonb),
  ('active_template_id', '"bold-headline"'::jsonb),
  ('brand_name', '"নাগরিক ডেস্ক"'::jsonb),
  ('brand_slogan', '"সত্যের সন্ধানে অবিচল"'::jsonb)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.templates (id, name, slug, description, is_default, layout_config)
VALUES
  ('bold-headline', 'বোল্ড হেডলাইন', 'bold-headline', 'গাঢ় ব্যাকগ্রাউন্ডের উপর বিশালাকার টাইপোগ্রাফি', true, '{"theme": "crimson", "headlineSize": "large", "style": "bold"}'::jsonb),
  ('image-dominant', 'ছবি-প্রধান', 'image-dominant', 'বড় ফিচার ছবি ও নিচে টিভি লোয়ার-থার্ড স্টাইল বার', false, '{"theme": "editorial", "headlineSize": "medium", "style": "image_first"}'::jsonb),
  ('minimal', 'মিনিমালিস্ট', 'minimal', 'পরিচ্ছন্ন সাদা ও হালকা ব্যাকগ্রাউন্ডে ক্লাসিক্যাল এডিটোরিয়াল', false, '{"theme": "light", "headlineSize": "medium", "style": "clean"}'::jsonb),
  ('breaking-news', 'ব্রেকিং নিউজ', 'breaking-news', 'উচ্চ জরুরি অবস্থার লাল ব্রেকিং ব্যাজ ও ফ্ল্যাশ স্ট্রিপ', false, '{"theme": "urgent_red", "headlineSize": "large", "style": "breaking"}'::jsonb),
  ('quote-style', 'উদ্ধৃতি স্টাইল', 'quote-style', 'রাজনৈতিক ও গুরুত্বপূর্ণ ব্যক্তিত্বের বক্তব্য বা উক্তি সম্বলিত', false, '{"theme": "quote", "headlineSize": "medium", "style": "quote"}'::jsonb),
  ('dark-premium', 'ডার্ক প্রিমিয়াম', 'dark-premium', 'গাঢ় কালো ব্যাকগ্রাউন্ডে সোনালী ও সাদা এক্সেন্ট সহ প্রিমিয়াম লুক', false, '{"theme": "dark_gold", "headlineSize": "large", "style": "premium"}'::jsonb)
ON CONFLICT (id) DO NOTHING;
