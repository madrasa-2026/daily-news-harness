import { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { getArticles } from "@/lib/db";
import { formatRelativeBengaliTime, toBengaliNumber } from "@/lib/utils";
import { Search, ChevronRight } from "lucide-react";

interface SearchPageProps {
  searchParams: Promise<{ q?: string }>;
}

export const metadata: Metadata = {
  title: "সংবাদ অনুসন্ধান | নাগরিক ডেস্ক",
  description: "নাগরিক ডেস্ক আর্কাইভ থেকে যেকোনো সংবাদ অনুসন্ধান করুন।",
};

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const { q = "" } = await searchParams;
  const query = q.trim();

  const results = query ? await getArticles({ query, limit: 30 }) : [];

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Search Header Form */}
      <div className="bg-slate-50 p-6 sm:p-8 rounded-2xl border border-slate-200">
        <h1 className="text-2xl font-extrabold text-slate-900 mb-4 flex items-center gap-2">
          <Search className="w-6 h-6 text-brand-600" />
          <span>সংবাদ অনুসন্ধান</span>
        </h1>

        <form method="GET" action="/search" className="relative">
          <input
            type="text"
            name="q"
            defaultValue={query}
            placeholder="কীওয়ার্ড লিখুন (যেমন: নির্বাচন, অর্থনীতি, এআই)..."
            className="w-full pl-4 pr-24 py-3 text-base rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all"
          />
          <button
            type="submit"
            className="absolute right-2 top-2 bottom-2 px-5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-colors"
          >
            খুঁজুন
          </button>
        </form>
      </div>

      {/* Results Header */}
      {query && (
        <div className="flex justify-between items-center text-sm text-slate-600 pb-2 border-b border-slate-200">
          <span>
            <strong className="text-slate-900">&ldquo;{query}&rdquo;</strong> সম্পর্কিত ফলাফল:
          </span>
          <span className="font-bold text-brand-600">
            {toBengaliNumber(results.length)} টি সংবাদ পাওয়া গেছে
          </span>
        </div>
      )}

      {/* Results List */}
      {query && results.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
          কোনো সংবাদ পাওয়া যায়নি। ভিন্ন কোনো কীওয়ার্ড দিয়ে চেষ্টা করুন।
        </div>
      ) : (
        <div className="space-y-4">
          {results.map((article) => (
            <article
              key={article.id}
              className="bg-white p-5 rounded-xl border border-slate-200 hover:border-brand-300 hover:shadow-xs transition-all group"
            >
              <div className="flex flex-col sm:flex-row gap-4">
                {(article.card_url || article.photo_url) && (
                  <div className="relative w-full sm:w-44 h-32 rounded-lg overflow-hidden bg-slate-100 shrink-0">
                    <Image
                      src={article.card_url || article.photo_url || ""}
                      alt={article.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="(max-width: 640px) 100vw, 180px"
                    />
                  </div>
                )}

                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-1.5">
                      <span className="font-bold text-brand-600">{article.category}</span>
                      <span>•</span>
                      <span>{formatRelativeBengaliTime(article.published_at)}</span>
                    </div>

                    <Link href={`/news/${article.slug}`}>
                      <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug mb-2">
                        {article.title}
                      </h2>
                    </Link>

                    <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">
                      {article.summary}
                    </p>
                  </div>

                  <div className="pt-2">
                    <Link
                      href={`/news/${article.slug}`}
                      className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1"
                    >
                      <span>বিস্তারিত পড়ুন</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
