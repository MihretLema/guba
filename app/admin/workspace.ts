import { contactValidationError } from "../contact-details";
export const sections = ["Homepage", "Contact information", "Services", "Projects", "Insights", "Training", "Events", "Jobs", "Job applications", "Registrations", "Products", "Partners & clients", "Clients", "Testimonials", "Media library", "Contact messages", "RFQ requests", "AI knowledge", "Newsletter", "SEO manager"] as const;
export type Section = typeof sections[number];
export type Item = { id: string; title: string; detail: string; status: string; updated: string; extra?: string; fields?: Record<string, string> };
export type Log = { id: string; action: string; date: string };
export type Store = { version: 1; items: Record<string, Item[]>; settings: { siteName: string; contactEmail: string; maintenance: boolean }; logs: Log[] };
export type Field = { key: string; label: string; type?: string };
export const fields: Partial<Record<Section, Field[]>> = {
  "Contact information": [{key:"officeName",label:"Office / branch name"},{key:"publicEmail",label:"Public email (defaults to Settings email)",type:"email"},{key:"phone",label:"Primary phone (include country code)",type:"tel"},{key:"secondaryPhone",label:"Secondary phone",type:"tel"},{key:"whatsapp",label:"WhatsApp number (include country code)",type:"tel"},{key:"address",label:"Street address / building / floor",type:"textarea"},{key:"city",label:"City"},{key:"country",label:"Country"},{key:"postalCode",label:"Postal code / PO box"},{key:"hours",label:"Opening hours (one line per day or schedule)",type:"textarea"},{key:"latitude",label:"Map latitude (optional, decimal degrees)"},{key:"longitude",label:"Map longitude (optional, decimal degrees)"},{key:"mapEmbedUrl",label:"Google Maps / OpenStreetMap embed URL (optional)",type:"url"},{key:"linkedin",label:"LinkedIn URL",type:"url"},{key:"facebook",label:"Facebook URL",type:"url"},{key:"instagram",label:"Instagram URL",type:"url"},{key:"x",label:"X URL",type:"url"},{key:"youtube",label:"YouTube URL",type:"url"},{key:"website",label:"Website URL",type:"url"}],
  Homepage: [{key:"placement",label:"Placement: hero, about, academy, or section"},{key:"subtitle",label:"Subtitle"},{key:"image",label:"Image URL (https:// or /path)"},{key:"years",label:"Years of experience"},{key:"projects",label:"Projects delivered"},{key:"retention",label:"Client retention"},{key:"courses",label:"Academy course count"},{key:"trained",label:"Academy professionals trained"}],
  "SEO manager": [{key:"path",label:"Page path (for example / or /content/projects/ID)"},{key:"keywords",label:"Keywords (comma separated)"}],
  "Media library": [{key:"image",label:"Image URL",type:"url"},{key:"url",label:"Download / file URL",type:"url"}],
  Newsletter: [{key:"email",label:"Subscriber email (private)",type:"email"}],
  Registrations: [{key:"email",label:"Email",type:"email"},{key:"targetTitle",label:"Training / event"}],
  Services: [{ key: "tags", label: "Tags (comma separated)" }, { key: "metric", label: "Metric" }, { key: "accent", label: "Metric caption" }],
  Projects: [{ key: "sector", label: "Sector" }, { key: "result", label: "Result" }, { key: "start", label: "Start date", type: "date" }, { key: "end", label: "End date", type: "date" }],
  Insights: [{ key: "category", label: "Category" }, { key: "readingTime", label: "Reading time" }],
  Training: [{ key: "start", label: "Start date", type: "date" }, { key: "duration", label: "Duration" }, { key: "fee", label: "Fee" }, { key: "location", label: "Location" }],
  Events: [{ key: "start", label: "Date", type: "date" }, { key: "location", label: "Location" }, { key: "capacity", label: "Capacity", type: "number" }],
  Jobs: [{ key: "location", label: "Location" }, { key: "deadline", label: "Application deadline", type: "date" }, { key: "employment", label: "Employment type" }],
  "Job applications": [{ key: "job", label: "Job title" }, { key: "email", label: "Applicant email", type: "email" }, { key: "document", label: "CV URL", type: "url" }],
  Products: [{ key: "category", label: "Category" }, { key: "price", label: "Price" }],
  Clients: [{ key: "website", label: "Website", type: "url" }],
  "Partners & clients": [{ key: "website", label: "Website", type: "url" }],
  Testimonials: [{ key: "author", label: "Author" }, { key: "company", label: "Company" }],
  "Contact messages": [{ key: "email", label: "Email", type: "email" }, { key: "phone", label: "Phone" },{key:"company",label:"Company"},{key:"subject",label:"Enquiry topic"}],
  "RFQ requests": [{ key: "email", label: "Email", type: "email" }, { key: "budget", label: "Budget" }, { key: "deadline", label: "Timeline", type: "date" }],
};
for (const section of ["Services", "Projects", "Insights", "Training", "Events", "Jobs", "Products", "Partners & clients", "Clients", "Testimonials"] as Section[]) {
  fields[section] = [...(fields[section] ?? []), {key:"image",label:section === "Partners & clients" ? "Logo URL (https:// or /path)" : "Image URL (https:// or /path)"}];
}
export function statuses(page: string) {
  if (["Contact messages", "RFQ requests"].includes(page)) return ["New", "In progress", "Replied", "Closed"];
  if (page === "Job applications") return ["New", "Review", "Shortlisted", "Hired", "Rejected"];
  if (page === "Newsletter") return ["Draft", "Published", "Archived", "Subscribed", "Unsubscribed"];
  if (page === "Registrations") return ["New", "Confirmed", "Cancelled"];
  return ["Draft", "Published", "Archived"];
}
export function emptyStore(): Store {
  return { version: 1, items: Object.fromEntries(sections.map(section => [section, []])), settings: { siteName: "GUBA Engineering Investment Group", contactEmail: "hello@gubaengineering.com", maintenance: false }, logs: [] };
}
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const string = (v: unknown, max: number) => typeof v === "string" && v.length <= max;
export function validStore(value: unknown): value is Store {
  if (!object(value) || value.version !== 1 || !object(value.items) || !object(value.settings) || !Array.isArray(value.logs)) return false;
  if (!string(value.settings.siteName, 200) || !string(value.settings.contactEmail, 320) || typeof value.settings.maintenance !== "boolean" || value.logs.length > 250) return false;
  return Object.entries(value.items).every(([section, items]) => {
    if (section === "Users & roles") return Array.isArray(items) && items.length === 0;
    if (!sections.includes(section as Section) || !Array.isArray(items) || items.length > 2000) return false;
    const ids = new Set<string>();
    return items.every(item => {
      if (!object(item) || !string(item.id, 100) || !item.id || ids.has(item.id as string)) return false;
      ids.add(item.id as string);
      return (section !== "Contact information" || item.fields === undefined || (object(item.fields) && Object.values(item.fields).every(value => typeof value === "string") && !contactValidationError(item.fields as Record<string,string>))) && string(item.title, 300) && !!(item.title as string).trim() && string(item.detail, 50000) && statuses(section).includes(item.status as string) && string(item.updated, 100) && (item.extra === undefined || string(item.extra, 2000)) && (item.fields === undefined || (object(item.fields) && Object.keys(item.fields).length <= 30 && Object.entries(item.fields).every(([key, val]) => key.length < 100 && string(val, 5000))));
    });
  }) && value.logs.every(log => object(log) && string(log.id, 100) && string(log.action, 600) && string(log.date, 100));
}
export function normalizeStore(store: Store): Store {
  return { ...store, items: Object.fromEntries(sections.map(section => [section, store.items[section] ?? []])) };
}
