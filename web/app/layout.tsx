import type { Metadata } from "next";
import { Hind_Siliguri } from "next/font/google";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const hindSiliguri = Hind_Siliguri({
  subsets: ["bengali", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-hind-siliguri",
  display: "swap",
});

export const metadata: Metadata = {
  title: "নাগরিক ডেস্ক | NAGORIK DESK — সত্যের সন্ধানে অবিচল",
  description: "২৪ ঘণ্টা নির্ভরযোগ্য ব্রেকিং নিউজ, জাতীয় রাজনীতি, অর্থনীতি, আন্তর্জাতিক ও বিনোদন সংবাদ।",
  keywords: ["নাগরিক ডেস্ক", "Nagorik Desk", "Bangla News", "Bangladesh News", "ব্রেকিং নিউজ", "তাজা খবর"],
  openGraph: {
    title: "নাগরিক ডেস্ক | NAGORIK DESK",
    description: "২৪ ঘণ্টা নির্ভরযোগ্য ব্রেকিং নিউজ এবং বস্তুনিষ্ঠ সংবাদ বিশ্লেষণ।",
    siteName: "নাগরিক ডেস্ক",
    locale: "bn_BD",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "নাগরিক ডেস্ক | NAGORIK DESK",
    description: "২৪ ঘণ্টা নির্ভরযোগ্য ব্রেকিং নিউজ এবং বস্তুনিষ্ঠ সংবাদ বিশ্লেষণ।",
  },
  alternates: {
    types: {
      "application/rss+xml": "/rss.xml",
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="bn" className={hindSiliguri.variable}>
      <body className="min-h-screen flex flex-col bg-[#fdfdfc] text-slate-900 antialiased font-sans">
        <Header />
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6 sm:py-8">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
