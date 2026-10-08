"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { CATEGORIES } from "@/lib/types";
import { formatBengaliDate } from "@/lib/utils";
import { Search, Menu, X, Shield, Clock } from "lucide-react";

export default function Header() {
  const [currentDate, setCurrentDate] = useState<string>("");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setCurrentDate(formatBengaliDate(new Date()));
    const timer = setInterval(() => {
      setCurrentDate(formatBengaliDate(new Date()));
    }, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <header className="w-full bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
      {/* 1. Top Bar */}
      <div className="bg-slate-50 border-b border-slate-200 py-1.5 px-4 text-xs text-slate-600">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>{currentDate || "বৃহস্পতিবার, ৮ অক্টোবর ২০২৬"}</span>
            <span className="hidden sm:inline text-slate-300">|</span>
            <span className="hidden sm:inline font-medium text-slate-500">বাংলাদেশ সংস্করণ</span>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/admin"
              className="flex items-center gap-1 text-slate-600 hover:text-brand-600 font-medium transition-colors"
            >
              <Shield className="w-3.5 h-3.5" />
              <span>অ্যাডমিন প্যানেল</span>
            </Link>
          </div>
        </div>
      </div>

      {/* 2. Main Branding Area */}
      <div className="max-w-7xl mx-auto px-4 py-4 sm:py-6 flex justify-between items-center">
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-brand-600 text-white rounded-lg flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-sm group-hover:bg-brand-700 transition-colors">
            না
          </div>
          <div>
            <div className="font-extrabold text-2xl sm:text-3xl tracking-tight text-slate-900 group-hover:text-brand-600 transition-colors">
              নাগরিক ডেস্ক
            </div>
            <div className="text-xs text-slate-500 tracking-wider">
              NAGORIK DESK • সত্যের সন্ধানে অবিচল
            </div>
          </div>
        </Link>

        {/* Search bar (Desktop) */}
        <form onSubmit={handleSearchSubmit} className="hidden md:flex items-center relative w-72">
          <input
            type="text"
            placeholder="সংবাদ অনুসন্ধান করুন..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-3 pr-9 py-1.5 text-sm rounded-full border border-slate-300 bg-slate-50 focus:bg-white focus:outline-hidden focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-all"
          />
          <button type="submit" className="absolute right-3 text-slate-400 hover:text-brand-600">
            <Search className="w-4 h-4" />
          </button>
        </form>

        {/* Mobile menu toggle */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-slate-700 hover:text-brand-600"
          aria-label="Toggle menu"
        >
          {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-slate-800" />}
        </button>
      </div>

      {/* 3. Navigation Bar (Desktop) */}
      <nav className="border-t border-slate-200 hidden md:block bg-white">
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-1">
            <Link
              href="/"
              className={`px-3 py-2 text-sm font-semibold rounded-md transition-colors ${
                pathname === "/"
                  ? "text-brand-600 bg-brand-50 font-bold"
                  : "text-slate-700 hover:text-brand-600 hover:bg-slate-50"
              }`}
            >
              প্রচ্ছদ
            </Link>

            {CATEGORIES.map((cat) => {
              const active = pathname === `/category/${cat.slug}`;
              return (
                <Link
                  key={cat.slug}
                  href={`/category/${cat.slug}`}
                  className={`px-3 py-2 text-sm font-semibold rounded-md whitespace-nowrap transition-colors ${
                    active
                      ? "text-brand-600 bg-brand-50 font-bold"
                      : "text-slate-700 hover:text-brand-600 hover:bg-slate-50"
                  }`}
                >
                  {cat.name}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>

      {/* 4. Mobile Drawer Menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-4 shadow-lg animate-fadeIn">
          {/* Mobile search */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <input
              type="text"
              placeholder="সংবাদ অনুসন্ধান করুন..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3 pr-9 py-2 text-sm rounded-lg border border-slate-300 bg-slate-50 focus:outline-hidden focus:border-brand-500"
            />
            <button type="submit" className="absolute right-3 top-2.5 text-slate-400">
              <Search className="w-4 h-4" />
            </button>
          </form>

          {/* Mobile Categories Grid */}
          <div className="grid grid-cols-2 gap-1 text-sm font-semibold pt-2">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="p-2 rounded-md hover:bg-slate-100 text-slate-800"
            >
              প্রচ্ছদ
            </Link>
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.slug}
                href={`/category/${cat.slug}`}
                onClick={() => setIsMobileMenuOpen(false)}
                className="p-2 rounded-md hover:bg-slate-100 text-slate-700"
              >
                {cat.name}
              </Link>
            ))}
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-between text-xs text-slate-500">
            <Link href="/admin" onClick={() => setIsMobileMenuOpen(false)} className="hover:text-brand-600">
              অ্যাডমিন ড্যাশবোর্ড
            </Link>
            <Link href="/rss.xml" className="hover:text-brand-600">
              আরএসএস ফিড
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
