import Link from "next/link";
import { Article } from "@/lib/types";
import { toBengaliNumber } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

interface MostReadSidebarProps {
  articles: Article[];
}

export default function MostReadSidebar({ articles }: MostReadSidebarProps) {
  return (
    <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 shadow-xs">
      <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-200">
        <TrendingUp className="w-5 h-5 text-brand-600" />
        <h3 className="font-extrabold text-lg text-slate-900 tracking-tight">
          সর্বাধিক পঠিত
        </h3>
      </div>

      <div className="space-y-4">
        {articles.map((art, idx) => (
          <article key={art.id} className="flex gap-3 items-start group">
            <span className="w-7 h-7 rounded-full bg-slate-200 group-hover:bg-brand-600 group-hover:text-white transition-colors text-slate-700 font-extrabold text-sm flex items-center justify-center shrink-0">
              {toBengaliNumber(idx + 1)}
            </span>
            <div className="flex-1">
              <Link href={`/news/${art.slug}`}>
                <h4 className="text-sm font-bold text-slate-800 group-hover:text-brand-600 transition-colors leading-snug">
                  {art.title}
                </h4>
              </Link>
              <div className="text-xs text-slate-400 mt-1">
                {art.category} • {toBengaliNumber(art.views)} বার পঠিত
              </div>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
