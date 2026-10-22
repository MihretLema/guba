"use client";

import { DeveloperCredit } from "../DeveloperCredit";
import { useEffect, useRef, useState, type FormEvent, type ChangeEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { imageUrl, publicDescription, publicSections, recordPath, type PublicSection } from "../public-content";
import { contactValidationError } from "../contact-details";
import { ContentImage } from "./ContentImage";
import { AdminAccounts } from "./AdminAccounts";
import { emptyStore, fields, normalizeStore, sections, statuses, validStore, type Item, type Section, type Store } from "./workspace";

const groups = [
  { label: "Overview", pages: ["Dashboard"] },
  { label: "Content", pages: ["Homepage", "Contact information", "Services", "Projects", "Insights", "Partners & clients", "Clients", "Testimonials"] },
  { label: "Engagement", pages: ["Contact messages", "RFQ requests", "AI knowledge"] },
  { label: "Workspace", pages: ["Settings", "Access", "Activity logs"] },
];
const allPages = groups.flatMap(group => group.pages);
const icons: Record<string, string> = { Dashboard: "◫", Services: "⚙", Projects: "▧", Insights: "▤", Events: "▦", Jobs: "▣", Products: "⬡", Clients: "♧", "Partners & clients": "⋈", Testimonials: "❞", "Contact messages": "✉", "RFQ requests": "↗", "AI knowledge": "✧" };
const sectionLabel = (value: string) => value === "Partners & clients" ? "Partners" : value;
const slug = (value: string) => encodeURIComponent(value.toLowerCase().replaceAll(" ", "-"));
const date = (value: string) => { const parsed = new Date(value); return Number.isNaN(parsed.getTime()) ? value : parsed.toLocaleString(); };
const summarySections: Section[] = ["Services", "Projects", "Insights", "Partners & clients", "Clients", "Testimonials", "Contact messages"];

export function AdminDashboard({ displayName, email, signOutPath }: { displayName: string; email: string; signOutPath: string }) {
  const [page, setPage] = useState("Dashboard");
  const [store, setStore] = useState<Store>(emptyStore);
  const [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const mutation = useRef(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("All");
  const [editing, setEditing] = useState<Item | "new" | null>(null);
  const [draft, setDraft] = useState<Item>({ id: "", title: "", detail: "", status: "Draft", extra: "", updated: "", fields: {} });
  const [settings, setSettings] = useState(emptyStore().settings);
  const inputRef = useRef<HTMLInputElement>(null);

  async function load() {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/workspace", { cache: "no-store" });
      const payload = await response.json() as { data: unknown; revision: number; error?: string };
      if (!response.ok) throw new Error(payload.error || "Unable to load workspace");
      if (!validStore(payload.data)) throw new Error("The database returned invalid workspace data.");
      const data = normalizeStore(payload.data);
      setStore(data); setSettings(data.settings); setRevision(payload.revision); setReady(true); setEditing(null);
    } catch (err) { setError(err instanceof Error ? err.message : "Connection failed"); setReady(false); }
    finally { setLoading(false); }
  }
  useEffect(() => { const timer = setTimeout(() => { void load(); onHash(); }, 0); const onHash = () => { setPage(allPages.find(value => slug(value) === window.location.hash.slice(1)) ?? "Dashboard"); setEditing(null); setQuery(""); setFilter("All"); }; window.addEventListener("hashchange", onHash); return () => { clearTimeout(timer); window.removeEventListener("hashchange", onHash); }; }, []);
  useEffect(() => {
    if (editing || page === "Settings") return;
    let cancelled = false;
    const timer = setInterval(async () => {
      if (mutation.current || document.visibilityState === "hidden") return;
      try {
        const response = await fetch("/api/admin/workspace", {cache:"no-store"});
        if (!response.ok) return;
        const payload = await response.json() as {data:unknown;revision:number};
        if (!cancelled && !mutation.current && payload.revision !== revision && validStore(payload.data)) { const next = normalizeStore(payload.data); setStore(next); setRevision(payload.revision); setSettings(next.settings); }
      } catch { /* Keep current records and report any failure on an explicit save or reload. */ }
    }, 5000);
    return () => {cancelled=true;clearInterval(timer);};
  }, [editing, page, revision]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(""), 5000); return () => clearTimeout(timer); }, [notice]);
  useEffect(() => { if (!editing) return; const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && !mutation.current) setEditing(null); }; window.addEventListener("keydown", onKey); return () => window.removeEventListener("keydown", onKey); }, [editing]);

  function navigate(next: string) { if (!allPages.includes(next)) return; window.history.pushState({}, "", `#${slug(next)}`); setPage(next); setEditing(null); setQuery(""); setFilter("All"); setMobileOpen(false); }
  async function commit(next: Store, action: string) {
    if (!ready || mutation.current) return false;
    if (!validStore(next)) { setError("Check the record fields and try again."); return false; }
    mutation.current = true; setBusy(true); setError("");
    try {
      const response = await fetch("/api/admin/workspace", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ data: next, revision, action }) });
      const result = await response.json() as { revision: number; error?: string };
      if (!response.ok) { if (response.status === 409) setReady(false); throw new Error(result.error || "Save failed"); }
      setRevision(result.revision);
      const saved = { ...next, logs: [{ id: crypto.randomUUID(), action: `${action} · ${email}`, date: new Date().toISOString() }, ...store.logs].slice(0, 250) };
      setStore(saved); setSettings(saved.settings); setNotice(action); const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("guba-site") : null; channel?.postMessage("updated"); channel?.close(); return true;
    } catch (err) { setError(err instanceof Error ? err.message : "Save failed"); return false; }
    finally { mutation.current = false; setBusy(false); }
  }
  function openEditor(item?: Item) { setDraft(item ? { ...item, fields: { ...item.fields } } : { id: crypto.randomUUID(), title: "", detail: "", status: statuses(page).includes("Published") ? "Published" : statuses(page)[0], extra: "", updated: "", fields: {} }); setEditing(item ?? "new"); }
  async function saveItem(event: FormEvent) {
    event.preventDefault();
    if (uploadingImage) return;
    if (page === "Contact information") {const issue=contactValidationError(draft.fields);if(issue){setError(issue);return;}}
    const item = { ...draft, title: draft.title.trim(), detail: draft.detail.trim(), updated: new Date().toISOString() };
    const items = editing === "new" ? [item, ...store.items[page]] : store.items[page].map(current => current.id === item.id ? item : current);
    if (await commit({ ...store, items: { ...store.items, [page]: items } }, `${editing === "new" ? "Created" : "Updated"} ${sectionLabel(page)}: ${item.title}`)) setEditing(null);
  }
  async function remove(item: Item) { if (window.confirm(`Delete “${item.title}”? This removes the shared record.`)) await commit({ ...store, items: { ...store.items, [page]: store.items[page].filter(current => current.id !== item.id) } }, `Deleted ${sectionLabel(page)}: ${item.title}`); }
  function download(name: string, content: string, type: string) { const url = URL.createObjectURL(new Blob([content], { type })); const anchor = document.createElement("a"); anchor.href = url; anchor.download = name; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
  function exportCsv() { const safe = (value: string) => `"${(/^[=+@\-\t\r]/.test(value) ? "'" + value : value).replaceAll('"', '""')}"`; const rows = [["Section", "Title", "Description", "Status", "Updated"], ...Object.entries(store.items).flatMap(([section, items]) => items.map(item => [section, item.title, item.detail, item.status, item.updated]))]; download("guba-records.csv", "\ufeff" + rows.map(row => row.map(safe).join(",")).join("\r\n"), "text/csv;charset=utf-8"); }
  async function importData(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; if (!file) return;
    try { if (file.size > 950000) throw new Error("Backup must be smaller than 950 KB."); const data: unknown = JSON.parse(await file.text()); if (!validStore(data)) throw new Error("Invalid GUBA backup. Check record fields and statuses."); if (window.confirm("Replace the shared database records with this backup? Download a current backup first.")) await commit(normalizeStore(data), `Restored backup: ${file.name}`); }
    catch (err) { setError(err instanceof Error ? err.message : "Import failed"); } finally { event.target.value = ""; }
  }
  async function importBrowser() {
    try { const raw = localStorage.getItem(`guba-admin-v1:${email.toLowerCase()}`) ?? localStorage.getItem("guba-admin-v1"); if (!raw) throw new Error("No legacy workspace found in this browser."); const data: unknown = JSON.parse(raw); if (!validStore(data)) throw new Error("Legacy data needs correction. Export it as a backup for review."); const merged = normalizeStore(data); for (const section of sections) merged.items[section] = [...store.items[section], ...merged.items[section].filter(item => !store.items[section].some(existing => existing.id === item.id))]; merged.settings = store.settings; if (window.confirm("Merge legacy browser records into the shared database?")) await commit(merged, "Imported legacy browser records"); }
    catch (err) { setError(err instanceof Error ? err.message : "Import failed"); }
  }
  const records = (store.items[page] ?? []).filter(item => (filter === "All" || item.status === filter) && `${item.title} ${item.detail} ${item.extra ?? ""} ${Object.values(item.fields ?? {}).join(" ")}`.toLowerCase().includes(query.toLowerCase()));
  const visibleItems = Object.entries(store.items).filter(([section]) => allPages.includes(section)).flatMap(([, items]) => items);
  const total = visibleItems.length;
  const recent = ["Projects", "Insights", "Services", "Contact messages"];

  return <main className="admin-shell guba-console">
    <aside className={`admin-sidebar ${mobileOpen ? "mobile-open" : ""}`}><Link className="admin-brand" href="/"><span>G</span><p><strong>GUBA</strong><small>ADMIN WORKSPACE</small></p></Link><nav aria-label="Admin navigation">{groups.map(group => <div className="admin-group" key={group.label}><label>{group.label}</label>{group.pages.map(target => <button key={target} onClick={() => navigate(target)} className={page === target ? "active" : ""} aria-current={page === target ? "page" : undefined}><i aria-hidden="true">{icons[target] ?? "▫"}</i>{sectionLabel(target)}</button>)}</div>)}</nav><div className="admin-profile"><div>{displayName[0].toUpperCase()}</div><p><strong>{displayName}</strong><small>{email}</small></p>{signOutPath === "/api/admin/logout" ? <form action={signOutPath} method="post"><button>Sign out</button></form> : <a href={signOutPath}>Sign out</a>}</div></aside>
    {mobileOpen && <button className="admin-overlay" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />}
    <section className="admin-main"><header className="admin-topbar"><button className="admin-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation" aria-expanded={mobileOpen}>☰</button><div><small>GUBA</small><span>/</span><strong>{sectionLabel(page)}</strong></div><div className="admin-actions"><span className={`db-status ${ready ? "connected" : ""}`}>{loading ? "Connecting…" : ready ? "● Database connected" : "○ Disconnected"}</span><button disabled={busy || loading} onClick={() => void load()} aria-label="Reload workspace">↻</button><Link href="/" target="_blank" rel="noreferrer">View website ↗</Link></div></header>
    <div className="admin-content">
      {error && <div className="console-error" role="alert"><div><strong>Unable to complete the request</strong><p>{error}</p></div><button disabled={busy || loading} onClick={() => void load()}>Reload workspace</button></div>}
      {notice && <div className="admin-notice" role="status">{notice}<button onClick={() => setNotice("")} aria-label="Dismiss">×</button></div>}
      {loading ? <div className="console-loading" role="status">Loading your shared workspace…</div> : <fieldset className="console-workspace" disabled={!ready || busy}>
      {page === "Dashboard" && <>
        <div className="console-welcome"><div><span className="console-eyebrow">✧ ADMIN WORKSPACE</span><h1>Welcome back, {displayName.split(/[ @]/)[0]}.</h1><p>Your content, activity, and team at a glance.<br />Choose a section below to manage its records.</p><small>{new Date().toLocaleDateString(undefined, { weekday: "long", year: "numeric", month: "long", day: "numeric" })}</small></div><div className="console-welcome-actions"><button onClick={() => navigate("AI knowledge")}>✧ Chatbot knowledge</button><button onClick={() => navigate("Projects")}>Manage projects ↗</button><button onClick={() => navigate("Insights")}>Post an insight ↗</button></div></div>
        <div className="workspace-highlights"><div><span>Workspace content</span><strong>{total}<small>Total records</small></strong></div><div><span>Live on your website</span><strong>{visibleItems.filter(item => item.status === "Published").length}<small>Published records</small></strong></div><div><span>Ready for your attention</span><strong>{[...(store.items["Contact messages"] ?? []), ...(store.items["RFQ requests"] ?? [])].filter(item => item.status === "New").length}<small>New enquiries</small></strong></div></div>
        <div className="console-section-heading"><div><span>AT A GLANCE</span><h2>Overview</h2></div><p>{total} records across your shared workspace</p></div>
        <div className="console-stats">{summarySections.map((section, index) => <button className="console-stat" key={section} onClick={() => navigate(section)}><div><span className={`console-stat-icon tone-${index % 4}`}>{icons[section] ?? "▤"}</span><span>↗</span></div><p>{section === "Insights" ? "News & insights" : sectionLabel(section)}</p><strong>{ready ? store.items[section].length : "—"}</strong><footer><span>{store.items[section].filter(item => item.status === "Published").length} published</span><b>Explore →</b></footer></button>)}</div>
        <div className="console-section-heading"><div><span>KEEP THINGS MOVING</span><h2>Recent records</h2></div><button onClick={exportCsv}>↓ Export report</button></div>
        <div className="console-recent">{recent.map(section => <article key={section}><header><h3>{icons[section]} {sectionLabel(section)}</h3><button onClick={() => navigate(section)}>View all →</button></header>{store.items[section].length ? <ul>{[...store.items[section]].sort((a, b) => b.updated.localeCompare(a.updated)).slice(0, 4).map(item => <li key={item.id}><button onClick={() => navigate(section)}><span>{item.title}<small>{date(item.updated)}</small></span><b className="console-badge">{item.status}</b></button></li>)}</ul> : <div className="console-empty"><span>{icons[section]}</span><p>No {section.toLowerCase()} yet.</p><button onClick={() => navigate(section)}>Create your first record →</button></div>}</article>)}</div>
      </>}
      {sections.includes(page as Section) && <section className="admin-page"><div className="admin-page-head"><div><span>CONTENT MANAGEMENT</span><h1>{sectionLabel(page)}</h1><p>{publicDescription(page)}</p></div><button className="admin-primary" onClick={() => openEditor()}>＋ Add record</button></div><div className="admin-panel record-panel"><div className="console-toolbar"><strong>{records.length} records <span className="record-panel-hint">Your content library</span></strong><div><select aria-label="Filter status" value={filter} onChange={event => setFilter(event.target.value)}>{["All", ...statuses(page)].map(status => <option key={status}>{status}</option>)}</select><input aria-label="Search records" placeholder="Search records…" value={query} onChange={event => setQuery(event.target.value)} /></div></div>{records.length ? <div className="admin-records">{records.map(item => <article className="admin-record" key={item.id}>{(fields[page as Section] ?? []).some(field => field.key === "image") && imageUrl(item) && <div className="admin-record-thumbnail"><Image unoptimized src={imageUrl(item)!} alt={item.title} width={160} height={120} /></div>}<div className="admin-record-copy"><span className={`console-badge ${item.status === "Published" ? "published" : ""}`}>{item.status}</span><h2>{item.title}</h2><p>{item.detail || "No description"}</p>{Object.entries(item.fields ?? {}).filter(([, value]) => value).map(([key, value]) => <small key={key}>{fields[page as Section]?.find(field => field.key === key)?.label ?? key}: {value}</small>)}{item.extra && <small>{item.extra}</small>}<time>Updated {date(item.updated)}</time></div><div className="admin-record-actions"><button onClick={() => openEditor(item)}>Edit</button><button className="admin-danger" onClick={() => void remove(item)}>Delete</button>{item.status === "Published" && !(page === "Newsletter" && item.fields?.email) && publicSections.includes(page as PublicSection) && <a className="admin-preview" target="_blank" rel="noreferrer" href={["Homepage", "SEO manager", "AI knowledge"].includes(page) ? "/" : recordPath(page as PublicSection, item)}>View on website ↗</a>}</div></article>)}</div> : <div className="console-empty"><span>{icons[page] ?? "▤"}</span><h3>{query || filter !== "All" ? "No matching records" : `Your ${sectionLabel(page).toLowerCase()} start here`}</h3><p>{query || filter !== "All" ? "Try another search or status." : "Create a record to get started."}</p><button onClick={() => openEditor()}>＋ Add record</button></div>}</div></section>}
      {page === "Settings" && <section className="admin-page"><div className="admin-page-head"><div><span>WORKSPACE</span><h1>Settings</h1><p>Shared workspace preferences.</p></div></div><form className="admin-panel admin-form" onSubmit={event => { event.preventDefault(); void commit({ ...store, settings }, "Updated workspace settings"); }}><label>Site name<input required maxLength={200} value={settings.siteName} onChange={event => setSettings({ ...settings, siteName: event.target.value })} /></label><label>Contact email<input required type="email" maxLength={320} value={settings.contactEmail} onChange={event => setSettings({ ...settings, contactEmail: event.target.value })} /></label><label className="admin-check"><input type="checkbox" checked={settings.maintenance} onChange={event => setSettings({ ...settings, maintenance: event.target.checked })} /> Enable website maintenance mode</label><p>Maintenance mode shows a maintenance page to visitors. The admin remains accessible. Site name and contact email update the public website.</p><button className="admin-primary">{busy ? "Saving…" : "Save settings"}</button></form></section>}
      {page === "Access" && <AdminAccounts email={email} />}
      {page === "Activity logs" && <section className="admin-page"><div className="admin-page-head"><div><span>WORKSPACE</span><h1>Activity logs</h1><p>Latest 250 changes, recorded by the server.</p></div></div><div className="admin-panel">{store.logs.length ? <ul className="admin-log-list">{store.logs.map(log => <li key={log.id}><span>{log.action}</span><time>{date(log.date)}</time></li>)}</ul> : <p className="admin-empty">No activity yet.</p>}</div></section>}
      {page === "Backup & restore" && <section className="admin-page"><div className="admin-page-head"><div><span>WORKSPACE</span><h1>Backup & restore</h1><p>Export records or import a previous GUBA workspace.</p></div></div><div className="admin-panel admin-backup"><div><h2>Download backup</h2><p>All records and settings as JSON. Server audit history remains in the database.</p><button className="admin-primary" onClick={() => download(`guba-backup-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(store, null, 2), "application/json")}>Download JSON backup</button><button onClick={exportCsv}>Export CSV report</button></div><div><h2>Restore shared records</h2><p>Restore replaces records for all administrators. Existing audit history is preserved.</p><input ref={inputRef} type="file" accept=".json,application/json" className="sr-only" onChange={event => void importData(event)} /><button onClick={() => inputRef.current?.click()}>Choose backup file</button><h2 className="legacy-heading">Move browser records</h2><p>Merge records from the original GUBA dashboard on this device.</p><button onClick={() => void importBrowser()}>Import legacy browser data</button></div></div></section>}
      </fieldset>}
    </div><div className="console-footer">© 2026 GUBA Engineering Investment Group <span>Engineering progress. Empowering growth.</span><DeveloperCredit /></div></section>
    {editing && <div className="admin-modal-backdrop"><form className="admin-modal admin-form" onSubmit={event => void saveItem(event)} role="dialog" aria-modal="true" aria-labelledby="editor-title"><div className="admin-modal-head"><h2 id="editor-title">{editing === "new" ? "Create" : "Edit"} · {sectionLabel(page)}</h2><button type="button" disabled={busy || uploadingImage} onClick={() => setEditing(null)} aria-label="Close editor">×</button></div>{error && <p role="alert" className="console-error">{error}</p>}<fieldset disabled={busy || uploadingImage || !ready} className="console-editor-fields"><label>{["Job applications", "Newsletter"].includes(page) ? "Name / email" : page === "Contact information" ? "Page heading / branch title" : "Title"}<input required autoFocus maxLength={300} value={draft.title} onChange={event => setDraft({ ...draft, title: event.target.value })} /></label><label>{page === "AI knowledge" ? "Answer" : page === "Contact information" ? "Introduction" : "Description"}<textarea rows={5} maxLength={50000} value={draft.detail} onChange={event => setDraft({ ...draft, detail: event.target.value })} /></label><div className="console-field-grid">{(fields[page as Section] ?? []).map(field => field.key === "image" ? <ContentImage label={page === "Partners & clients" ? "partner logo" : page === "Media library" ? "media" : sectionLabel(page).toLowerCase()} disabled={busy || !ready} key={field.key} value={draft.fields?.image ?? ""} onUploading={setUploadingImage} onChange={url => setDraft(current => ({...current,fields:{...current.fields,image:url}}))} /> : <label key={field.key}>{field.label}{field.type === "textarea" ? <textarea rows={3} maxLength={5000} value={draft.fields?.[field.key] ?? ""} onChange={event => setDraft({ ...draft, fields: {...draft.fields,[field.key]:event.target.value} })} /> : <input type={field.type ?? "text"} min={field.type === "number" ? 0 : undefined} maxLength={5000} value={draft.fields?.[field.key] ?? ""} onChange={event => setDraft({ ...draft, fields: { ...draft.fields, [field.key]: event.target.value } })} />}</label>)}</div><label>{page === "Contact information" ? "Visitor notes / directions" : page === "Media library" ? "File URL" : page === "SEO manager" ? "Page path" : "Additional information / image URL"}<input maxLength={2000} value={draft.extra ?? ""} onChange={event => setDraft({ ...draft, extra: event.target.value })} /></label><label>Status<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value })}>{statuses(page).map(status => <option key={status}>{status}</option>)}</select></label><div className="admin-modal-actions"><button type="button" onClick={() => setEditing(null)}>Cancel</button><button className="admin-primary">{busy ? "Saving…" : "Save record"}</button></div></fieldset></form></div>}
  </main>;
}
