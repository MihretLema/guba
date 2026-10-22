import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/api/admin"] }, sitemap: `${process.env.SITE_URL || "https://guba-engineering.pages.dev"}/sitemap.xml` }; }
