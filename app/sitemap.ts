import type { MetadataRoute } from "next";
import { getPublicSite } from "../db/workspace";
import { recordPath, sectionPaths, type PublicSection } from "./public-content";
export const dynamic = "force-dynamic";
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.SITE_URL || "https://guba-engineering.pages.dev";
  const site = await getPublicSite();
  if (site.settings.maintenance) return [];
  return [{url:base,changeFrequency:"weekly",priority:1},{url:new URL("/contact",base).toString(),changeFrequency:"monthly",priority:0.8},...Object.entries(site.content).filter(([section])=>sectionPaths[section as PublicSection]).flatMap(([section,items])=>(items??[]).map(item=>({url:new URL(recordPath(section as PublicSection,item),base).toString(),...(Number.isNaN(Date.parse(item.updated))?{}:{lastModified:new Date(item.updated)}),changeFrequency:"weekly" as const,priority:0.7})))];
}
