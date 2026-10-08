import Link from "next/link";
import { CATEGORIES } from "@/lib/types";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-12 pb-8 border-t-4 border-brand-600 mt-16">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 pb-10 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-1 space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-600 text-white rounded-md flex items-center justify-center font-bold text-xl">
                না
              </div>
              <span className="text-xl font-bold text-white tracking-tight">নাগরিক ডেস্ক</span>
            </div>
            <p className="text-sm text-slate-400 leading-relaxed">
              স্বতন্ত্র, নিরপেক্ষ ও সত্যনিষ্ঠ সাংবাদিকতায় নিবেদিত ডিজিটাল গণমাধ্যম প্ল্যাটফর্ম। ২৪ ঘণ্টা দেশ-বিদেশের তাজা সংবাদ পরিবেশনে অঙ্গীকারবদ্ধ।
            </p>
          </div>

          {/* Categories 1 */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-brand-500 pl-2">
              বিভাগসমূহ
            </h4>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.slice(0, 4).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="hover:text-brand-400 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Categories 2 */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-brand-500 pl-2">
              অন্যান্য বিভাগ
            </h4>
            <ul className="space-y-2 text-sm">
              {CATEGORIES.slice(4).map((cat) => (
                <li key={cat.slug}>
                  <Link
                    href={`/category/${cat.slug}`}
                    className="hover:text-brand-400 transition-colors"
                  >
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform Links */}
          <div>
            <h4 className="text-white text-sm font-bold uppercase tracking-wider mb-4 border-l-2 border-brand-500 pl-2">
              সার্ভিস ও পলিসি
            </h4>
            <ul className="space-y-2 text-sm text-slate-400">
              <li>
                <Link href="/admin" className="hover:text-brand-400">
                  অ্যাডমিন ড্যাশবোর্ড
                </Link>
              </li>
              <li>
                <Link href="/rss.xml" className="hover:text-brand-400">
                  আরএসএস ফিড (RSS)
                </Link>
              </li>
              <li>
                <Link href="/sitemap.xml" className="hover:text-brand-400">
                  সাইটম্যাপ (Sitemap)
                </Link>
              </li>
              <li>
                <span className="text-xs text-slate-500">স্বয়ংক্রিয় এআই ও আরএসএস মনিটরিং সক্ষম</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center text-xs text-slate-500 gap-4">
          <p>© {new Date().getFullYear()} নাগরিক ডেস্ক (NAGORIK DESK) • সর্বস্বত্ব সংরক্ষিত।</p>
          <p className="text-slate-500">
            কার্ড জেনারেশন ও সামাজিক যোগাযোগ মাধ্যম অটোমেশন সিস্টেম দ্বারা পরিচালিত
          </p>
        </div>
      </div>
    </footer>
  );
}
