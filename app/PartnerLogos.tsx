"use client";

import Image from "next/image";
import { useState } from "react";
import type { Item } from "./admin/workspace";
import { imageUrl, recordPath, safeUrl } from "./public-content";

// Defaults for the existing ecosystem; an admin logo takes priority.
const logos: Record<string, string> = {
  cisco: "cisco", microsoft: "microsoft", oracle: "oracle", fortinet: "fortinet",
  schneider: "schneider", schneiderelectric: "schneider", dell: "dell",
};

function Partner({ item }: { item: Item }) {
  const [failed, setFailed] = useState<string>();
  const fallback = logos[item.title.toLowerCase().replace(/[^a-z]/g, "")];
  const source = imageUrl(item) || (fallback ? `/partners/${fallback}.svg` : undefined);
  return <a className="partner-logo" href={safeUrl(item.fields?.website) || recordPath("Partners & clients", item)}>
    {source && failed !== source ? <><Image unoptimized src={source} alt={item.title} width={180} height={72} onError={() => setFailed(source)} />{!imageUrl(item) && ["fortinet", "schneider"].includes(fallback) && <small aria-hidden="true">{item.title}</small>}</> : <span>{item.title}</span>}
  </a>;
}

export function PartnerLogos({ items }: { items: Item[] }) {
  const [paused, setPaused] = useState(false);
  if (!items.length) return null;
  return <section className="partner-strip" id="partners" aria-label="Technology partners">
    <div className="partner-heading"><p>Trusted technology ecosystem</p><button type="button" aria-pressed={paused} onClick={() => setPaused(!paused)}>{paused ? "Play logos ▶" : "Pause logos Ⅱ"}</button></div>
    <div className={`partner-window${paused ? " is-paused" : ""}`} tabIndex={0} role="region" aria-label="Partner logos; scroll to explore">
      <div className="partner-track">
        <div className="partner-group">{items.map(item => <Partner key={item.id} item={item} />)}</div>
        <div className="partner-group" aria-hidden="true" inert>{items.map(item => <Partner key={item.id} item={item} />)}</div>
      </div>
    </div>
  </section>;
}
