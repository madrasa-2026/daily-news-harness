import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getArticleBySlug, getArticles, getMostRead } from "@/lib/db";
import { formatBengaliDate, calculateReadTime } from "@/lib/utils";
import ShareButtons from "@/components/ShareButtons";
import MostReadSidebar from "@/components/MostReadSidebar";
import { Clock, Eye, Tag, ChevronRight, User } from "lucide-react";

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: ArticlePageProps): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    return {
      title: "সংবাদ পাওয়া যায়নি | নাগরিক ডেস্ক",
    };
  }

  const imageUrl = article.card_url || article.photo_url || "/og-image.png";

  return {
    title: `${article.title} | নাগরিক ডেস্ক`,
    description: article.summary,
    openGraph: {
      title: article.title,
      description: article.summary,
      type: "article",
      publishedTime: article.published_at,
      authors: [article.author],
      tags: article.tags,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: article.title,
        },
      ],
      locale: "bn_BD",
    },
    twitter: {
      card: "summary_large_image",
      title: article.title,
      description: article.summary,
      images: [imageUrl],
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const [relatedArticles, mostReadStories] = await Promise.all([
    getArticles({ category: article.category, limit: 3 }),
    getMostRead(5),
  ]);

  const readTime = calculateReadTime(article.content);
  const formattedDate = formatBengaliDate(article.published_at);
  const paragraphs = article.content.split("\n\n").filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 mb-6 font-medium">
        <Link href="/" className="hover:text-brand-600">
          প্রচ্ছদ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-brand-600 font-bold">{article.category}</span>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="truncate max-w-xs sm:max-w-md text-slate-400">
          {article.title}
        </span>
      </nav>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
        {/* Main Article Content (8 cols) */}
        <article className="lg:col-span-8">
          {/* Category Pill */}
          <div className="mb-3">
            <span className="bg-brand-50 text-brand-600 text-xs font-bold px-3 py-1 rounded-sm border border-brand-200">
              {article.category}
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-2xl sm:text-4xl lg:text-4xl font-extrabold text-slate-900 leading-tight mb-4">
            {article.title}
          </h1>

          {/* Lead Summary */}
          {article.summary && (
            <p className="text-lg sm:text-xl text-slate-600 font-medium leading-relaxed mb-6 border-l-4 border-brand-600 pl-4 bg-slate-50 py-2 rounded-r-md">
              {article.summary}
            </p>
          )}

          {/* Metadata Bar */}
          <div className="flex flex-wrap items-center justify-between gap-y-2 text-xs sm:text-sm text-slate-500 pb-4 border-b border-slate-200 mb-6">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1.5 font-bold text-slate-800">
                <User className="w-4 h-4 text-brand-600" />
                {article.author}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                {formattedDate}
              </span>
            </div>

            <div className="flex items-center gap-3 text-slate-400">
              <span>{readTime}</span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" />
                {article.views} বার পঠিত
              </span>
            </div>
          </div>

          {/* Feature Image or News Card */}
          {(article.card_url || article.photo_url) && (
            <div className="mb-8">
              <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden bg-slate-100 shadow-md">
                <Image
                  src={article.card_url || article.photo_url || ""}
                  alt={article.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 66vw"
                />
              </div>
              {article.source_feed && (
                <p className="text-xs text-slate-400 italic text-right mt-1.5">
                  তথ্যসূত্র: {article.source_feed}
                </p>
              )}
            </div>
          )}

          {/* Social Share Bar Top */}
          <ShareButtons url={`/news/${article.slug}`} title={article.title} />

          {/* Article Body */}
          <div className="prose prose-lg max-w-none text-slate-800 leading-relaxed space-y-5 text-base sm:text-lg my-8 font-serif">
            {paragraphs.map((p, idx) => (
              <p key={idx} className="leading-8 text-slate-700">
                {p}
              </p>
            ))}
          </div>

          {/* Tags */}
          {article.tags && article.tags.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-6 pb-8 border-t border-slate-200">
              <Tag className="w-4 h-4 text-slate-400" />
              <span className="text-xs font-bold text-slate-500">ট্যাগ:</span>
              {article.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-medium hover:bg-slate-200 transition-colors"
                >
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {/* Social Share Bar Bottom */}
          <ShareButtons url={`/news/${article.slug}`} title={article.title} />

          {/* Related Stories */}
          <div className="mt-12 pt-8 border-t-2 border-slate-200">
            <h3 className="text-xl font-bold text-slate-900 mb-6">
              সম্পর্কিত সংবাদ
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {relatedArticles
                .filter((r) => r.id !== article.id)
                .slice(0, 3)
                .map((related) => (
                  <Link
                    key={related.id}
                    href={`/news/${related.slug}`}
                    className="group block space-y-2"
                  >
                    <div className="relative aspect-16/10 rounded-lg overflow-hidden bg-slate-100">
                      {related.card_url || related.photo_url ? (
                        <Image
                          src={related.card_url || related.photo_url || ""}
                          alt={related.title}
                          fill
                          className="object-cover group-hover:scale-105 transition-transform"
                          sizes="(max-width: 640px) 100vw, 33vw"
                        />
                      ) : (
                        <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white text-xs">
                          নাগরিক ডেস্ক
                        </div>
                      )}
                    </div>
                    <h4 className="text-sm font-bold text-slate-800 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
                      {related.title}
                    </h4>
                  </Link>
                ))}
            </div>
          </div>
        </article>

        {/* Sidebar (4 cols) */}
        <aside className="lg:col-span-4 space-y-6">
          <MostReadSidebar articles={mostReadStories} />

          {/* Brand Card Widget */}
          <div className="bg-brand-600 text-white rounded-xl p-6 shadow-md">
            <h4 className="text-lg font-bold mb-2">নাগরিক ডেস্ক নিউজলেটার</h4>
            <p className="text-sm text-brand-100 mb-4">
              প্রতিদিনের সেরা খবর ও ব্রেকিং বিশ্লেষণ সরাসরি আপনার ইনবক্সে পেতে সাথে থাকুন।
            </p>
            <div className="bg-brand-700/60 rounded-lg p-3 text-xs text-brand-200">
              ২৪ ঘণ্টা স্বয়ংক্রিয় এআই সাংবাদিকতা ও ভেরিফায়েড উৎস দ্বারা পরিচালিত।
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
