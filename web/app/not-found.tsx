import Link from "next/link";
import { Home, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="max-w-md mx-auto py-20 text-center space-y-6">
      <div className="w-16 h-16 bg-brand-50 text-brand-600 rounded-2xl flex items-center justify-center mx-auto text-2xl font-black">
        ৪০৪
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-extrabold text-slate-900">
          পৃষ্ঠাটি পাওয়া যায়নি
        </h1>
        <p className="text-sm text-slate-500">
          আপনি যে সংবাদ বা লিঙ্কটি খুঁজছেন তা মুছে ফেলা হয়েছে অথবা ঠিকানাটি ভুল হতে পারে।
        </p>
      </div>

      <div className="pt-4 flex justify-center gap-3">
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 text-white rounded-xl text-sm font-bold hover:bg-brand-700 transition-colors"
        >
          <Home className="w-4 h-4" />
          <span>প্রচ্ছদে ফিরে যান</span>
        </Link>
      </div>
    </div>
  );
}
