import type { Metadata } from "next";
import { getPublicSite } from "../db/workspace";
import { seoFor } from "./public-content";
import { GubaExperience } from "./GubaExperience";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  try {
    const site = await getPublicSite(); const seo = seoFor(site, "/");
    const title = seo?.title || site.settings.siteName;
    const description = (seo?.detail || site.content.Homepage?.find(item => item.fields?.placement === "hero")?.detail || "Engineering progress with GUBA.").slice(0, 320);
    return { title: { absolute: title }, description, keywords: seo?.fields?.keywords?.split(",").map(value => value.trim()), openGraph: { title, description }, twitter: { title, description }, robots: site.settings.maintenance ? { index: false, follow: false } : { index: true, follow: true } };
  } catch { return { title: "GUBA", robots: { index: false } }; }
}
export default async function Home() {
  const site = await getPublicSite().catch(() => null);
  if (!site) return <main className="maintenance-page"><h1>We’re temporarily unavailable.</h1><p>Please try again shortly.</p><a href="/admin">Administrator sign in</a></main>;
  return <GubaExperience initialSite={site} />;
}
