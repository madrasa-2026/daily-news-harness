import Link from "next/link";
import { Article } from "@/lib/types";
import { formatRelativeBengaliTime } from "@/lib/utils";
import { Zap } from "lucide-react";

interface LatestFeedProps {
  articles: Article[];
}

export default function LatestFeed({ articles }: LatestFeedProps) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs mb-8">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
        <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
          সর্বশেষ খবর
        </h3>
      </div>

      <div className="space-y-4 divide-y divide-slate-100">
        {articles.map((art, idx) => (
          <article key={art.id} className={idx === 0 ? "" : "pt-3"}>
            <Link href={`/news/${art.slug}`} className="group block">
              <span className="text-xs font-semibold text-brand-600 block mb-1">
                {art.category} • {formatRelativeBengaliTime(art.published_at)}
              </span>
              <h4 className="text-sm sm:text-base font-semibold text-slate-800 group-hover:text-brand-600 transition-colors leading-snug">
                {art.title}
              </h4>
            </Link>
          </article>
        ))}
      </div>
    </div>
  );
}
