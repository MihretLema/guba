import type { Pool } from "pg";
import { emptyStore, normalizeStore, sections, type Store } from "../app/admin/workspace";
import { getPostgresPool } from "./postgres";
import { publicSections, type PublicSite } from "../app/public-content";

export async function readWorkspace(pool: Pool = getPostgresPool()) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY");
    const workspace = await client.query("SELECT revision, settings FROM guba_workspace WHERE id = 'guba'");
    if (!workspace.rowCount) throw new Error("Run database setup first");
    const records = await client.query("SELECT section, data FROM guba_records ORDER BY position");
    const logs = await client.query("SELECT id, actor, action, created_at FROM guba_activity ORDER BY id DESC LIMIT 250");
    const data = emptyStore();
    data.settings = workspace.rows[0].settings;
    for (const row of records.rows) if (sections.includes(row.section)) data.items[row.section].push(row.data);
    data.logs = logs.rows.map(row => ({ id: String(row.id), action: `${row.action} · ${row.actor}`, date: new Date(row.created_at).toISOString() }));
    await client.query("COMMIT");
    return { data, revision: workspace.rows[0].revision as number };
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function saveWorkspace(store: Store, revision: number, actor: string, action: string, pool: Pool = getPostgresPool()) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE guba_workspace SET settings = $1::jsonb, revision = revision + 1, updated_at = now() WHERE id = 'guba' AND revision = $2 RETURNING revision", [JSON.stringify(store.settings), revision]);
    if (!result.rowCount) { await client.query("ROLLBACK"); return null; }
    await client.query("DELETE FROM guba_records");
    const data = normalizeStore(store);
    const records = sections.flatMap(section => data.items[section].map((item, position) => ({ section, id: item.id, data: item, position })));
    await client.query("INSERT INTO guba_records (section, id, data, position) SELECT section, id, data, position FROM jsonb_to_recordset($1::jsonb) AS x(section text, id text, data jsonb, position integer)", [JSON.stringify(records)]);
    await client.query("INSERT INTO guba_activity (actor, action) VALUES ($1, $2)", [actor, action]);
    await client.query("COMMIT");
    return result.rows[0].revision as number;
  } catch (error) { await client.query("ROLLBACK"); throw error; }
  finally { client.release(); }
}

export async function getPublicSite(): Promise<PublicSite> {
  const { data, revision } = await readWorkspace();
  const content = Object.fromEntries(publicSections.map(section => [section, data.items[section].filter(item => item.status === "Published" && !(section === "Newsletter" && item.fields?.email)).map(item => ({ ...item, fields: Object.fromEntries(Object.entries(item.fields ?? {}).filter(([key]) => key !== "email")), ...(section === "Newsletter" ? {extra: ""} : {}) }))]));
  return { revision, settings: data.settings, content: data.settings.maintenance ? {} : content };
}
