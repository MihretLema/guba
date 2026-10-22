import Image from "next/image";
import type { Item } from "./admin/workspace";
import { imageUrl, recordPath, safeUrl, sectionPaths, type PublicSection } from "./public-content";

// Keep the original feature-and-list composition; only the records come from the CMS.
export function PublicCollection({ section, items, title }: { section: PublicSection; items: Item[]; title?: string }) {
  if (!items.length) return null;
  const [feature, ...remaining] = items;
  const isInsights = section === "Insights";
  return <section className="insights section cms-original-section" id={sectionPaths[section] ?? "announcements"}>
    <div className="section-kicker"><span>{isInsights ? "04 / PERSPECTIVES" : `GUBA / ${section.toUpperCase()}`}</span><a href={recordPath(section, feature)}>{isInsights ? "All insights" : title ?? section} <b>→</b></a></div>
    <div className="insight-grid">
      <article className="insight-feature"><div className="insight-art"><span>{isInsights ? "GUBA BRIEFING / 01" : section.toUpperCase()}</span>{imageUrl(feature) ? <Image unoptimized className="cms-insight-image" src={imageUrl(feature)!} alt={feature.title} width={640} height={400} loading="lazy" /> : <div />}</div><small>{feature.fields?.category || section} {feature.fields?.readingTime && `· ${feature.fields.readingTime}`}</small><h3>{feature.title}</h3>{!isInsights && <p className="cms-collection-summary">{feature.detail.slice(0, 220)}</p>}{section === "Media library" && safeUrl(feature.fields?.url || feature.extra) && <a className="cms-resource-link" href={safeUrl(feature.fields?.url || feature.extra)} target="_blank" rel="noreferrer">Open resource ↗</a>}<a href={recordPath(section, feature)}>{isInsights ? "Read the perspective" : section === "Jobs" ? "View role & apply" : ["Events", "Training"].includes(section) ? "View details & register" : "Explore more"} →</a></article>
      {remaining.length > 0 && <div className="insight-list">{remaining.map(item => <article key={item.id}><small>{item.fields?.category || section} {item.fields?.readingTime && `· ${item.fields.readingTime}`}</small><h3>{item.title}</h3><a href={recordPath(section, item)} aria-label={`Read more: ${item.title}`}>↗</a></article>)}</div>}
    </div>
  </section>;
}
