import { cookies } from "next/headers";
import { getChatGPTUser } from "../chatgpt-auth";
import { getPostgresPool } from "../../db/postgres";
import { sessionCookie, tokenHash } from "./password";
const defaultAdminEmail = "mihretlemabelete@gmail.com";
export function isAdminEmail(email: string): boolean {
  const configured = process.env.ADMIN_EMAILS?.trim();
  const allowed = configured ? configured.split(",") : [defaultAdminEmail];
  return allowed.some(entry => entry.trim().toLowerCase() === email.trim().toLowerCase());
}
export async function getAdminUser() {
  const identity = process.env.TRUST_CHATGPT_AUTH_HEADERS === "true" ? await getChatGPTUser() : null;
  if (identity && isAdminEmail(identity.email)) return { ...identity, provider: "chatgpt" as const };
  const cookie = (await cookies()).get(sessionCookie)?.value;
  if (!cookie) return null;
  try {
    const result = await getPostgresPool().query("SELECT u.email, u.name FROM guba_admin_sessions s JOIN guba_admin_users u ON u.email = s.email WHERE s.token_hash = $1 AND s.expires_at > now() AND u.active = true", [tokenHash(cookie)]);
    const user = result.rows[0];
    return user ? { email: user.email as string, displayName: user.name as string, fullName: user.name as string, provider: "password" as const } : null;
  } catch { return null; }
}
