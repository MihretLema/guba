export const publicSections = ["Homepage", "Contact information", "Services", "Projects", "Insights", "Training", "Events", "Jobs", "Products", "Partners & clients", "Clients", "Testimonials", "Media library", "AI knowledge", "Newsletter", "SEO manager"] as const;
export type PublicSection = typeof publicSections[number];
import type { Item, Store } from "./admin/workspace";
export type PublicSite = { revision: number; settings: Store["settings"]; content: Partial<Record<PublicSection, Item[]>> };
export const sectionPaths: Partial<Record<PublicSection, string>> = { Homepage: "announcements", Services: "services", Projects: "projects", Insights: "insights", Training: "training", Events: "events", Jobs: "jobs", Products: "products", "Partners & clients": "partners", Clients: "clients", Testimonials: "testimonials", "Media library": "media", Newsletter: "newsletter" };
export function recordPath(section: PublicSection, item: Item) { if (section === "Contact information") return "/contact"; return `/content/${sectionPaths[section] ?? "pages"}/${encodeURIComponent(item.id)}`; }
export function safeUrl(value?: string): string | undefined {
  if (!value || /[\u0000-\u0020\\]/.test(value)) return undefined;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  try { const url = new URL(value); return ["https:", "http:"].includes(url.protocol) ? value : undefined; } catch { return undefined; }
}
export const imageUrl = (item: Item) => safeUrl(item.fields?.image || (item.extra && /\.(png|jpe?g|gif|webp|avif|svg)(\?|$)/i.test(item.extra) ? item.extra : undefined));
export function seoFor(site: PublicSite, path: string) { return site.content["SEO manager"]?.find(item => (item.fields?.path || item.extra || "/") === path); }
export function publicDescription(section: string) {
  if (section === "Contact information") return "Publish your contact page introduction, office details, location/map, opening hours and social links. The first published record introduces the page; add more records for additional offices. Visitor messages remain in Contact messages.";
  if (["Contact messages", "RFQ requests", "Job applications", "Registrations"].includes(section)) return "Private inbox. Website submissions arrive here; these records are never published.";
  if (section === "Newsletter") return "Published records appear as website updates. Subscriber records remain private.";
  if (section === "AI knowledge") return "Published questions and answers power the website assistant.";
  if (section === "SEO manager") return "Publish a title and description for a website page path.";
  if (section === "Homepage") return "Published records control the hero, about text and additional homepage sections.";
  return "Published records appear on the website. Drafts and archived records remain private. Edits and deletions update the website automatically.";
}
