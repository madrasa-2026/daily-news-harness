import { NextResponse } from "next/server";
import { getArticles } from "@/lib/db";

export async function GET() {
  const articles = await getArticles({ limit: 50 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nagorik-desk.vercel.app";

  const itemsXml = articles
    .map((article) => {
      const link = `${siteUrl}/news/${article.slug}`;
      const pubDate = new Date(article.published_at).toUTCString();
      const imageUrl = article.card_url || article.photo_url || "";

      return `    <item>
      <title><![CDATA[${article.title}]]></title>
      <link>${link}</link>
      <guid isPermaLink="true">${link}</guid>
      <description><![CDATA[${article.summary}]]></description>
      <category><![CDATA[${article.category}]]></category>
      <author><![CDATA[${article.author}]]></author>
      <pubDate>${pubDate}</pubDate>
      ${imageUrl ? `<enclosure url="${imageUrl.startsWith("http") ? imageUrl : siteUrl + imageUrl}" type="image/png" length="0" />` : ""}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>নাগরিক ডেস্ক (NAGORIK DESK)</title>
    <link>${siteUrl}</link>
    <description>২৪ ঘণ্টা নির্ভরযোগ্য ব্রেকিং নিউজ এবং বস্তুনিষ্ঠ সংবাদ বিশ্লেষণ।</description>
    <language>bn</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml"/>
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=3600, stale-while-revalidate",
    },
  });
}
