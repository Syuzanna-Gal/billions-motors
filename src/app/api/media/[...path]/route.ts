import { readFile } from "node:fs/promises";
import { CONTENT_TYPES, resolveMediaPath } from "@/lib/media";

/** Serves uploaded car photos. File names are unique, so they can be cached forever. */
export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const file = resolveMediaPath(path);
  const type = CONTENT_TYPES[path.at(-1)?.split(".").pop()?.toLowerCase() ?? ""];
  if (!file || !type) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(file);
    return new Response(new Uint8Array(body), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
