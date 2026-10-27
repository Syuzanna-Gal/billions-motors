import { randomBytes } from "node:crypto";
import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

/*
 * Uploaded photos are stored on disk in UPLOAD_DIR (default .data/uploads) and
 * served by /api/media/[...path]. On the server, keep UPLOAD_DIR on a persistent disk and back it up.
 */

export const UPLOAD_DIR = path.resolve(process.env.UPLOAD_DIR ?? ".data/uploads");
export const MEDIA_URL_PREFIX = "/api/media/";

/**
 * The image format from the file's first bytes (its "signature"), or null if it isn't one we accept.
 * The browser's declared type is only a claim — a renamed text file would pass that check.
 */
export function detectImageType(head: Uint8Array): "jpg" | "png" | "webp" | "avif" | null {
  const at = (offset: number, bytes: number[]) => bytes.every((b, i) => head[offset + i] === b);
  const ascii = (offset: number, text: string) => at(offset, [...text].map((c) => c.charCodeAt(0)));
  if (at(0, [0xff, 0xd8, 0xff])) return "jpg";
  if (at(0, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "png";
  if (ascii(0, "RIFF") && ascii(8, "WEBP")) return "webp";
  // ISO-BMFF: [size]"ftyp"[major brand][version][compatible brands…]; AVIF lists "avif" or "avis".
  if (ascii(4, "ftyp")) {
    const size = Math.min(((head[0] << 24) | (head[1] << 16) | (head[2] << 8) | head[3]) >>> 0, head.length);
    for (let i = 8; i + 4 <= size; i += 4) if (ascii(i, "avif") || ascii(i, "avis")) return "avif";
  }
  return null;
}
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export class UploadError extends Error {}

/** Messages for rejected files; "{file}" is replaced with the file name. */
export type UploadMessages = { type: string; size: string };
const DEFAULT_UPLOAD_MESSAGES: UploadMessages = {
  type: "{file}: only JPG, PNG, WebP or AVIF images",
  size: "{file}: larger than 15 MB",
};

/** Saves an uploaded image and returns its public URL. */
export async function saveImage(file: File, folder: string, messages: UploadMessages = DEFAULT_UPLOAD_MESSAGES): Promise<string> {
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError(messages.size.replace("{file}", file.name));
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = detectImageType(bytes.subarray(0, 64));
  if (!ext) throw new UploadError(messages.type.replace("{file}", file.name));
  const safeFolder = folder.replace(/[^a-z0-9/_-]/gi, "");
  const name = `${Date.now()}-${randomBytes(6).toString("hex")}.${ext}`;
  const dir = path.join(UPLOAD_DIR, safeFolder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), bytes);
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
