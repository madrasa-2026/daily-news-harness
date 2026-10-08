import Link from "next/link";
import Image from "next/image";
import { Article } from "@/lib/types";
import { formatRelativeBengaliTime } from "@/lib/utils";
import { Clock } from "lucide-react";

interface HeroSectionProps {
  hero: Article | null;
  featured: Article[];
}

export default function HeroSection({ hero, featured }: HeroSectionProps) {
  if (!hero) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 mb-12 pb-10 border-b border-slate-200">
      {/* 1. Main Lead Hero Story (8 cols on lg) */}
      <div className="lg:col-span-8 flex flex-col justify-between">
        <Link href={`/news/${hero.slug}`} className="group block">
          <div className="relative aspect-16/9 w-full rounded-xl overflow-hidden bg-slate-100 mb-4 shadow-xs">
            {hero.card_url || hero.photo_url ? (
              <Image
                src={hero.card_url || hero.photo_url || ""}
                alt={hero.title}
                fill
                priority
                className="object-cover group-hover:scale-102 transition-transform duration-300"
                sizes="(max-width: 1024px) 100vw, 66vw"
              />
            ) : (
              <div className="w-full h-full bg-slate-800 flex items-center justify-center text-white font-bold text-xl">
                নাগরিক ডেস্ক
              </div>
            )}
            <div className="absolute top-3 left-3 bg-brand-600 text-white text-xs font-bold px-3 py-1 rounded-sm shadow-md">
              {hero.category}
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 group-hover:text-brand-600 transition-colors leading-tight mb-3">
            {hero.title}
          </h1>

          <p className="text-slate-600 text-base sm:text-lg leading-relaxed line-clamp-2 mb-4">
            {hero.summary}
          </p>

          <div className="flex items-center gap-4 text-xs sm:text-sm text-slate-500 font-medium">
            <span className="text-slate-800 font-semibold">{hero.author}</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatRelativeBengaliTime(hero.published_at)}
            </span>
          </div>
        </Link>
      </div>

      {/* 2. Secondary Featured Stories Grid (4 cols on lg) */}
      <div className="lg:col-span-4 flex flex-col divide-y divide-slate-200">
        <h3 className="text-base font-bold text-slate-900 pb-2 border-b-2 border-brand-600 uppercase tracking-wide flex items-center justify-between">
          <span>গুরুত্বপূর্ণ সংবাদ</span>
          <span className="w-2 h-2 rounded-full bg-brand-600 animate-ping"></span>
        </h3>

        {featured.map((article) => (
          <article key={article.id} className="py-4 first:pt-4 last:pb-0">
            <Link href={`/news/${article.slug}`} className="group block space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-sm">
                  {article.category}
                </span>
                <span className="text-xs text-slate-400">
                  {formatRelativeBengaliTime(article.published_at)}
                </span>
              </div>

              <h2 className="text-base sm:text-lg font-bold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2 leading-snug">
                {article.title}
              </h2>

              <p className="text-xs sm:text-sm text-slate-500 line-clamp-2 leading-relaxed">
                {article.summary}
              </p>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
