import {
  getHeroStory,
  getFeaturedStories,
  getLatestFeed,
  getMostRead,
  getCategoryArticles,
  getArticles,
} from "@/lib/db";
import BreakingTicker from "@/components/BreakingTicker";
import HeroSection from "@/components/HeroSection";
import CategorySection from "@/components/CategorySection";
import LatestFeed from "@/components/LatestFeed";
import MostReadSidebar from "@/components/MostReadSidebar";

// Sub-second ISR caching (revalidate every 60 seconds)
export const revalidate = 60;

export default async function HomePage() {
  const [
    heroStory,
    featuredStories,
    latestStories,
    mostReadStories,
    politicsStories,
    economyStories,
    techStories,
    intlStories,
    allArticles,
  ] = await Promise.all([
    getHeroStory(),
    getFeaturedStories(4),
    getLatestFeed(6),
    getMostRead(5),
    getCategoryArticles("রাজনীতি", 4),
    getCategoryArticles("অর্থনীতি", 4),
    getCategoryArticles("তথ্যপ্রযুক্তি", 4),
    getCategoryArticles("আন্তর্জাতিক", 4),
    getArticles({ limit: 10 }),
  ]);

  return (
    <div className="space-y-8">
      {/* 1. Breaking News Ticker */}
      <BreakingTicker articles={allArticles} />

      {/* 2. Hero & Featured Grid */}
      <HeroSection hero={heroStory} featured={featuredStories} />

      {/* 3. Main Content Grid (8 cols Categories + 4 cols Sidebars) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Category Sections */}
        <div className="lg:col-span-8 space-y-2">
          <CategorySection
            title="জাতীয় ও রাজনীতি"
            categorySlug="politics"
            articles={politicsStories}
          />

          <CategorySection
            title="অর্থনীতি ও বাণিজ্য"
            categorySlug="economy"
            articles={economyStories}
          />

          <CategorySection
            title="বিজ্ঞান ও তথ্যপ্রযুক্তি"
            categorySlug="technology"
            articles={techStories}
          />

          <CategorySection
            title="আন্তর্জাতিক সংবাদ"
            categorySlug="international"
            articles={intlStories}
          />
        </div>

        {/* Right: Latest & Most Read Sidebars */}
        <div className="lg:col-span-4 space-y-6">
          <LatestFeed articles={latestStories} />
          <MostReadSidebar articles={mostReadStories} />
        </div>
      </div>
    </div>
  );
}
