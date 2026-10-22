import { createHash, randomUUID } from "node:crypto";
import { getPostgresPool } from "../../../../db/postgres";
import { safeUrl } from "../../../public-content";
export const dynamic = "force-dynamic";
const kinds = { contact: "Contact messages", rfq: "RFQ requests", application: "Job applications", registration: "Registrations", newsletter: "Newsletter" } as const;
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 16000) return Response.json({ error: "Your message is too large." }, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
  if (!body || typeof body !== "object" || !Object.hasOwn(kinds, body.kind)) return Response.json({ error: "Invalid form" }, { status: 400 });
  if (body.website) return Response.json({ ok: true });
  if (typeof body.name !== "string" || !body.name.trim() || body.name.length > 200 || typeof body.email !== "string" || body.email.length > 320 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.consent !== "yes" || (body.kind !== "newsletter" && (typeof body.message !== "string" || !body.message.trim() || body.message.length > 10000))) return Response.json({ error: "Provide your name, valid email, message and consent." }, { status: 400 });
  if (body.kind === "application" && (typeof body.document !== "string" || body.document.length > 2000 || !safeUrl(body.document) || !body.document.startsWith("https://"))) return Response.json({ error: "Provide an HTTPS CV or portfolio URL." }, { status: 400 });
  if (body.budget !== undefined && (typeof body.budget !== "string" || body.budget.length > 100)) return Response.json({ error: "Invalid budget" }, { status: 400 });
  if (["phone", "company", "subject"].some(key => body[key] !== undefined && (typeof body[key] !== "string" || body[key].length > (key === "phone" ? 50 : 200)))) return Response.json({error:"Contact fields are too long or invalid."},{status:400});
  if (body.targetId !== undefined && (typeof body.targetId !== "string" || body.targetId.length > 100)) return Response.json({ error: "Invalid selection" }, { status: 400 });
  const kind = body.kind as keyof typeof kinds;
  const email = body.email.trim().toLowerCase();
  let client;
  try {
    const pool = getPostgresPool();
    const key = createHash("sha256").update(email).digest("hex");
    const limit = await pool.query("INSERT INTO guba_submission_limits(key) VALUES ($1) ON CONFLICT(key) DO UPDATE SET attempts=CASE WHEN guba_submission_limits.window_start < now()-interval '1 hour' THEN 1 ELSE guba_submission_limits.attempts+1 END, window_start=CASE WHEN guba_submission_limits.window_start < now()-interval '1 hour' THEN now() ELSE guba_submission_limits.window_start END RETURNING attempts", [key]);
    if (limit.rows[0].attempts > 15) return Response.json({ error: "Too many submissions. Please try again later." }, { status: 429 });
    client = await pool.connect();
    await client.query("BEGIN");
    const workspace = await client.query("SELECT settings FROM guba_workspace WHERE id='guba' FOR UPDATE");
    if (workspace.rows[0]?.settings.maintenance) { await client.query("ROLLBACK"); return Response.json({ error: "The website is undergoing maintenance. Please contact our team by email." }, { status: 503 }); }
    let targetTitle = "";
    if (["application", "registration"].includes(kind) || (kind === "rfq" && body.targetId)) {
      const target = await client.query("SELECT section, data FROM guba_records WHERE id=$1 AND section=ANY($2::text[]) AND data->>'status'='Published'", [body.targetId, kind === "application" ? ["Jobs"] : kind === "rfq" ? ["Services", "Products", "Projects"] : ["Training", "Events"]]);
      if (!target.rowCount) { await client.query("ROLLBACK"); return Response.json({ error: "This listing is no longer available." }, { status: 400 }); }
      const item = target.rows[0].data;
      if (item.fields?.deadline && item.fields.deadline < new Date().toISOString().slice(0, 10)) { await client.query("ROLLBACK"); return Response.json({ error: "Applications for this role have closed." }, { status: 400 }); }
      const capacity = Number(item.fields?.capacity);
      if (kind === "registration" && item.fields?.capacity !== undefined && item.fields.capacity !== "" && Number.isFinite(capacity) && capacity >= 0) {
        const count = await client.query("SELECT count(*) FROM guba_records WHERE section='Registrations' AND data->'fields'->>'targetId'=$1 AND data->>'status' <> 'Cancelled'", [body.targetId]);
        if (Number(count.rows[0].count) >= capacity) { await client.query("ROLLBACK"); return Response.json({ error: "This event is fully booked." }, { status: 409 }); }
      }
      targetTitle = item.title;
    }
    const item = { id: randomUUID(), title: body.name.trim(), detail: body.message?.trim() ?? "Newsletter subscription", status: kind === "newsletter" ? "Subscribed" : "New", updated: new Date().toISOString(), fields: { email, ...(kind === "contact" ? Object.fromEntries(["phone","company","subject"].filter(key=>body[key]).map(key=>[key,body[key].trim()])) : {}), ...(body.document ? { document: body.document } : {}), ...(body.budget ? { budget: body.budget } : {}), ...(targetTitle ? { targetTitle, targetId: body.targetId, ...(kind === "application" ? {job:targetTitle} : {}) } : {}) } };
    if (kind === "newsletter") {
      const existing = await client.query("SELECT id FROM guba_records WHERE section='Newsletter' AND data->'fields'->>'email'=$1", [email]);
      if (existing.rowCount) item.id = existing.rows[0].id;
    }
    await client.query("INSERT INTO guba_records(section,id,data,position) VALUES ($1,$2,$3::jsonb,-1) ON CONFLICT(section,id) DO UPDATE SET data=EXCLUDED.data", [kinds[kind], item.id, JSON.stringify(item)]);
    await client.query("UPDATE guba_workspace SET revision=revision+1,updated_at=now() WHERE id='guba'");
    await client.query("INSERT INTO guba_activity(actor,action) VALUES ('Website visitor',$1)", [`New ${kinds[kind].toLowerCase()} submission`]);
    await client.query("COMMIT");
    return Response.json({ ok: true }, { status: 201 });
  } catch { if (client) await client.query("ROLLBACK"); return Response.json({ error: "We could not save your submission. Please try again." }, { status: 503 }); }
  finally { client?.release(); }
}
