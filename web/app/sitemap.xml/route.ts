import { NextResponse } from "next/server";
import { getArticles } from "@/lib/db";
import { CATEGORIES } from "@/lib/types";

export async function GET() {
  const articles = await getArticles({ limit: 500 });
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://nagorik-desk.vercel.app";

  const staticUrls = [
    { loc: `${siteUrl}`, priority: "1.0", changefreq: "hourly" },
    ...CATEGORIES.map((c) => ({
      loc: `${siteUrl}/category/${c.slug}`,
      priority: "0.8",
      changefreq: "hourly",
    })),
  ];

  const urlsXml = [
    ...staticUrls.map(
      (u) => `  <url>
    <loc>${u.loc}</loc>
    <changefreq>${u.changefreq}</changefreq>
    <priority>${u.priority}</priority>
  </url>`
    ),
    ...articles.map(
      (a) => `  <url>
    <loc>${siteUrl}/news/${a.slug}</loc>
    <lastmod>${new Date(a.updated_at || a.published_at).toISOString()}</lastmod>
    <changefreq>daily</changefreq>
    <priority>0.7</priority>
  </url>`
    ),
  ].join("\n");

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlsXml}
</urlset>`;

  return new NextResponse(sitemap, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "s-maxage=86400, stale-while-revalidate",
    },
  });
}
