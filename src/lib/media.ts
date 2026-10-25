import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Uploaded photos are stored on disk in UPLOAD_DIR (default .data/uploads) and
 * served by /api/media/[...path]. On the server, keep UPLOAD_DIR on a persistent disk and back it up.
 */

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? ".data/uploads");
export const MEDIA_URL_PREFIX = "/api/media/";

const TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class UploadError extends Error {}

/** Saves an uploaded image and returns its public URL. */
/** Messages for rejected files; "{file}" is replaced with the file name. */
export type UploadMessages = { type: string; size: string };
const DEFAULT_UPLOAD_MESSAGES: UploadMessages = {
  type: "{file}: only JPG, PNG, WebP or AVIF images",
  size: "{file}: larger than 15 MB",
};

export async function saveImage(file: File, folder: string, messages: UploadMessages = DEFAULT_UPLOAD_MESSAGES): Promise<string> {
  const ext = TYPES[file.type];
  if (!ext) throw new UploadError(messages.type.replace("{file}", file.name));
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(messages.size.replace("{file}", file.name));
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `${MEDIA_URL_PREFIX}${safeFolder}/${name}`;
}

/** Deletes a file we uploaded (ignores external URLs and missing files). */
export async function deleteImageFile(url: string) {
  if (!url.startsWith(MEDIA_URL_PREFIX)) return;
  const file = resolveMediaPath(url.slice(MEDIA_URL_PREFIX.length).split("/"));
  if (file) await unlink(file).catch(() => {});
}

/** Maps URL segments to a file inside UPLOAD_DIR, refusing anything that escapes it. */
export function resolveMediaPath(segments: string[]): string | null {
  if (segments.some((s) => !s || s === "." || s === ".." || s.includes("\\"))) return null;
  const file = path.resolve(UPLOAD_DIR, ...segments);
  return file.startsWith(UPLOAD_DIR + path.sep) ? file : null;
}

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  avif: "image/avif",
};
