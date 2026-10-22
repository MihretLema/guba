import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPublicSite } from "../../../../db/workspace";
import { sectionPaths, seoFor, recordPath, type PublicSection } from "../../../public-content";
import { ContentDetail } from "../../../ContentDetail";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ section: string; id: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { section: slug, id } = await params;
  const section = Object.entries(sectionPaths).find(([, path]) => path === slug)?.[0] as PublicSection | undefined;
  const site = await getPublicSite();
  if (site.settings.maintenance) return {title:site.settings.siteName,robots:{index:false,follow:false}};
  const item = section && site.content[section]?.find(item => item.id === id);
  if (!item) return { title: "Content unavailable", robots: { index: false } };
  const seo = seoFor(site, recordPath(section!, item));
  const title = seo?.title || `${item.title} | ${site.settings.siteName}`;
  const description = (seo?.detail || item.detail).slice(0, 320);
  return { title: { absolute: title }, description, openGraph: { title, description }, twitter: { title, description }, robots: site.settings.maintenance ? { index: false, follow: false } : { index: true, follow: true } };
}
export default async function DetailPage({ params }: Props) {
  const { section: slug, id } = await params;
  const section = Object.entries(sectionPaths).find(([, path]) => path === slug)?.[0] as PublicSection | undefined;
  if (!section) notFound();
  const site = await getPublicSite();
  if (!site.settings.maintenance && !site.content[section]?.some(item => item.id === id)) notFound();
  return <ContentDetail initialSite={site} section={section} id={id} />;
}
