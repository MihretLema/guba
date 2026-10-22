import { getPostgresPool } from "../../../../db/postgres";
export const dynamic = "force-dynamic";
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return new Response(null, { status: 404 });
  try {
    const result = await getPostgresPool().query("SELECT data FROM guba_images WHERE id=$1", [id]);
    if (!result.rowCount) return new Response(null, { status: 404 });
    return new Response(new Uint8Array(result.rows[0].data), { headers: { "Content-Type": "image/webp", "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch { return new Response(null, { status: 503 }); }
}
