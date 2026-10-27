import { test } from "node:test";
import assert from "node:assert/strict";
import { detectImageType } from "./media.ts";

const bytes = (...parts: (number[] | string)[]) =>
  new Uint8Array(parts.flatMap((p) => (typeof p === "string" ? [...p].map((c) => c.charCodeAt(0)) : p)));

test("recognises real image signatures", () => {
  assert.equal(detectImageType(bytes([0xff, 0xd8, 0xff, 0xe0, 0, 0x10])), "jpg");
  assert.equal(detectImageType(bytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0])), "png");
  assert.equal(detectImageType(bytes("RIFF", [0x24, 0, 0, 0], "WEBPVP8 ")), "webp");
  assert.equal(detectImageType(bytes([0, 0, 0, 0x1c], "ftypavif", [0, 0, 0, 0], "avifmif1miaf")), "avif");
  // AVIF only in the compatible brands
  assert.equal(detectImageType(bytes([0, 0, 0, 0x18], "ftypmif1", [0, 0, 0, 0], "mif1avif")), "avif");
});

test("rejects files that only claim to be images", () => {
  assert.equal(detectImageType(bytes("<script>alert(1)</script>")), null);
  assert.equal(detectImageType(bytes("%PDF-1.7")), null);
  assert.equal(detectImageType(bytes("RIFF", [0, 0, 0, 0], "WAVEfmt ")), null);
  // HEIC (iPhone) is ftyp but not AVIF
  assert.equal(detectImageType(bytes([0, 0, 0, 0x18], "ftypheic", [0, 0, 0, 0], "mif1heic")), null);
  assert.equal(detectImageType(new Uint8Array()), null);
});
