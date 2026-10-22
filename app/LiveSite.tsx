"use client";
import { DeveloperCredit } from "./DeveloperCredit";
import { useEffect, useState } from "react";
import { primaryContact } from "./contact-details";
import { type PublicSite, seoFor, recordPath, type PublicSection } from "./public-content";
export function useLiveSite(initial: PublicSite) {
  const [site, setSite] = useState(initial);
  useEffect(() => {
    let disposed = false;
    let pending = false;
    async function refresh() {
      if (pending || document.visibilityState === "hidden") return;
      pending = true;
      try { const response = await fetch("/api/public/site", { cache: "no-store" }); if (response.ok) { const next = await response.json() as PublicSite; if (!disposed) setSite(current => current.revision === next.revision ? current : next); } } catch { /* Retain the last successfully loaded version during a transient outage. */ }
      finally { pending = false; }
    }
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("guba-site") : null;
    if (channel) channel.onmessage = () => void refresh();
    const timer = setInterval(() => void refresh(), 5000);
    const onFocus = () => void refresh();
    window.addEventListener("focus", onFocus); document.addEventListener("visibilitychange", onFocus);
    return () => { disposed = true; clearInterval(timer); channel?.close(); window.removeEventListener("focus", onFocus); document.removeEventListener("visibilitychange", onFocus); };
  }, []);
  useEffect(() => {
    const path = window.location.pathname;
    const seo = seoFor(site, path);
    const detail = path === "/contact" ? primaryContact(site.content["Contact information"]) : Object.entries(site.content).flatMap(([section, items]) => (items ?? []).map(item => ({ item, path: recordPath(section as PublicSection, item) }))).find(entry => entry.path === path)?.item;
    document.title = seo?.title || (detail ? detail.title + " | " + site.settings.siteName : path === "/contact" ? "Contact | " + site.settings.siteName : site.settings.siteName);
    const description = document.querySelector('meta[name="description"]');
    if (description) description.setAttribute("content", (seo?.detail || detail?.detail || site.content.Homepage?.find(item => item.fields?.placement === "hero")?.detail || "Engineering progress with GUBA.").slice(0, 320));
  }, [site]);
  return site;
}
export function Maintenance({ site }: { site: PublicSite }) { return <main className="maintenance-page"><span className="brand-mark">G</span><h1>{site.settings.siteName}</h1><h2>We’ll be back soon.</h2><p>Our website is undergoing maintenance. Please contact our team for help.</p><a className="button button-gold" href={`mailto:${site.settings.contactEmail}`}>Contact us ↗</a><a href="/admin">Administrator sign in</a><footer className="maintenance-credit"><DeveloperCredit /></footer></main>; }
