import Link from "next/link";
import { Article } from "@/lib/types";
import { Radio } from "lucide-react";

interface BreakingTickerProps {
  articles: Article[];
}

export default function BreakingTicker({ articles }: BreakingTickerProps) {
  if (!articles || articles.length === 0) return null;

  // Duplicate for seamless infinite loop
  const tickerItems = [...articles, ...articles];

  return (
    <div className="bg-slate-900 text-white border-b border-slate-800 text-sm overflow-hidden flex items-center h-10">
      <div className="bg-brand-600 text-white px-3 sm:px-4 h-full flex items-center gap-1.5 font-bold tracking-wide shrink-0 z-10 shadow-md">
        <Radio className="w-3.5 h-3.5 animate-pulse text-white" />
        <span className="text-xs sm:text-sm">ব্রেকিং</span>
      </div>

      <div className="overflow-hidden relative flex-1 flex items-center">
        <div className="animate-ticker flex items-center gap-8 pl-4">
          {tickerItems.map((article, idx) => (
            <Link
              key={`${article.id}-${idx}`}
              href={`/news/${article.slug}`}
              className="hover:text-brand-400 transition-colors flex items-center gap-3 shrink-0"
            >
              <span className="text-brand-500 font-bold">●</span>
              <span className="font-medium text-slate-200 hover:underline">{article.title}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
