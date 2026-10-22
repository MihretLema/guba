"use client";
import { DeveloperCredit } from "./DeveloperCredit";
import Link from "next/link";
import Image from "next/image";
import { useLiveSite, Maintenance } from "./LiveSite";
import { PublicForm } from "./PublicForm";
import { fields } from "./admin/workspace";
import { imageUrl, safeUrl, type PublicSection, type PublicSite } from "./public-content";
export function ContentDetail({ initialSite, section, id }: { initialSite: PublicSite; section: PublicSection; id: string }) {
  const site = useLiveSite(initialSite);
  if (site.settings.maintenance) return <Maintenance site={site} />;
  const item = site.content[section]?.find(record => record.id === id);
  return <main className="content-detail"><header className="content-detail-nav"><Link href="/" className="brand"><span className="brand-mark">G</span><strong>{site.settings.siteName}</strong></Link><Link href="/">← Back to website</Link></header>{item ? <article><span className="public-card-kicker">GUBA / {section}</span><h1>{item.title}</h1>{imageUrl(item) && <Image unoptimized className="detail-image" src={imageUrl(item)!} alt={item.title} width={1200} height={700} />}<p className="detail-body">{item.detail}</p>{item.extra && !safeUrl(item.extra) && <p className="detail-body">{item.extra}</p>}<dl>{Object.entries(item.fields ?? {}).filter(([key, value]) => value && !["image", "url", "website", "email"].includes(key)).map(([key, value]) => <div key={key}><dt>{fields[section]?.find(field => field.key === key)?.label ?? key}</dt><dd>{value}</dd></div>)}</dl>{safeUrl(item.fields?.website) && <a className="button button-gold" href={safeUrl(item.fields?.website)} target="_blank" rel="noreferrer">Visit website ↗</a>}{section === "Media library" && safeUrl(item.fields?.url || item.extra) && <a className="button button-gold" href={safeUrl(item.fields?.url || item.extra)} target="_blank" rel="noreferrer">Open resource ↗</a>}{section === "Jobs" && (item.fields?.deadline && item.fields.deadline < new Date().toISOString().slice(0, 10) ? <p>Applications for this role have closed.</p> : <PublicForm kind="application" targetId={id} />)}{["Training", "Events"].includes(section) && <PublicForm kind="registration" targetId={id} />}{["Services", "Products", "Projects"].includes(section) && <PublicForm kind="rfq" targetId={id} label={`Ask GUBA about ${item.title}`} />}<Link className="detail-back" href="/">← Explore more from GUBA</Link></article> : <article><h1>This content is no longer available.</h1><p>It may have been unpublished or removed.</p><Link href="/">Return to the website →</Link></article>}<footer className="detail-credit"><DeveloperCredit /></footer></main>;
}
