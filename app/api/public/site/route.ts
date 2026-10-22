import { getPublicSite } from "../../../../db/workspace";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await getPublicSite(), { headers: { "Cache-Control": "no-store" } }); }
  catch { return Response.json({ error: "Website content is temporarily unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } }); }
}
