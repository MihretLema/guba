import { getAdminUser } from "../../../admin/auth";
import { validStore } from "../../../admin/workspace";
import { readWorkspace, saveWorkspace } from "../../../../db/workspace";
export const dynamic = "force-dynamic";
async function approvedEmail() {
  const user = await getAdminUser();
  return user ? user.email.toLowerCase() : null;
}
export async function GET() {
  if (!await approvedEmail()) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try { return Response.json(await readWorkspace(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Database unavailable. Check DATABASE_URL and run npm run db:setup:postgres." }, { status: 503 }); }
}
export async function PUT(request: Request) {
  const email = await approvedEmail();
  if (!email) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const text = await request.text();
  if (new TextEncoder().encode(text).length > 1_000_000) return Response.json({ error: "Workspace exceeds 1 MB" }, { status: 413 });
  let body;
  try { body = JSON.parse(text); } catch { return Response.json({ error: "Invalid JSON" }, { status: 400 }); }
  if (!body || !validStore(body.data) || !Number.isSafeInteger(body.revision) || body.revision < 0 || typeof body.action !== "string" || !body.action.trim() || body.action.length > 500) return Response.json({ error: "Invalid workspace" }, { status: 400 });
  try {
    const revision = await saveWorkspace(body.data, body.revision, email, body.action);
    if (revision === null) return Response.json({ error: "Another administrator saved changes. Reload the workspace before editing again." }, { status: 409 });
    return Response.json({ revision }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Database save failed. Your changes have not been saved." }, { status: 503 }); }
}
