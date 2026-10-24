#!/usr/bin/env node
/*
 * Imports the China Motors export (vehicles.csv, vehicle_images.csv, images/, vehicle_colors.csv)
 * into the Billions Motors database and photo folder.
 *
 *   node scripts/import-chinamotors.mjs --dir ~/Downloads/Archive --colors ~/Downloads/vehicle_colors.csv
 *       Check only: reads everything, prints what would be imported and every fix applied. Changes nothing.
 *
 *   ... --apply                 Import. Cars imported before (same source id) are skipped, so re-running is safe.
 *   ... --apply --remove-demo   Also delete the demo cars and the test sales/requests made with them.
 *
 * Reads DATABASE_URL and UPLOAD_DIR from the environment or .env.local. Start the site once first so
 * the database has migration 003. Needs no packages beyond the app's own `pg`.
 */

import { copyFile, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const SOURCE = "chinamotors";

/* ------------------------------------------------------------------ CSV */

/** RFC 4180 CSV → array of objects keyed by the header row. Handles quotes, "" and newlines in fields. */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += ch;
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  const [header, ...body] = rows.filter((r) => r.length > 1 || r[0] !== "");
  const keys = header.map((h) => h.replace(/^﻿/, "").trim());
  return body.map((r) => Object.fromEntries(keys.map((k, i) => [k, r[i] ?? ""])));
}

/* ------------------------------------------------------------------ mapping rules */

// Brand spellings in the export → how the site shows them.
const BRANDS = {
  ZEEKR: "Zeekr", AUDI: "Audi", Li: "Li Auto", Leap: "Leapmotor", "X-Peng": "XPeng",
  "Lynk&Co": "Lynk & Co", Im: "IM", Saic: "SAIC",
};
// BYD group brands whose "DM" cars are plug-in hybrids (the export calls them range-extended).
const BYD_GROUP = new Set(["BYD", "Denza", "Leopard", "Yangwang"]);
const PHEV_NAME = /\bDM(?:-?[ip])?\b/i;

const STATUS = { AVAILABLE: "IN_STOCK", IN_STOCK: "IN_STOCK", IN_TRANSIT: "IN_TRANSIT", PRE_ORDER: "PRE_ORDER" };
const BODY = { SEDAN: "SEDAN", CROSSOVER: "CROSSOVER", SUV: "SUV", HATCHBACK: "HATCHBACK", WAGON: "WAGON", MINIVAN: "MPV", MPV: "MPV", PICKUP: "PICKUP" };
const DRIVE = { FWD: "FWD", RWD: "RWD", AWD: "AWD", FOUR_WD: "AWD" };
const FUEL = { ELECTRIC: "ELECTRIC", RANGE_EXTENDED_HYBRID: "EREV", PLUG_IN_HYBRID: "PHEV", PHEV: "PHEV", HYBRID: "HYBRID", PETROL: "PETROL", GASOLINE: "PETROL" };
const TRANSMISSION = {
  SINGLE_SPEED: { en: "Single speed", hy: "Մեկ աստիճանով", ru: "Одноступенчатая" },
};
const DEFAULT_HEX = "#8a8d92";
const LOCALES = ["hy", "en", "ru"];

const clean = (s) => (s ?? "").replace(/\s+/g, " ").trim();
/** "Sea Lion 06 2026" → "Sea Lion 06", "Qin L DM- 2025" → "Qin L DM". */
export const stripYear = (s) => clean(clean(s).replace(/(?:\s+(?:19|20)\d{2})+$/, "")).replace(/[\s-]+$/, "");
const num = (v) => {
  const s = clean(v);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const int = (v) => (num(v) === null ? null : Math.round(num(v)));
const positive = (v) => (v !== null && v > 0 ? v : null);
const bool = (v) => clean(v).toLowerCase() === "t" || clean(v).toLowerCase() === "true";
const https = (v) => (/^https:\/\/\S+$/.test(clean(v)) ? clean(v) : null);

export function slugify(s) {
  return s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
}

/** "comet white" → "Comet White", "Alpine Gray 1.08.2025" → "Alpine Gray", "astroturf 2025" → "Astroturf". */
export function cleanColorName(name) {
  let n = clean(name).replace(/\s+\d{1,2}\.\d{1,2}\.\d{2,4}$/, "").replace(/\s+(?:19|20)\d{2}$/, "");
  n = clean(n);
  if (n && n === n.toLowerCase()) n = n.replace(/(^|[\s(-])(\p{L})/gu, (_, sep, ch) => sep + ch.toUpperCase());
  return n;
}

/**
 * One vehicles.csv row → the car to insert, plus notes about every fix and reasons to hide it.
 * Pure: no I/O, so it can be checked in a dry run.
 */
export function mapVehicle(row) {
  const notes = [];
  const hide = [];

  const rawBrand = clean(row.brand);
  const brand = BRANDS[rawBrand] ?? rawBrand;
  if (brand !== rawBrand) notes.push(`brand "${rawBrand}" → "${brand}"`);
  const model = stripYear(row.model);
  if (model !== clean(row.model)) notes.push(`model "${clean(row.model)}" → "${model}"`);
  const trim = stripYear(row.trim) || null;

  let fuel = FUEL[clean(row.fuel_type)] ?? null;
  const name = `${model} ${trim ?? ""}`;
  if (fuel === "EREV" && BYD_GROUP.has(brand) && PHEV_NAME.test(name)) {
    fuel = "PHEV";
    notes.push("fuel range-extended → plug-in hybrid (DM)");
  }
  if (!fuel) {
    // Required by the database: make a best guess and hide the car until someone checks it.
    fuel = PHEV_NAME.test(name) ? "PHEV" : (num(row.ev_range_km) ?? 0) >= 350 ? "ELECTRIC" : "EREV";
    hide.push(`fuel type missing (guessed ${fuel})`);
  }
  let drive = DRIVE[clean(row.drive_type)];
  if (!drive) {
    drive = "FWD";
    hide.push("drive type missing (guessed FWD)");
  }
  const body = BODY[clean(row.body_type)];
  if (!body) hide.push(`unknown body type "${row.body_type}"`);
  const status = STATUS[clean(row.availability_status)] ?? "PRE_ORDER";
  const horsepower = positive(int(row.horsepower));
  if (!horsepower) hide.push("horsepower missing");

  const price = bool(row.contact_for_price) ? null : positive(int(row.price_amd));
  const year = int(row.year);

  return {
    sourceId: clean(row.id),
    brand,
    model,
    trim,
    year,
    status,
    fuel,
    body: body ?? "CROSSOVER",
    drive,
    horsepower: horsepower ?? 1,
    evRange: positive(int(row.ev_range_km)),
    battery: positive(num(row.battery_capacity_kwh)),
    accel: positive(num(row.acceleration_sec)),
    topSpeed: positive(int(row.max_speed_kmh)),
    seats: positive(int(row.seats)) ?? 5,
    length: positive(int(row.length_mm)),
    width: positive(int(row.width_mm)),
    height: positive(int(row.height_mm)),
    warrantyYears: int(row.warranty_years) ?? 3,
    warrantyKm: int(row.warranty_km) ?? 100000,
    price,
    featured: bool(row.is_featured),
    interior360: https(row.interior_360_url),
    video: https(row.video_url),
    transmission: TRANSMISSION[clean(row.transmission)] ?? null,
    createdAt: clean(row.created_at) || null,
    notes,
    hide,
  };
}

/**
 * Photos and colours for one car. Colours come from the photos' colour names (exterior → paint,
 * interior → trim), in photo order, with the cover photo's colour first.
 */
export function mapPhotos(imageRows, files, hexByName) {
  const notes = [];
  const rows = [...imageRows].sort((a, b) => (int(a.sort_order) ?? 0) - (int(b.sort_order) ?? 0) || Number(a.id) - Number(b.id));
  const colors = new Map(); // key "KIND|name" → colour
  const photos = [];
  let missing = 0;

  for (const r of rows) {
    const file = files.get(clean(r.id));
    if (!file) {
      missing++;
      continue;
    }
    const kind = clean(r.image_category).toLowerCase() === "interior" ? "INTERIOR" : "EXTERIOR";
    const name = cleanColorName(r.color_name);
    let colorKey = null;
    if (name) {
      colorKey = `${kind}|${name.toLowerCase()}`;
      if (!colors.has(colorKey)) {
        const hex = hexByName.get(clean(r.color_name).toLowerCase()) ?? hexByName.get(name.toLowerCase()) ?? DEFAULT_HEX;
        colors.set(colorKey, { key: colorKey, kind, name, hex: /^#[0-9a-f]{6}$/i.test(hex) ? hex.toLowerCase() : DEFAULT_HEX });
      }
    }
    photos.push({ sourceId: clean(r.id), file, kind, colorKey, cover: bool(r.is_cover), position: photos.length });
  }
  if (missing) notes.push(`${missing} photo(s) listed without a file`);

  // Exactly one cover: the export's, else the first exterior photo.
  let cover = photos.find((p) => p.cover) ?? photos.find((p) => p.kind === "EXTERIOR") ?? photos[0];
  for (const p of photos) p.cover = p === cover;

  // The cover's paint colour first, so the car page opens on the same colour as the card.
  const list = [...colors.values()];
  const coverColor = cover?.colorKey ? colors.get(cover.colorKey) : null;
  if (coverColor?.kind === "EXTERIOR") {
    list.splice(list.indexOf(coverColor), 1);
    list.unshift(coverColor);
  }
  return { colors: list, photos, notes };
}

/* ------------------------------------------------------------------ plan */

export function buildPlan({ vehicles, images, colors, files }) {
  const hexByName = new Map(colors.map((c) => [clean(c.name).toLowerCase(), clean(c.hex)]));
  const imagesByVehicle = new Map();
  for (const r of images) imagesByVehicle.set(clean(r.vehicle_id), [...(imagesByVehicle.get(clean(r.vehicle_id)) ?? []), r]);

  return vehicles.map((row) => {
    const car = mapVehicle(row);
    const media = mapPhotos(imagesByVehicle.get(car.sourceId) ?? [], files, hexByName);
    if (media.photos.length === 0) car.hide.push("no photos");
    return { ...car, ...media, notes: [...car.notes, ...media.notes] };
  });
}

function report(plan) {
  const count = (f) => plan.filter(f).length;
  const photos = plan.reduce((n, c) => n + c.photos.length, 0);
  const lines = [
    `Cars: ${plan.length}  (shown ${count((c) => !c.hide.length)}, hidden for review ${count((c) => c.hide.length)})`,
    `Photos: ${photos}  · colours: ${plan.reduce((n, c) => n + c.colors.filter((k) => k.kind === "EXTERIOR").length, 0)} paint, ` +
      `${plan.reduce((n, c) => n + c.colors.filter((k) => k.kind === "INTERIOR").length, 0)} interior`,
    `With price: ${count((c) => c.price)} · featured: ${count((c) => c.featured)} · with 360° link: ${count((c) => c.interior360)}`,
    `Status: ${["IN_STOCK", "IN_TRANSIT", "PRE_ORDER"].map((s) => `${s} ${count((c) => c.status === s)}`).join(", ")}`,
    `Fuel: ${["ELECTRIC", "EREV", "PHEV", "HYBRID", "PETROL"].map((s) => `${s} ${count((c) => c.fuel === s)}`).join(", ")}`,
    "",
    "Hidden until checked in the admin:",
    ...plan.filter((c) => c.hide.length).map((c) => `  - ${c.brand} ${c.model} ${c.trim ?? ""} (#${c.sourceId}): ${c.hide.join("; ")}`),
    "",
    "Fixes applied:",
  ];
  const fixes = new Map();
  for (const c of plan) for (const n of c.notes) fixes.set(n.replace(/\d+ photo/, "N photo"), (fixes.get(n.replace(/\d+ photo/, "N photo")) ?? 0) + 1);
  for (const [n, k] of [...fixes].sort((a, b) => b[1] - a[1])) lines.push(`  ${String(k).padStart(4)} × ${n}`);
  return lines.join("\n");
}

/* ------------------------------------------------------------------ apply */

const DEMO_SLUGS = [
  "deepal-s09-4wd-ultra-2026", "byd-seal-06-dm-i-2026", "zeekr-7x-4wd-ultra-2026", "li-l7-ultra-2026",
  "changan-a07-550-2026", "byd-sea-lion-05-520-2025", "zeekr-007-4wd-ultra-2026", "deepal-s07-dm-2026",
  "changan-qiyuan-q05-506-2026",
];

async function removeDemo(db, uploadDir) {
  const demo = await db.query("SELECT id FROM vehicles WHERE source IS NULL AND slug = ANY($1)", [DEMO_SLUGS]);
  const ids = demo.rows.map((r) => r.id);
  if (ids.length === 0) return 0;
  await db.query("BEGIN");
  try {
    await db.query("DELETE FROM sales WHERE vehicle_id = ANY($1) OR vehicle_id IS NULL", [ids]);
    await db.query("DELETE FROM leads WHERE vehicle_id = ANY($1)", [ids]);
    await db.query("DELETE FROM vehicles WHERE id = ANY($1)", [ids]);
    await db.query("COMMIT");
  } catch (err) {
    await db.query("ROLLBACK");
    throw err;
  }
  for (const id of ids) await rm(path.join(uploadDir, "vehicles", String(id)), { recursive: true, force: true });
  return ids.length;
}

async function insertCar(db, car, uploadDir, slugs) {
  let slug = slugify(`${car.brand} ${car.model} ${car.trim ?? ""} ${car.year}`) || "car";
  for (let i = 2; slugs.has(slug); i++) slug = `${slugify(`${car.brand} ${car.model} ${car.trim ?? ""} ${car.year}`)}-${i}`;

  await db.query("BEGIN");
  let vehicleId;
  try {
    const { rows: [v] } = await db.query(
      `INSERT INTO vehicles (slug, brand, model, trim_level, year, status, fuel_type, body_type, drive, horsepower,
         ev_range_km, battery_kwh, accel_0_100, top_speed_kmh, seats, length_mm, width_mm, height_mm, warranty_years,
         warranty_km, price_amd, stock, featured, published, interior_360_url, video_url, source, source_id, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,NULL,$22,$23,$24,$25,$26,$27,
         coalesce($28::timestamptz, now()))
       RETURNING id`,
      [slug, car.brand, car.model, car.trim, car.year, car.status, car.fuel, car.body, car.drive, car.horsepower,
        car.evRange, car.battery, car.accel, car.topSpeed, car.seats, car.length, car.width, car.height, car.warrantyYears,
        car.warrantyKm, car.price, car.featured, car.hide.length === 0, car.interior360, car.video, SOURCE, car.sourceId,
        car.createdAt],
    );
    vehicleId = v.id;
    for (const l of LOCALES) {
      await db.query("INSERT INTO vehicle_translations (vehicle_id, locale, transmission) VALUES ($1, $2, $3)", [
        vehicleId, l, car.transmission?.[l] ?? null,
      ]);
    }
    const colorIds = new Map();
    for (const [position, c] of car.colors.entries()) {
      const { rows: [row] } = await db.query(
        "INSERT INTO vehicle_colors (vehicle_id, kind, hex, position) VALUES ($1, $2, $3, $4) RETURNING id",
        [vehicleId, c.kind, c.hex, position],
      );
      colorIds.set(c.key, row.id);
      // Names come in English only; shown as-is in every language until translated in the admin.
      for (const l of LOCALES) {
        await db.query("INSERT INTO vehicle_color_translations (color_id, locale, name) VALUES ($1, $2, $3)", [row.id, l, c.name]);
      }
    }

    const dir = path.join(uploadDir, "vehicles", String(vehicleId));
    await mkdir(dir, { recursive: true });
    const values = [];
    const params = [];
    for (const p of car.photos) {
      const name = `${p.sourceId}${path.extname(p.file).toLowerCase()}`;
      await copyFile(p.file, path.join(dir, name));
      params.push(vehicleId, p.colorKey ? colorIds.get(p.colorKey) : null, p.kind, `/api/media/vehicles/${vehicleId}/${name}`,
        p.position, p.sourceId, p.cover);
      const b = params.length - 7;
      values.push(`($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7})`);
    }
    if (values.length) {
      await db.query(
        `INSERT INTO vehicle_images (vehicle_id, color_id, kind, url, position, source_id, is_cover) VALUES ${values.join(",")}`,
        params,
      );
    }
    await db.query("COMMIT");
    slugs.add(slug);
    return { slug, vehicleId };
  } catch (err) {
    await db.query("ROLLBACK");
    if (vehicleId) await rm(path.join(uploadDir, "vehicles", String(vehicleId)), { recursive: true, force: true });
    throw err;
  }
}

/* ------------------------------------------------------------------ CLI */

function loadEnv(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const m = /^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/.exec(line);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^(['"])(.*)\1$/, "$2");
  }
}

const expandHome = (p) => (p?.startsWith("~/") ? path.join(process.env.HOME ?? "", p.slice(2)) : p);

async function main() {
  const args = process.argv.slice(2);
  const opt = (name) => {
    const i = args.indexOf(name);
    return i >= 0 ? expandHome(args[i + 1]) : undefined;
  };
  const dir = opt("--dir");
  const colorsFile = opt("--colors") ?? (dir ? path.join(dir, "..", "vehicle_colors.csv") : undefined);
  const apply = args.includes("--apply");
  if (!dir || !existsSync(path.join(dir, "vehicles.csv"))) {
    console.error("Usage: node scripts/import-chinamotors.mjs --dir <folder with vehicles.csv> [--colors vehicle_colors.csv] [--apply] [--remove-demo]");
    process.exit(1);
  }
  const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  loadEnv(path.join(projectRoot, ".env.local"));
  loadEnv(path.join(projectRoot, ".env"));

  const [vehicles, images, colors, fileNames] = await Promise.all([
    readFile(path.join(dir, "vehicles.csv"), "utf8").then(parseCsv),
    readFile(path.join(dir, "vehicle_images.csv"), "utf8").then(parseCsv),
    colorsFile && existsSync(colorsFile) ? readFile(colorsFile, "utf8").then(parseCsv) : [],
    readdir(path.join(dir, "images")),
  ]);
  // Photo files are named <id>.<ext>; ignore macOS "._" metadata files.
  const files = new Map(
    fileNames.filter((f) => !f.startsWith(".") && /^\d+\.(webp|jpe?g|png|avif)$/i.test(f))
      .map((f) => [f.replace(/\.[^.]+$/, ""), path.join(dir, "images", f)]),
  );

  const plan = buildPlan({ vehicles, images, colors, files });
  console.log(report(plan));
  if (!apply) {
    console.log("\nCheck only — nothing was changed. Add --apply to import.");
    return;
  }

  if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is not set (.env.local).");
  const uploadDir = path.resolve(projectRoot, process.env.UPLOAD_DIR ?? ".data/uploads");
  const pg = await import("pg");
  const db = new (pg.default ?? pg).Client({ connectionString: process.env.DATABASE_URL });
  await db.connect();
  try {
    const { rows: [m] } = await db.query("SELECT 1 AS ok FROM schema_migrations WHERE id = '003_real_catalogue'");
    if (!m) throw new Error("The database doesn't have migration 003 yet. Start the site once (npm run dev), then re-run.");

    if (args.includes("--remove-demo")) console.log(`\nRemoved ${await removeDemo(db, uploadDir)} demo car(s) and their test sales/requests.`);

    const done = new Set((await db.query("SELECT source_id FROM vehicles WHERE source = $1", [SOURCE])).rows.map((r) => r.source_id));
    const slugs = new Set((await db.query("SELECT slug FROM vehicles")).rows.map((r) => r.slug));
    const todo = plan.filter((c) => !done.has(c.sourceId));
    console.log(`\nImporting ${todo.length} car(s) (${plan.length - todo.length} already imported, skipped) into ${uploadDir}`);

    let imported = 0;
    const failed = [];
    for (const car of todo) {
      try {
        await insertCar(db, car, uploadDir, slugs);
        imported++;
        if (imported % 25 === 0 || imported === todo.length) console.log(`  ${imported}/${todo.length}`);
      } catch (err) {
        failed.push(`${car.brand} ${car.model} (#${car.sourceId}): ${err.message}`);
      }
    }
    console.log(`\nDone: ${imported} imported, ${failed.length} failed.`);
    for (const f of failed) console.log(`  ✗ ${f}`);
    if (failed.length) process.exitCode = 1;
  } finally {
    await db.end();
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((err) => {
    console.error(`\nImport stopped: ${err.message}`);
    process.exit(1);
  });
}
