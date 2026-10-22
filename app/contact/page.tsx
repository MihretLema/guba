import type { Metadata } from "next";
import { getPublicSite } from "../../db/workspace";
import { seoFor } from "../public-content";
import { primaryContact } from "../contact-details";
import { ContactPage } from "./ContactPage";
export const dynamic = "force-dynamic";
export async function generateMetadata(): Promise<Metadata> {
  const site = await getPublicSite();
  const profile=primaryContact(site.content["Contact information"]);
  const seo=seoFor(site,"/contact");
  const title=seo?.title || `${profile?.title || "Contact"} | ${site.settings.siteName}`;
  const description=(seo?.detail || profile?.detail || "Contact GUBA to discuss your project, services, training or partnership.").slice(0,320);
  return {title:{absolute:title},description,openGraph:{title,description},twitter:{title,description},robots:site.settings.maintenance?{index:false,follow:false}:{index:true,follow:true}};
}
export default async function Contact() { return <ContactPage initialSite={await getPublicSite()} />; }
