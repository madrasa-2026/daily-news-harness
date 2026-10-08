import { Metadata } from "next";
import { getSiteSettings, getArticles, getAllCardTemplates, getPublishLogs } from "@/lib/db";
import AdminDashboard from "./AdminDashboard";

export const metadata: Metadata = {
  title: "কন্ট্রোল প্যানেল | নাগরিক ডেস্ক",
  description: "নাগরিক ডেস্ক স্বয়ংক্রিয় এআই সাংবাদিকতা ও প্রকাশনা ব্যবস্থাপনা প্যানেল।",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const [settings, articles, templates, logs] = await Promise.all([
    getSiteSettings(),
    getArticles({ limit: 50 }),
    getAllCardTemplates(),
    getPublishLogs(30),
  ]);

  return (
    <AdminDashboard
      initialSettings={settings}
      articles={articles}
      templates={templates}
      logs={logs}
    />
  );
}
