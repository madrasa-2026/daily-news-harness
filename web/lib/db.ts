import { supabase, isSupabaseConfigured } from "./supabase";
import { Article, CardTemplate, SiteSettings, PublishLog, CATEGORIES } from "./types";
import { SEED_ARTICLES } from "./seed";

// In-memory store for instant local preview fallback
let inMemoryArticles: Article[] = [...SEED_ARTICLES];

let inMemorySettings: SiteSettings = {
  automation_paused: false,
  daily_cap: 15,
  active_template_id: "bold-headline",
  brand_name: "নাগরিক ডেস্ক",
  brand_slogan: "সত্যের সন্ধানে অবিচল"
};

let inMemoryLogs: PublishLog[] = [
  {
    id: "log-1",
    article_id: "art-1",
    action: "RSS_FETCH_AND_PUBLISH",
    status: "success",
    details: { feed: "দৈনিক আমার দেশ", template: "bold-headline", cardGenerated: true },
    created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString()
  },
  {
    id: "log-2",
    article_id: "art-2",
    action: "RSS_FETCH_AND_PUBLISH",
    status: "success",
    details: { feed: "প্রথম আলো", template: "image-dominant", cardGenerated: true },
    created_at: new Date(Date.now() - 1000 * 60 * 65).toISOString()
  },
  {
    id: "log-3",
    article_id: "art-3",
    action: "RSS_FETCH_AND_PUBLISH",
    status: "success",
    details: { feed: "বিবিসি বাংলা", template: "minimal", cardGenerated: true },
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString()
  }
];

export async function getArticles(options?: {
  category?: string;
  limit?: number;
  offset?: number;
  query?: string;
}): Promise<Article[]> {
  const { category, limit = 20, offset = 0, query } = options || {};

  if (isSupabaseConfigured && supabase) {
    let q = supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("published_at", { ascending: false });

    if (category) {
      q = q.eq("category", category);
    }
    if (query) {
      q = q.or(`title.ilike.%${query}%,summary.ilike.%${query}%,content.ilike.%${query}%`);
    }
    if (limit) {
      q = q.range(offset, offset + limit - 1);
    }

    const { data, error } = await q;
    if (!error && data) {
      return data as Article[];
    }
    console.warn("[DB] Supabase query failed, falling back to local seed data:", error?.message);
  }

  // Local fallback
  let list = inMemoryArticles.filter(a => a.status === "published");
  if (category) {
    list = list.filter(a => a.category.toLowerCase() === category.toLowerCase());
  }
  if (query) {
    const qLower = query.toLowerCase();
    list = list.filter(
      a =>
        a.title.toLowerCase().includes(qLower) ||
        a.summary.toLowerCase().includes(qLower) ||
        a.content.toLowerCase().includes(qLower)
    );
  }
  list.sort((a, b) => new Date(b.published_at).getTime() - new Date(a.published_at).getTime());
  return list.slice(offset, offset + limit);
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const decodedSlug = decodeURIComponent(slug);

  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("slug", decodedSlug)
      .single();

    if (!error && data) {
      // Increment views asynchronously
      try {
        await supabase.rpc("increment_article_views", { article_id: data.id });
      } catch {
        // Ignore view count RPC errors if RPC is not deployed yet
      }
      return data as Article;
    }
  }

  // Local fallback
  const found = inMemoryArticles.find(a => a.slug === decodedSlug);
  if (found) {
    found.views += 1;
    return found;
  }
  return null;
}

export async function getHeroStory(): Promise<Article | null> {
  const articles = await getArticles({ limit: 1 });
  return articles[0] || null;
}

export async function getFeaturedStories(limit = 4): Promise<Article[]> {
  const articles = await getArticles({ limit: limit + 1 });
  return articles.slice(1, limit + 1);
}

export async function getLatestFeed(limit = 10): Promise<Article[]> {
  return getArticles({ limit });
}

export async function getMostRead(limit = 5): Promise<Article[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("articles")
      .select("*")
      .eq("status", "published")
      .order("views", { ascending: false })
      .limit(limit);

    if (!error && data) return data as Article[];
  }

  const sorted = [...inMemoryArticles]
    .filter(a => a.status === "published")
    .sort((a, b) => b.views - a.views);
  return sorted.slice(0, limit);
}

export async function getCategoryArticles(category: string, limit = 6): Promise<Article[]> {
  return getArticles({ category, limit });
}

export async function getSiteSettings(): Promise<SiteSettings> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase.from("settings").select("*");
    if (!error && data) {
      const settingsMap: any = { ...inMemorySettings };
      data.forEach(item => {
        settingsMap[item.key] = item.value;
      });
      return settingsMap as SiteSettings;
    }
  }
  return inMemorySettings;
}

export async function updateSiteSetting(key: string, value: any): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    await supabase.from("settings").upsert({ key, value, updated_at: new Date().toISOString() });
  }
  (inMemorySettings as any)[key] = value;
}

export async function getPublishLogs(limit = 20): Promise<PublishLog[]> {
  if (isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from("publish_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) return data as PublishLog[];
  }
  return inMemoryLogs.slice(0, limit);
}

export async function getAllCardTemplates(): Promise<CardTemplate[]> {
  return [
    {
      id: "bold-headline",
      name: "বোল্ড হেডলাইন",
      slug: "bold-headline",
      description: "গাঢ় ব্যাকগ্রাউন্ডের উপর বিশালাকার টাইপোগ্রাফি",
      is_default: true,
      layout_config: { theme: "crimson", headlineSize: "large", style: "bold" }
    },
    {
      id: "image-dominant",
      name: "ছবি-প্রধান",
      slug: "image-dominant",
      description: "বড় ফিচার ছবি ও নিচে টিভি লোয়ার-থার্ড স্টাইল বার",
      is_default: false,
      layout_config: { theme: "editorial", headlineSize: "medium", style: "image_first" }
    },
    {
      id: "minimal",
      name: "মিনিমালিস্ট",
      slug: "minimal",
      description: "পরিচ্ছন্ন সাদা ও হালকা ব্যাকগ্রাউন্ডে ক্লাসিক্যাল এডিটোরিয়াল",
      is_default: false,
      layout_config: { theme: "light", headlineSize: "medium", style: "clean" }
    },
    {
      id: "breaking-news",
      name: "ব্রেকিং নিউজ",
      slug: "breaking-news",
      description: "উচ্চ জরুরি অবস্থার লাল ব্রেকিং ব্যাজ ও ফ্ল্যাশ স্ট্রিপ",
      is_default: false,
      layout_config: { theme: "urgent_red", headlineSize: "large", style: "breaking" }
    },
    {
      id: "quote-style",
      name: "উদ্ধৃতি স্টাইল",
      slug: "quote-style",
      description: "রাজনৈতিক ও গুরুত্বপূর্ণ ব্যক্তিত্বের বক্তব্য বা উক্তি সম্বলিত",
      is_default: false,
      layout_config: { theme: "quote", headlineSize: "medium", style: "quote" }
    },
    {
      id: "dark-premium",
      name: "ডার্ক প্রিমিয়াম",
      slug: "dark-premium",
      description: "গাঢ় কালো ব্যাকগ্রাউন্ডে সোনালী ও সাদা এক্সেন্ট সহ প্রিমিয়াম লুক",
      is_default: false,
      layout_config: { theme: "dark_gold", headlineSize: "large", style: "premium" }
    }
  ];
}
