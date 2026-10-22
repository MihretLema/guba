import type { Item } from "./admin/workspace";
const text = (value?: string) => value?.trim() || "";
export function contactValidationError(fields: Record<string, string> = {}): string | null {
  if (fields.publicEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.publicEmail.trim())) return "Enter a valid public contact email.";
  const lat=text(fields.latitude),lng=text(fields.longitude);
  if (lat || lng) {
    if (!lat || !lng || !Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng)) || Number(lat)<-90 || Number(lat)>90 || Number(lng)<-180 || Number(lng)>180) return "Enter both latitude (-90 to 90) and longitude (-180 to 180), or leave both blank.";
  }
  if (fields.mapEmbedUrl && !mapEmbedUrl(fields.mapEmbedUrl)) return "Use a Google Maps or OpenStreetMap embed URL. You can also leave this blank and enter your address or coordinates.";
  for (const key of ["linkedin", "facebook", "instagram", "x", "youtube", "website"]) if (fields[key]) { try { const url=new URL(fields[key]); if (url.protocol!=="https:") return "Social and website links must start with https://."; } catch {return "Enter a valid HTTPS social or website link.";} }
  return null;
}
export function mapEmbedUrl(value?: string): string | undefined {
  if (!value) return;
  try { const url=new URL(value); if (url.protocol!=="https:" || url.username || url.password) return;
    if (["www.google.com","google.com"].includes(url.hostname) && (url.pathname==="/maps/embed" || url.pathname.startsWith("/maps/embed/"))) return url.toString();
    if (url.hostname==="maps.google.com" && url.pathname==="/maps" && url.searchParams.get("output")==="embed") return url.toString();
    if (["www.openstreetmap.org","openstreetmap.org"].includes(url.hostname) && url.pathname==="/export/embed.html") return url.toString();
  } catch { return; }
}
export function officeLocation(item: Item) {
  const f=item.fields??{};
  const address=[f.address,f.city,f.country,f.postalCode].map(value=>text(value)).filter(Boolean).join(", ");
  const hasCoordinates=text(f.latitude)!==""&&text(f.longitude)!==""&&Number.isFinite(Number(f.latitude))&&Number.isFinite(Number(f.longitude))&&Number(f.latitude)>=-90&&Number(f.latitude)<=90&&Number(f.longitude)>=-180&&Number(f.longitude)<=180;
  const query=hasCoordinates?`${Number(f.latitude)},${Number(f.longitude)}`:address;
  return {address,query,map:mapEmbedUrl(f.mapEmbedUrl)||(query?`https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`:undefined),directions:query?`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`:undefined};
}
export function phoneLink(value?:string) { if (!value) return; const number=value.replace(/[\s().-]/g,""); return /^\+?\d{3,20}$/.test(number)?`tel:${number}`:undefined; }
export function whatsappLink(value?:string) {const number=value?.replace(/[^0-9]/g,"");return number&&number.length>=8&&number.length<=15?`https://wa.me/${number}`:undefined;}

export function primaryContact(items: Item[] = []) {return items.find(item=>item.id==="guba-contact-main") || items[0];}
