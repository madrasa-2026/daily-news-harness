import Link from "next/link";
import Image from "next/image";
import { Article } from "@/lib/types";
import { formatRelativeBengaliTime } from "@/lib/utils";
import { ChevronRight } from "lucide-react";

interface CategorySectionProps {
  title: string;
  categorySlug: string;
  articles: Article[];
}

export default function CategorySection({
  title,
  categorySlug,
  articles,
}: CategorySectionProps) {
  if (!articles || articles.length === 0) return null;

  const leadArticle = articles[0];
  const remainingArticles = articles.slice(1, 4);

  return (
    <section className="mb-12">
      {/* Category Header */}
      <div className="flex justify-between items-center pb-2 mb-6 border-b-2 border-brand-600">
        <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h2>
        <Link
          href={`/category/${categorySlug}`}
          className="text-xs sm:text-sm font-semibold text-brand-600 hover:text-brand-800 flex items-center gap-0.5 group transition-colors"
        >
          <span>আরও দেখুন</span>
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Main Lead Card for category (7 cols) */}
        {leadArticle && (
          <div className="md:col-span-7">
            <Link href={`/news/${leadArticle.slug}`} className="group block">
              <div className="relative aspect-16/10 w-full rounded-lg overflow-hidden bg-slate-100 mb-3">
                {leadArticle.card_url || leadArticle.photo_url ? (
                  <Image
                    src={leadArticle.card_url || leadArticle.photo_url || ""}
                    alt={leadArticle.title}
                    fill
                    className="object-cover group-hover:scale-102 transition-transform duration-300"
                    sizes="(max-width: 768px) 100vw, 55vw"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white">
                    {title}
                  </div>
                )}
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-snug mb-2">
                {leadArticle.title}
              </h3>
              <p className="text-sm text-slate-600 line-clamp-2 mb-2 leading-relaxed">
                {leadArticle.summary}
              </p>
              <div className="text-xs text-slate-400">
                {formatRelativeBengaliTime(leadArticle.published_at)}
              </div>
            </Link>
          </div>
        )}

        {/* 3 Secondary Cards for category (5 cols) */}
        <div className="md:col-span-5 flex flex-col divide-y divide-slate-100 justify-between">
          {remainingArticles.map((art) => (
            <article key={art.id} className="py-3 first:pt-0 last:pb-0">
              <Link href={`/news/${art.slug}`} className="group flex gap-3 items-start">
                <div className="flex-1">
                  <h4 className="text-sm sm:text-base font-semibold text-slate-800 group-hover:text-brand-600 transition-colors leading-snug mb-1">
                    {art.title}
                  </h4>
                  <span className="text-xs text-slate-400">
                    {formatRelativeBengaliTime(art.published_at)}
                  </span>
                </div>

                {(art.card_url || art.photo_url) && (
                  <div className="relative w-20 h-16 rounded-md overflow-hidden bg-slate-100 shrink-0">
                    <Image
                      src={art.card_url || art.photo_url || ""}
                      alt={art.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform"
                      sizes="80px"
                    />
                  </div>
                )}
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
