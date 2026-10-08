import { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { getArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/types";
import { formatRelativeBengaliTime } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

export const revalidate = 60;

export async function generateMetadata({
  params,
}: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const categoryInfo = CATEGORIES.find((c) => c.slug === slug);

  if (!categoryInfo) {
    return { title: "বিভাগ পাওয়া যায়নি | নাগরিক ডেস্ক" };
  }

  return {
    title: `${categoryInfo.name} সংবাদ | নাগরিক ডেস্ক`,
    description: `${categoryInfo.name} বিভাগের সর্বশেষ খবর ও বিস্তারিত প্রতিবেদন।`,
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const categoryInfo = CATEGORIES.find((c) => c.slug === slug);

  if (!categoryInfo) {
    notFound();
  }

  const articles = await getArticles({
    category: categoryInfo.name,
    limit: 12,
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
        <Link href="/" className="hover:text-brand-600">
          প্রচ্ছদ
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
        <span className="text-brand-600 font-bold">{categoryInfo.name}</span>
      </nav>

      {/* Category Header */}
      <div className="pb-4 border-b-2 border-brand-600">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
          {categoryInfo.name}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {categoryInfo.description}
        </p>
      </div>

      {articles.length === 0 ? (
        <div className="py-16 text-center text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
          এই মুহূর্তে {categoryInfo.name} বিভাগে কোনো সংবাদ পাওয়া যায়নি।
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map((article) => (
            <article
              key={article.id}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-shadow group flex flex-col justify-between"
            >
              <div>
                <Link href={`/news/${article.slug}`}>
                  <div className="relative aspect-16/10 w-full bg-slate-100 overflow-hidden">
                    {article.card_url || article.photo_url ? (
                      <Image
                        src={article.card_url || article.photo_url || ""}
                        alt={article.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                        {categoryInfo.name}
                      </div>
                    )}
                  </div>
                </Link>

                <div className="p-5">
                  <div className="text-xs text-slate-400 mb-2">
                    {formatRelativeBengaliTime(article.published_at)}
                  </div>

                  <Link href={`/news/${article.slug}`}>
                    <h2 className="text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug line-clamp-2 mb-2">
                      {article.title}
                    </h2>
                  </Link>

                  <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
                    {article.summary}
                  </p>
                </div>
              </div>

              <div className="px-5 pb-5 pt-0">
                <Link
                  href={`/news/${article.slug}`}
                  className="text-xs font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-1 group/btn"
                >
                  <span>সম্পূর্ণ পড়ুন</span>
                  <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-0.5 transition-transform" />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
