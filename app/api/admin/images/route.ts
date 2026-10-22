import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
// Keep the native image codec outside the server bundle.
const sharp: typeof import("sharp") = createRequire(`${process.cwd()}/package.json`)("sharp");
import { getAdminUser } from "../../../admin/auth";
import { getPostgresPool } from "../../../../db/postgres";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getAdminUser();
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (request.headers.get("origin") !== new URL(request.url).origin) return Response.json({ error: "Invalid origin" }, { status: 403 });
  const limit = 5 * 1024 * 1024;
  const reader = request.body?.getReader();
  if (!reader) return Response.json({ error: "Choose an image" }, { status: 400 });
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size <= limit + 65536) chunks.push(value);
  }
  if (size > limit + 65536) return Response.json({ error: "Image must be 5 MB or smaller" }, { status: 413 });
  let data: Buffer;
  try {
    const form = await new Response(Buffer.concat(chunks), { headers: { "Content-Type": request.headers.get("content-type") || "" } }).formData();
    const file = form.get("image");
    if (!(file instanceof File) || !["image/jpeg", "image/png", "image/webp"].includes(file.type) || !file.size || file.size > limit) throw new Error();
    data = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000, animated: false }).rotate().resize({ width: 2000, height: 2000, fit: "inside", withoutEnlargement: true }).webp({ quality: 85 }).toBuffer();
  } catch { return Response.json({ error: "Choose a valid JPG, PNG or WebP image (maximum 5 MB)." }, { status: 400 }); }
  try {
    const id = randomUUID();
    await getPostgresPool().query("INSERT INTO guba_images(id, data) VALUES ($1, $2)", [id, data]);
    return Response.json({ url: `/api/images/${id}` }, { status: 201 });
  } catch { return Response.json({ error: "Image upload failed. Please try again." }, { status: 503 }); }
}
