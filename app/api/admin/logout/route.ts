import { cookies } from "next/headers";
import { getPostgresPool } from "../../../../db/postgres";
import { sessionCookie, tokenHash } from "../../../admin/password";
export async function POST(request: Request) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return new Response("Invalid origin", { status: 403 });
  const token = (await cookies()).get(sessionCookie)?.value;
  if (token) {
    try { await getPostgresPool().query("DELETE FROM guba_admin_sessions WHERE token_hash = $1", [tokenHash(token)]); }
    catch { return new Response("Sign-out failed. Please retry.", { status: 503 }); }
  }
  return new Response(null, { status: 303, headers: { Location: "/admin/login", "Set-Cookie": `${sessionCookie}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0` } });
}
