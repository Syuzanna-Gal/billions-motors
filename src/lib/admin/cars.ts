import { locales, type Locale } from "@/i18n/config";
import { getDb, type Tx } from "../db";
import type { ColourStock } from "../colour-stock";
import { deleteImageFile } from "../media";
import type { AdminDict } from "./i18n";
import type { BodyType, DriveType, FuelType, VehicleStatus } from "../types";
import { addDays, MAX_TRANSIT_DAYS, toIsoDate, today, transitDays } from "../transit";
import { filterOptions } from "../vehicles";

/* Everything the admin needs to list, edit, create and delete cars. */

export type L10n = Record<Locale, string>;

export interface CarFields {
  slug: string;
  brand: string;
  model: string;
  trim_level: string | null;
  year: number;
  status: VehicleStatus;
  fuel_type: FuelType;
  body_type: BodyType;
  drive: DriveType;
  horsepower: number;
  ev_range_km: number | null;
  battery_kwh: number | null;
  accel_0_100: number | null;
  top_speed_kmh: number | null;
  seats: number;
  length_mm: number | null;
  width_mm: number | null;
  height_mm: number | null;
  warranty_years: number;
  warranty_km: number;
  price_amd: number | null;
  price_warranty_amd: number | null;
  stock: number | null;
  /** Days until arrival, for cars in transit. Stored as a date, so it counts down by itself. */
  arrival_days: number | null;
  featured: boolean;
  published: boolean;
  interior_360_url: string | null;
  video_url: string | null;
  transmission: L10n;
  description: L10n;
}

export type ColorKind = "EXTERIOR" | "INTERIOR";

export interface AdminColor {
  id: number;
  kind: ColorKind;
  hex: string;
  position: number;
  name: L10n;
}

export interface AdminImage {
  id: number;
  url: string;
  kind: "EXTERIOR" | "INTERIOR";
  color_id: number | null;
  position: number;
  is_cover: boolean;
}

export interface CarForEdit extends CarFields {
  id: number;
  colors: AdminColor[];
  images: AdminImage[];
  related: number[];
  /** Stock per paint + interior; empty = the car is counted as a whole. */
  colorStock: ColourStock[];
}

export interface CarListItem {
  id: number;
  slug: string;
  name: string;
  brand: string;
  model: string;
  trim_level: string | null;
  year: number;
  status: VehicleStatus;
  stock: number | null;
  price_amd: number | null;
  arrival_date: string | null;
  published: boolean;
  featured: boolean;
  photos: number;
  /** Stock is the sum of the per-colour counts (edited on the car's page). */
  by_colour: boolean;
}

const emptyL10n = (): L10n => ({ hy: "", en: "", ru: "" });
export const carName = (r: { brand: string; model: string; trim_level: string | null }) =>
  [r.brand, r.model, r.trim_level].filter(Boolean).join(" ");

export async function listCarsAdmin(): Promise<CarListItem[]> {
  const db = await getDb();
  const rows = await db.query<Omit<CarListItem, "name">>(
    `SELECT v.id, v.slug, v.brand, v.model, v.trim_level, v.year, v.status, v.stock, v.price_amd, v.arrival_date, v.published, v.featured,
            (SELECT count(*)::int FROM vehicle_images i WHERE i.vehicle_id = v.id) AS photos,
            EXISTS (SELECT 1 FROM vehicle_color_stock s WHERE s.vehicle_id = v.id) AS by_colour
     FROM vehicles v ORDER BY v.brand, v.model, v.year DESC, v.id`,
  );
  return rows.map((r) => ({ ...r, arrival_date: toIsoDate(r.arrival_date), name: carName(r) }));
}

export async function getCarForEdit(id: number): Promise<CarForEdit | null> {
  const db = await getDb();
  const [v] = await db.query<Omit<CarFields, "transmission" | "description" | "arrival_days"> & { id: number; arrival_date: string | Date | null }>(
    "SELECT * FROM vehicles WHERE id = $1",
    [id],
  );
  if (!v) return null;
  const [translations, colors, colorNames, images, related, colorStock] = await Promise.all([
    db.query<{ locale: Locale; transmission: string | null; description: string | null }>(
      "SELECT locale, transmission, description FROM vehicle_translations WHERE vehicle_id = $1",
      [id],
    ),
    db.query<{ id: number; kind: ColorKind; hex: string; position: number }>(
      "SELECT id, kind, hex, position FROM vehicle_colors WHERE vehicle_id = $1 ORDER BY (kind = 'INTERIOR'), position, id",
      [id],
    ),
    db.query<{ color_id: number; locale: Locale; name: string }>(
      `SELECT ct.color_id, ct.locale, ct.name FROM vehicle_color_translations ct
       JOIN vehicle_colors c ON c.id = ct.color_id WHERE c.vehicle_id = $1`,
      [id],
    ),
    db.query<AdminImage>(
      "SELECT id, url, kind, color_id, position, is_cover FROM vehicle_images WHERE vehicle_id = $1 ORDER BY is_cover DESC, color_id NULLS FIRST, position, id",
      [id],
    ),
    db.query<{ related_id: number }>("SELECT related_id FROM vehicle_related WHERE vehicle_id = $1 ORDER BY position", [id]),
    getColorStock(id),
  ]);

  const transmission = emptyL10n();
  const description = emptyL10n();
  for (const t of translations) {
    transmission[t.locale] = t.transmission ?? "";
    description[t.locale] = t.description ?? "";
  }
  return {
    ...v,
    arrival_days: transitDays(v.status, v.arrival_date),
    transmission,
    description,
    colors: colors.map((c) => {
      const name = emptyL10n();
      for (const n of colorNames) if (n.color_id === c.id) name[n.locale] = n.name;
      return { ...c, name };
    }),
    images,
    related: related.map((r) => r.related_id),
    colorStock,
  };
}

/* ---------- Stock per colour ---------- */

export async function getColorStock(vehicleId: number, db: Pick<Tx, "query"> | null = null): Promise<ColourStock[]> {
  const q = db ?? (await getDb());
  return q.query<ColourStock>(
    `SELECT exterior_id AS "exteriorId", interior_id AS "interiorId", stock
     FROM vehicle_color_stock WHERE vehicle_id = $1`,
    [vehicleId],
  );
}

/**
 * For a car counted by colour, makes vehicles.stock the sum of its colours. `wasByColour`: the car
 * had colour rows before this change (if the change removed the last ones, the total becomes 0).
 */
export async function syncStock(tx: Tx, vehicleId: number, wasByColour = false) {
  const [{ rows, total }] = await tx.query<{ rows: number; total: number }>(
    "SELECT count(*)::int AS rows, coalesce(sum(stock), 0)::int AS total FROM vehicle_color_stock WHERE vehicle_id = $1",
    [vehicleId],
  );
  if (rows > 0 || wasByColour) {
    await tx.query("UPDATE vehicles SET stock = $1, updated_at = now() WHERE id = $2", [total, vehicleId]);
  }
}

const hasColourStock = async (tx: Tx, vehicleId: number) =>
  (await tx.query("SELECT 1 FROM vehicle_color_stock WHERE vehicle_id = $1 LIMIT 1", [vehicleId])).length > 0;

/**
 * Replaces the car's per-colour counts. `cells` null = stop counting by colour (the car keeps its
 * current total and is counted as a whole again). Returns the new total, or null if not by colour.
 */
export async function saveColorStock(vehicleId: number, cells: ColourStock[] | null): Promise<number | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Same lock as a sale, so a sale and an edit can't interleave.
    await tx.query("SELECT 1 FROM vehicles WHERE id = $1 FOR UPDATE", [vehicleId]);
    await tx.query("DELETE FROM vehicle_color_stock WHERE vehicle_id = $1", [vehicleId]);
    if (!cells) return null;
    // Only this car's own colours, each on the right side (paint / interior).
    const own = await tx.query<{ id: number; kind: ColorKind }>("SELECT id, kind FROM vehicle_colors WHERE vehicle_id = $1", [vehicleId]);
    const kindOf = new Map(own.map((c) => [c.id, c.kind]));
    const valid = cells.filter((c) =>
      kindOf.get(c.exteriorId) === "EXTERIOR" && (c.interiorId === null || kindOf.get(c.interiorId) === "INTERIOR"));
    for (const c of valid) {
      await tx.query(
        "INSERT INTO vehicle_color_stock (vehicle_id, exterior_id, interior_id, stock) VALUES ($1, $2, $3, $4)",
        [vehicleId, c.exteriorId, c.interiorId, c.stock],
      );
    }
    await syncStock(tx, vehicleId, true);
    return valid.reduce((sum, c) => sum + c.stock, 0);
  });
}

/* ---------- Form parsing ---------- */

export type FieldErrors = Partial<Record<string, string>>;

export function parseCarForm(form: FormData, msg: AdminDict["carForm"]["errors"]): { data: CarFields; errors: FieldErrors } {
  const errors: FieldErrors = {};
  const text = (k: string, max = 200) => String(form.get(k) ?? "").trim().slice(0, max);
  const num = (k: string, opts: { required?: boolean; int?: boolean; min?: number; max?: number } = {}) => {
    const raw = text(k).replace(/[\s,]/g, "");
    if (!raw) {
      if (opts.required) errors[k] = msg.required;
      return null;
    }
    const n = Number(raw);
    if (!Number.isFinite(n) || (opts.int && !Number.isInteger(n)) || (opts.min !== undefined && n < opts.min) || (opts.max !== undefined && n > opts.max)) {
      errors[k] = msg.invalidNumber;
      return null;
    }
    return n;
  };
  const pick = <T extends string>(k: string, allowed: readonly T[]) => {
    const v = text(k) as T;
    if (!allowed.includes(v)) errors[k] = msg.chooseValue;
    return v;
  };
  const l10n = (prefix: string, max: number): L10n =>
    Object.fromEntries(locales.map((l) => [l, text(`${prefix}_${l}`, max)])) as L10n;

  const httpsUrl = (k: string) => {
    const v = text(k, 500);
    if (v && !/^https:\/\/\S+$/.test(v)) errors[k] = msg.https;
    return v || null;
  };

  const brand = text("brand", 60);
  const model = text("model", 80);
  if (!brand) errors.brand = msg.required;
  if (!model) errors.model = msg.required;
  const stockMode = text("stock_mode");

  const data: CarFields = {
    slug: text("slug", 120).toLowerCase(),
    brand,
    model,
    trim_level: text("trim_level", 80) || null,
    year: num("year", { required: true, int: true, min: 2000, max: 2100 }) ?? 0,
    status: pick("status", filterOptions.status),
    fuel_type: pick("fuel_type", filterOptions.fuel),
    body_type: pick("body_type", filterOptions.body),
    drive: pick("drive", ["FWD", "RWD", "AWD"] as const),
    horsepower: num("horsepower", { required: true, int: true, min: 1, max: 3000 }) ?? 0,
    ev_range_km: num("ev_range_km", { int: true, min: 0, max: 3000 }),
    battery_kwh: num("battery_kwh", { min: 0, max: 500 }),
    accel_0_100: num("accel_0_100", { min: 0, max: 60 }),
    top_speed_kmh: num("top_speed_kmh", { int: true, min: 0, max: 500 }),
    seats: num("seats", { required: true, int: true, min: 1, max: 12 }) ?? 5,
    length_mm: num("length_mm", { int: true, min: 0, max: 10000 }),
    width_mm: num("width_mm", { int: true, min: 0, max: 5000 }),
    height_mm: num("height_mm", { int: true, min: 0, max: 5000 }),
    warranty_years: num("warranty_years", { required: true, int: true, min: 0, max: 20 }) ?? 3,
    warranty_km: num("warranty_km", { required: true, int: true, min: 0, max: 1_000_000 }) ?? 100000,
    price_amd: num("price_amd", { int: true, min: 1 }),
    price_warranty_amd: num("price_warranty_amd", { int: true, min: 1 }),
    // "colours": counted by colour — saveCar sets the total from the colours.
    stock: stockMode === "untracked" || stockMode === "colours" ? null : (num("stock", { required: true, int: true, min: 0, max: 999 }) ?? 0),
    arrival_days: num("arrival_days", { int: true, min: 1, max: MAX_TRANSIT_DAYS }),
    featured: form.get("featured") === "on",
    published: form.get("published") === "on",
    interior_360_url: httpsUrl("interior_360_url"),
    video_url: httpsUrl("video_url"),
    transmission: l10n("transmission", 80),
    description: l10n("description", 4000),
  };
  if (data.slug && !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.slug)) errors.slug = msg.slug;
  return { data, errors };
}

export function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

async function uniqueSlug(base: string, excludeId?: number): Promise<string> {
  const db = await getDb();
  let slug = base || "car";
  for (let i = 2; ; i++) {
    const rows = await db.query("SELECT 1 FROM vehicles WHERE slug = $1 AND id <> $2", [slug, excludeId ?? 0]);
    if (rows.length === 0) return slug;
    slug = `${base}-${i}`;
  }
}

/* ---------- Writes ---------- */

const COLUMNS = [
  "slug", "brand", "model", "trim_level", "year", "status", "fuel_type", "body_type", "drive", "horsepower",
  "ev_range_km", "battery_kwh", "accel_0_100", "top_speed_kmh", "seats", "length_mm", "width_mm", "height_mm",
  "warranty_years", "warranty_km", "price_amd", "price_warranty_amd", "stock", "featured", "published", "interior_360_url", "video_url",
] as const;

export async function saveCar(data: CarFields, id?: number): Promise<number> {
  const db = await getDb();
  data.slug = await uniqueSlug(data.slug || slugify(`${data.brand} ${data.model} ${data.trim_level ?? ""} ${data.year}`), id);
  // The countdown is stored as a date (only for cars in transit), so the site can count down daily.
  const arrivalDate = data.status === "IN_TRANSIT" && data.arrival_days ? addDays(today(), data.arrival_days) : null;
  const values = [...COLUMNS.map((c) => data[c]), arrivalDate];

  return db.transaction(async (tx) => {
    let vehicleId = id;
    if (vehicleId) {
      const sets = [...COLUMNS, "arrival_date"].map((c, i) => `${c} = $${i + 1}`).join(", ");
      await tx.query(`UPDATE vehicles SET ${sets}, updated_at = now() WHERE id = $${COLUMNS.length + 2}`, [...values, vehicleId]);
    } else {
      const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");
      const [row] = await tx.query<{ id: number }>(
        `INSERT INTO vehicles (${COLUMNS.join(", ")}, arrival_date) VALUES (${placeholders}) RETURNING id`,
        values,
      );
      vehicleId = row.id;
    }
    for (const l of locales) {
      await tx.query(
        `INSERT INTO vehicle_translations (vehicle_id, locale, transmission, description) VALUES ($1, $2, $3, $4)
         ON CONFLICT (vehicle_id, locale) DO UPDATE SET transmission = EXCLUDED.transmission, description = EXCLUDED.description`,
        [vehicleId, l, data.transmission[l] || null, data.description[l] || null],
      );
    }
    // Counted by colour: the total always comes from the colours, whatever the form sent.
    await syncStock(tx, vehicleId!);
    return vehicleId!;
  });
}

export async function deleteCar(id: number) {
  const db = await getDb();
  const images = await db.query<{ url: string }>("SELECT url FROM vehicle_images WHERE vehicle_id = $1", [id]);
  await db.query("DELETE FROM vehicles WHERE id = $1", [id]);
  await Promise.all(images.map((i) => deleteImageFile(i.url)));
}

export async function addColor(vehicleId: number, kind: ColorKind, hex: string, name: L10n) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [{ id }] = await tx.query<{ id: number }>(
      `INSERT INTO vehicle_colors (vehicle_id, kind, hex, position)
       VALUES ($1, $2, $3, (SELECT coalesce(max(position) + 1, 0) FROM vehicle_colors WHERE vehicle_id = $1 AND kind = $2)) RETURNING id`,
      [vehicleId, kind, hex],
    );
    for (const l of locales) {
      await tx.query("INSERT INTO vehicle_color_translations (color_id, locale, name) VALUES ($1, $2, $3)", [id, l, name[l] || name.en || hex]);
    }
  });
}

export async function updateColor(vehicleId: number, colorId: number, kind: ColorKind, hex: string, name: L10n, position: number) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [before] = await tx.query<{ kind: ColorKind }>(
      "SELECT kind FROM vehicle_colors WHERE id = $1 AND vehicle_id = $2 FOR UPDATE",
      [colorId, vehicleId],
    );
    if (!before) return;
    await tx.query("UPDATE vehicle_colors SET kind = $1, hex = $2, position = $3 WHERE id = $4", [kind, hex, position, colorId]);
    if (before.kind !== kind) {
      // A paint became an interior (or back): its stock combinations no longer make sense.
      const wasByColour = await hasColourStock(tx, vehicleId);
      await tx.query("DELETE FROM vehicle_color_stock WHERE exterior_id = $1 OR interior_id = $1", [colorId]);
      await syncStock(tx, vehicleId, wasByColour);
    }
    for (const l of locales) {
      await tx.query(
        `INSERT INTO vehicle_color_translations (color_id, locale, name) VALUES ($1, $2, $3)
         ON CONFLICT (color_id, locale) DO UPDATE SET name = EXCLUDED.name`,
        [colorId, l, name[l] || name.en || hex],
      );
    }
  });
}

export async function deleteColor(vehicleId: number, colorId: number) {
  const db = await getDb();
  const images = await db.query<{ url: string }>("SELECT url FROM vehicle_images WHERE color_id = $1 AND vehicle_id = $2", [colorId, vehicleId]);
  await db.transaction(async (tx) => {
    await tx.query("SELECT 1 FROM vehicles WHERE id = $1 FOR UPDATE", [vehicleId]);
    const wasByColour = await hasColourStock(tx, vehicleId);
    // Its stock rows go with it (ON DELETE CASCADE); the car's total follows.
    await tx.query("DELETE FROM vehicle_colors WHERE id = $1 AND vehicle_id = $2", [colorId, vehicleId]);
    await syncStock(tx, vehicleId, wasByColour);
  });
  await Promise.all(images.map((i) => deleteImageFile(i.url)));
}

export async function addImages(vehicleId: number, colorId: number | null, kind: "EXTERIOR" | "INTERIOR", urls: string[]) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [{ next }] = await tx.query<{ next: number }>(
      "SELECT coalesce(max(position) + 1, 0)::int AS next FROM vehicle_images WHERE vehicle_id = $1",
      [vehicleId],
    );
    for (const [i, url] of urls.entries()) {
      await tx.query("INSERT INTO vehicle_images (vehicle_id, color_id, kind, url, position) VALUES ($1, $2, $3, $4, $5)", [
        vehicleId, colorId, kind, url, next + i,
      ]);
    }
  });
}

export async function updateImage(vehicleId: number, imageId: number, colorId: number | null, kind: "EXTERIOR" | "INTERIOR", position: number) {
  const db = await getDb();
  await db.query("UPDATE vehicle_images SET color_id = $1, kind = $2, position = $3 WHERE id = $4 AND vehicle_id = $5", [
    colorId, kind, position, imageId, vehicleId,
  ]);
}

/** Makes this photo the one shown on catalogue cards (one cover per car). */
export async function setCover(vehicleId: number, imageId: number) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    const [img] = await tx.query("SELECT 1 FROM vehicle_images WHERE id = $1 AND vehicle_id = $2", [imageId, vehicleId]);
    if (!img) return;
    await tx.query("UPDATE vehicle_images SET is_cover = false WHERE vehicle_id = $1 AND is_cover", [vehicleId]);
    await tx.query("UPDATE vehicle_images SET is_cover = true WHERE id = $1", [imageId]);
  });
}

export async function deleteImage(vehicleId: number, imageId: number) {
  const db = await getDb();
  const [img] = await db.query<{ url: string }>("DELETE FROM vehicle_images WHERE id = $1 AND vehicle_id = $2 RETURNING url", [imageId, vehicleId]);
  if (img) await deleteImageFile(img.url);
}

export async function setRelated(vehicleId: number, relatedIds: number[]) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    await tx.query("DELETE FROM vehicle_related WHERE vehicle_id = $1", [vehicleId]);
    for (const [position, rid] of relatedIds.entries()) {
      if (rid === vehicleId) continue;
      await tx.query(
        "INSERT INTO vehicle_related (vehicle_id, related_id, position) VALUES ($1, $2, $3) ON CONFLICT DO NOTHING",
        [vehicleId, rid, position],
      );
    }
  });
}
