export interface Article {
  id: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  category: string;
  tags: string[];
  author: string;
  photo_url?: string | null;
  card_url?: string | null;
  card_template_id?: string;
  source_feed: string;
  source_url?: string | null;
  status: 'draft' | 'published' | 'archived';
  views: number;
  published_at: string;
  created_at: string;
  updated_at: string;
}

export interface CardTemplate {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_default: boolean;
  layout_config: {
    theme?: string;
    headlineSize?: 'medium' | 'large' | 'extra-large';
    style?: string;
    accentColor?: string;
  };
}

export interface SiteSettings {
  automation_paused: boolean;
  daily_cap: number;
  active_template_id: string;
  brand_name: string;
  brand_slogan: string;
}

export interface PublishLog {
  id: string;
  article_id?: string | null;
  action: string;
  status: 'success' | 'failed' | 'skipped' | 'info';
  details: Record<string, any>;
  created_at: string;
}

export interface CategoryInfo {
  slug: string;
  name: string;
  description: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { slug: "national", name: "জাতীয়", description: "দেশের সামগ্রিক খবরাখবর ও প্রশাসনিক অগ্রগতি" },
  { slug: "politics", name: "রাজনীতি", description: "নির্বাচন, রাজনৈতিক দল ও নীতি নির্ধারণী সংবাদ" },
  { slug: "international", name: "আন্তর্জাতিক", description: "বিশ্ব রাজনীতি, কূটনীতি ও বৈশ্বিক ঘটনাপ্রবাহ" },
  { slug: "economy", name: "অর্থনীতি", description: "ব্যবসা-বাণিজ্য, ব্যাংক ও বাজারের হালচাল" },
  { slug: "sports", name: "খেলাধুলা", description: "ক্রিকেট, ফুটবল ও আন্তর্জাতিক ক্রীড়াঙ্গন" },
  { slug: "entertainment", name: "বিনোদন", description: "চলচ্চিত্র, নাটক, সঙ্গীত ও সংস্কৃতি" },
  { slug: "opinion", name: "মতামত", description: "বুদ্ধিজীবী ও বিশেষজ্ঞদের কলাম এবং সম্পাদকীয়" },
  { slug: "technology", name: "তথ্যপ্রযুক্তি", description: "উদ্ভাবন, এআই, গ্যাজেট ও ডিজিটাল ভবিষ্যৎ" }
];
