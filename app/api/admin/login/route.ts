import { randomBytes } from "node:crypto";
import { getPostgresPool } from "../../../../db/postgres";
import { hashPassword, verifyPassword, sessionCookie, tokenHash } from "../../../admin/password";
export const dynamic = "force-dynamic";
const dummyHash = hashPassword("dummy-password-for-timing");
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  try {
    const raw = await request.text();
    if (raw.length > 5000) return Response.json({ error: "Invalid credentials" }, { status: 400 });
    let body;
    try { body = request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ? Object.fromEntries(new URLSearchParams(raw)) : JSON.parse(raw); } catch { return Response.json({ error: "Invalid request" }, { status: 400 }); }
    if (typeof body.email !== "string" || typeof body.password !== "string" || body.email.length > 320 || body.password.length > 256) return Response.json({ error: "Invalid credentials" }, { status: 400 });
    const email = body.email.trim().toLowerCase();
    const pool = getPostgresPool();
    const limit = await pool.query("INSERT INTO guba_login_attempts(email) VALUES ($1) ON CONFLICT(email) DO UPDATE SET attempts = CASE WHEN guba_login_attempts.window_start < now() - interval '15 minutes' THEN 1 ELSE guba_login_attempts.attempts + 1 END, window_start = CASE WHEN guba_login_attempts.window_start < now() - interval '15 minutes' THEN now() ELSE guba_login_attempts.window_start END RETURNING attempts", [email]);
    if (limit.rows[0].attempts > 10) return Response.json({ error: "Too many attempts. Try again in 15 minutes." }, { status: 429 });
    const result = await pool.query("SELECT password_hash, active FROM guba_admin_users WHERE email = $1", [email]);
    const user = result.rows[0];
    if (!verifyPassword(body.password, user?.password_hash ?? dummyHash) || !user?.active) return Response.json({ error: "Email or password is incorrect." }, { status: 401 });
    const token = randomBytes(32).toString("hex");
    await pool.query("DELETE FROM guba_admin_sessions WHERE expires_at <= now()");
    await pool.query("INSERT INTO guba_admin_sessions(token_hash, email, expires_at) VALUES ($1, $2, now() + interval '8 hours')", [tokenHash(token), email]);
    await pool.query("DELETE FROM guba_login_attempts WHERE email = $1", [email]);
    return Response.json({ ok: true }, { headers: { "Set-Cookie": `${sessionCookie}=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=28800${new URL(request.url).protocol === "https:" ? "; Secure" : ""}`, "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Sign-in is unavailable. Check the database connection." }, { status: 503 }); }
}
