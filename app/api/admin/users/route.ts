import { getAdminUser } from "../../../admin/auth";
import { hashPassword } from "../../../admin/password";
import { getPostgresPool } from "../../../../db/postgres";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!await getAdminUser()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { const result = await getPostgresPool().query("SELECT email, name, active, created_at FROM guba_admin_users ORDER BY created_at"); return Response.json({ users: result.rows }, { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Unable to load accounts" }, { status: 503 }); }
}
export async function POST(request: Request) {
  const actor = await getAdminUser();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 3000) return Response.json({ error: "Request too large" }, { status: 413 });
  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(body.email) || body.email.length > 320 || typeof body.name !== "string" || !body.name.trim() || body.name.length > 200 || typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256) return Response.json({ error: "Provide a name, valid email and password of 12–256 characters." }, { status: 400 });
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    await client.query("INSERT INTO guba_admin_users(email, name, password_hash) VALUES ($1, $2, $3)", [body.email.trim().toLowerCase(), body.name.trim(), hashPassword(body.password)]);
    await client.query("INSERT INTO guba_activity(actor, action) VALUES ($1, $2)", [actor.email, `Created administrator: ${body.email}`]);
    await client.query("COMMIT");
    return Response.json({ ok: true }, { status: 201 });
  } catch (error) { await client.query("ROLLBACK"); return Response.json({ error: (error as { code?: string }).code === "23505" ? "An account already exists for this email." : "Unable to create account." }, { status: 400 }); }
  finally { client.release(); }
}
export async function PATCH(request: Request) {
  const actor = await getAdminUser();
  if (!actor) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const raw = await request.text();
  if (raw.length > 3000) return Response.json({ error: "Invalid request" }, { status: 400 });
  let body;
  try { body = JSON.parse(raw); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (typeof body.email !== "string" || body.email.length > 320 || typeof body.active !== "boolean" || (body.password !== undefined && (typeof body.password !== "string" || body.password.length < 12 || body.password.length > 256))) return Response.json({ error: "Invalid account update. Passwords need at least 12 characters." }, { status: 400 });
  if (body.email.toLowerCase() === actor.email.toLowerCase() && !body.active) return Response.json({ error: "You cannot disable your own account." }, { status: 400 });
  const client = await getPostgresPool().connect();
  try {
    await client.query("BEGIN");
    const result = await client.query("UPDATE guba_admin_users SET active = $1, password_hash = COALESCE($2, password_hash) WHERE email = $3 RETURNING email", [body.active, body.password ? hashPassword(body.password) : null, body.email.toLowerCase()]);
    if (!result.rowCount) { await client.query("ROLLBACK"); return Response.json({ error: "Account not found" }, { status: 404 }); }
    if (!body.active || body.password) await client.query("DELETE FROM guba_admin_sessions WHERE email = $1", [body.email.toLowerCase()]);
    await client.query("INSERT INTO guba_activity(actor, action) VALUES ($1, $2)", [actor.email, `Updated administrator: ${body.email}`]);
    await client.query("COMMIT");
    return Response.json({ ok: true });
  } catch { await client.query("ROLLBACK"); return Response.json({ error: "Account update failed" }, { status: 503 }); }
  finally { client.release(); }
}
