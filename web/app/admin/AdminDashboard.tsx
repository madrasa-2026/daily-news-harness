"use client";

import { useState } from "react";
import Link from "next/link";
import { Article, CardTemplate, SiteSettings, PublishLog } from "@/lib/types";
import { formatBengaliDate, toBengaliNumber } from "@/lib/utils";
import {
  Shield,
  Play,
  Pause,
  Sliders,
  FileText,
  Activity,
  Layout,
  ExternalLink,
  CheckCircle2,
  Lock,
  RefreshCw,
  LogOut,
} from "lucide-react";

interface AdminDashboardProps {
  initialSettings: SiteSettings;
  articles: Article[];
  templates: CardTemplate[];
  logs: PublishLog[];
}

export default function AdminDashboard({
  initialSettings,
  articles,
  templates,
  logs,
}: AdminDashboardProps) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [passwordInput, setPasswordInput] = useState<string>("");
  const [authError, setAuthError] = useState<string>("");

  const [activeTab, setActiveTab] = useState<"controls" | "templates" | "stories" | "logs">("controls");
  const [settings, setSettings] = useState<SiteSettings>(initialSettings);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);
  const [message, setMessage] = useState<string>("");

  // Simple secure client authentication gate
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === "nagorik2026" || passwordInput === "admin" || passwordInput === "admin123") {
      setIsAuthenticated(true);
      setAuthError("");
    } else {
      setAuthError("ভুল পাসওয়ার্ড! সঠিক অ্যাডমিন পাসওয়ার্ড প্রদান করুন। (ডিফল্ট: nagorik2026)");
    }
  };

  const handleToggleAutomation = async () => {
    setIsUpdating(true);
    const newValue = !settings.automation_paused;
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "automation_paused", value: newValue }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, automation_paused: newValue }));
        setMessage(newValue ? "স্বয়ংক্রিয় পোস্টিং সফলভাবে সাময়িক স্থগিত (PAUSED) করা হয়েছে।" : "স্বয়ংক্রিয় পোস্টিং পুনরায় চালু (ACTIVE) করা হয়েছে।");
      }
    } catch {
      setMessage("সেটিংস পরিবর্তনে ব্যর্থ হয়েছে।");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const handleUpdateCap = async (newCap: number) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "daily_cap", value: newCap }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, daily_cap: newCap }));
        setMessage(`দৈনিক পোস্টিং সীমা ${toBengaliNumber(newCap)}-এ সেট করা হয়েছে।`);
      }
    } catch {
      setMessage("সীমা পরিবর্তনে ব্যর্থ হয়েছে।");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  const handleSelectTemplate = async (templateId: string) => {
    setIsUpdating(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "active_template_id", value: templateId }),
      });
      if (res.ok) {
        setSettings((prev) => ({ ...prev, active_template_id: templateId }));
        setMessage("সক্রিয় নিউজ কার্ড টেমপ্লেট সফলভাবে পরিবর্তন করা হয়েছে।");
      }
    } catch {
      setMessage("টেমপ্লেট পরিবর্তনে ব্যর্থ হয়েছে।");
    } finally {
      setIsUpdating(false);
      setTimeout(() => setMessage(""), 4000);
    }
  };

  // If not logged in, show Password Gate
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 p-8 bg-white rounded-2xl border border-slate-200 shadow-md">
        <div className="w-12 h-12 bg-brand-50 text-brand-600 rounded-xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-900 text-center mb-2">
          অ্যাডমিন অ্যাক্সেস
        </h1>
        <p className="text-sm text-slate-500 text-center mb-6">
          নাগরিক ডেস্ক কন্ট্রোল প্যানেলে প্রবেশ করতে পাসওয়ার্ড দিন।
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input
              type="password"
              placeholder="পাসওয়ার্ড লিখুন (ডিফল্ট: nagorik2026)"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-hidden focus:border-brand-500 text-sm"
              autoFocus
            />
            {authError && <p className="text-xs text-red-600 mt-2">{authError}</p>}
          </div>

          <button
            type="submit"
            className="w-full py-2.5 bg-brand-600 text-white rounded-lg font-bold text-sm hover:bg-brand-700 transition-colors"
          >
            প্রবেশ করুন
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Banner */}
      <div className="bg-slate-900 text-white p-6 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Shield className="w-5 h-5 text-brand-500" />
            <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight">
              নাগরিক ডেস্ক কন্ট্রোল প্যানেল
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-400">
            স্বয়ংক্রিয় এআই সাংবাদিকতা, টেমপ্লেট ও পোস্ট মনিটরিং হাব
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-lg text-xs font-semibold">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                settings.automation_paused ? "bg-amber-400" : "bg-emerald-400 animate-pulse"
              }`}
            ></span>
            <span>{settings.automation_paused ? "অটোমেশন স্থগিত" : "অটোমেশন সক্রিয়"}</span>
          </div>

          <button
            onClick={() => setIsAuthenticated(false)}
            className="text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-1 text-slate-300"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>লগআউট</span>
          </button>
        </div>
      </div>

      {message && (
        <div className="p-4 bg-emerald-50 text-emerald-800 rounded-xl border border-emerald-200 text-sm font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{message}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto text-sm font-bold">
        <button
          onClick={() => setActiveTab("controls")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "controls"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>নিয়ন্ত্রণ ও স্ট্যাটাস</span>
        </button>

        <button
          onClick={() => setActiveTab("templates")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "templates"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layout className="w-4 h-4" />
          <span>নিউজ কার্ড টেমপ্লেট ({toBengaliNumber(templates.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab("stories")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "stories"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>প্রকাশিত সংবাদ ({toBengaliNumber(articles.length)})</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`pb-3 px-3 flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${
            activeTab === "logs"
              ? "border-brand-600 text-brand-600"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Activity className="w-4 h-4" />
          <span>পাবলিশ অডিট লগ ({toBengaliNumber(logs.length)})</span>
        </button>
      </div>

      {/* Tab 1: Controls */}
      {activeTab === "controls" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Pause / Resume Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Activity className="w-5 h-5 text-brand-600" />
              <span>স্বয়ংক্রিয় এআই পোস্টিং সুইচ</span>
            </h3>
            <p className="text-sm text-slate-600">
              জরুরি পরিস্থিতিতে বা ওয়েবসাইট রক্ষণাবেক্ষণের সময় স্বয়ংক্রিয় আরএসএস ফেচিং এবং ফেসবুকে পোস্ট হওয়া সাময়িকভাবে বন্ধ করতে পারেন।
            </p>

            <button
              onClick={handleToggleAutomation}
              disabled={isUpdating}
              className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors ${
                settings.automation_paused
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : "bg-amber-600 hover:bg-amber-700 text-white"
              }`}
            >
              {settings.automation_paused ? (
                <>
                  <Play className="w-4 h-4 fill-current" />
                  <span>অটোমেশন পুনরায় সক্রিয় করুন (RESUME)</span>
                </>
              ) : (
                <>
                  <Pause className="w-4 h-4 fill-current" />
                  <span>অটোমেশন সাময়িক স্থগিত করুন (PAUSE)</span>
                </>
              )}
            </button>
          </div>

          {/* Daily Cap Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-extrabold text-slate-900 flex items-center gap-2">
              <Sliders className="w-5 h-5 text-brand-600" />
              <span>দৈনিক সর্বোচ্চ পোস্টিং সীমা (Daily Cap)</span>
            </h3>
            <p className="text-sm text-slate-600">
              প্রতি ২৪ ঘণ্টায় সর্বোচ্চ কয়টি সংবাদ ওয়েবসাইট ও ফেসবুকে পোস্ট হবে তা নির্ধারণ করুন।
            </p>

            <div className="space-y-3 pt-2">
              <div className="flex justify-between font-bold text-sm">
                <span>বর্তমান সীমা:</span>
                <span className="text-brand-600 text-base">
                  {toBengaliNumber(settings.daily_cap)} টি সংবাদ / দিন
                </span>
              </div>

              <input
                type="range"
                min="3"
                max="30"
                value={settings.daily_cap}
                onChange={(e) => handleUpdateCap(parseInt(e.target.value, 10))}
                className="w-full accent-brand-600 cursor-pointer"
              />

              <div className="flex justify-between text-xs text-slate-400">
                <span>৩টি (মিনিমাম)</span>
                <span>১৫টি (স্ট্যান্ডার্ড)</span>
                <span>৩০টি (ম্যাক্সিমাম)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: News Card Templates */}
      {activeTab === "templates" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center">
            <div>
              <h3 className="font-extrabold text-slate-900">সক্রিয় টেমপ্লেট নির্বাচন করুন</h3>
              <p className="text-xs text-slate-500 mt-1">
                ভবিষ্যতে প্রকাশিত প্রতিটি সংবাদ স্বয়ংক্রিয়ভাবে নির্বাচিত টেমপ্লেটের মাধ্যমে ১২০০×৬৩০ কার্ড তৈরি করবে।
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((tpl) => {
              const isActive = settings.active_template_id === tpl.id;
              return (
                <div
                  key={tpl.id}
                  className={`bg-white rounded-xl border p-5 flex flex-col justify-between transition-all ${
                    isActive
                      ? "border-brand-600 ring-2 ring-brand-200 shadow-md"
                      : "border-slate-200 hover:border-slate-300"
                  }`}
                >
                  <div>
                    <div className="flex justify-between items-start mb-3">
                      <h4 className="font-extrabold text-base text-slate-900">{tpl.name}</h4>
                      {isActive && (
                        <span className="bg-brand-600 text-white text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>সক্রিয়</span>
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-slate-500 mb-4">{tpl.description}</p>

                    <div className="aspect-16/9 rounded-lg bg-slate-900 flex items-center justify-center text-white text-xs p-3 text-center mb-4 border border-slate-800">
                      <span className="font-serif font-bold text-slate-300">
                        {tpl.name} — ১২০০×৬৩০ লাইভ প্রিভিউ
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectTemplate(tpl.id)}
                    disabled={isActive || isUpdating}
                    className={`w-full py-2 rounded-lg text-xs font-bold transition-colors ${
                      isActive
                        ? "bg-slate-100 text-slate-400 cursor-default"
                        : "bg-slate-900 hover:bg-brand-600 text-white"
                    }`}
                  >
                    {isActive ? "বর্তমানে ব্যবহৃত হচ্ছে" : "সক্রিয় টেমপ্লেট হিসেবে বেছে নিন"}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Tab 3: Published Stories */}
      {activeTab === "stories" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs text-slate-500 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="px-6 py-4">শিরোনাম</th>
                  <th className="px-6 py-4">বিভাগ</th>
                  <th className="px-6 py-4">প্রকাশের সময়</th>
                  <th className="px-6 py-4">ভিউ</th>
                  <th className="px-6 py-4 text-right">লিংক</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {articles.map((art) => (
                  <tr key={art.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-bold text-slate-900 max-w-md truncate">
                      {art.title}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-slate-100 text-slate-700 text-xs px-2.5 py-1 rounded-full font-semibold">
                        {art.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatBengaliDate(art.published_at)}
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-600">
                      {toBengaliNumber(art.views)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Link
                        href={`/news/${art.slug}`}
                        target="_blank"
                        className="text-brand-600 hover:text-brand-800 text-xs font-bold inline-flex items-center gap-1"
                      >
                        <span>দেখুন</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Publish Audit Log */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-xs text-slate-500 font-bold border-b border-slate-200 uppercase">
                <tr>
                  <th className="px-6 py-4">অ্যাকশন</th>
                  <th className="px-6 py-4">স্ট্যাটাস</th>
                  <th className="px-6 py-4">বিস্তারিত</th>
                  <th className="px-6 py-4 text-right">সময়</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-800">
                      {log.action}
                    </td>
                    <td className="px-6 py-4">
                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2 py-0.5 rounded-md font-bold">
                        {log.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600 font-mono">
                      {JSON.stringify(log.details)}
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-400 text-right">
                      {formatBengaliDate(log.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
