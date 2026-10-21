import type { Locale } from "@/i18n/config";
import { getDb, type Db } from "./db";
import type {
  BodyType, DriveType, FuelType, SortKey, Vehicle, VehicleColor, VehicleFilters, VehicleImage, VehicleStatus,
} from "./types";

/*
 * Data access for cars. Every page goes through these functions.
 * Only published cars are shown on the public site.
 */

interface VehicleRow {
  id: number; slug: string; brand: string; model: string; trim_level: string | null; year: number;
  status: VehicleStatus; fuel_type: FuelType; body_type: BodyType; drive: DriveType;
  horsepower: number; ev_range_km: number | null; battery_kwh: number | null; accel_0_100: number | null;
  top_speed_kmh: number | null; seats: number; length_mm: number | null; width_mm: number | null; height_mm: number | null;
  warranty_years: number; warranty_km: number; price_amd: number | null; featured: boolean; created_at: Date | string;
  transmission: string | null; description: string | null;
}

const SELECT_VEHICLE = `
  SELECT v.*, t.transmission, t.description
  FROM vehicles v
  LEFT JOIN vehicle_translations t ON t.vehicle_id = v.id AND t.locale = $1`;

const ORDER_BY: Record<SortKey, string> = {
  newest: "v.created_at DESC, v.id DESC",
  // Cars without a price ("contact for price") go last in both price orders.
  price_asc: "v.price_amd ASC NULLS LAST, v.created_at DESC",
  price_desc: "v.price_amd DESC NULLS LAST, v.created_at DESC",
};

export async function listVehicles(locale: Locale, filters: VehicleFilters = {}, limit = 200): Promise<Vehicle[]> {
  const db = await getDb();
  const where = ["v.published"];
  const params: unknown[] = [locale];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (filters.brand) add("v.brand = ?", filters.brand);
  if (filters.body) add("v.body_type = ?", filters.body);
  if (filters.fuel) add("v.fuel_type = ?", filters.fuel);
  if (filters.status) add("v.status = ?", filters.status);
  params.push(limit);

  const rows = await db.query<VehicleRow & Record<string, unknown>>(
    `${SELECT_VEHICLE} WHERE ${where.join(" AND ")} ORDER BY ${ORDER_BY[filters.sort ?? "newest"]} LIMIT $${params.length}`,
    params,
  );
  return hydrate(db, rows, locale);
}

export async function getVehicle(slug: string, locale: Locale): Promise<Vehicle | null> {
  const db = await getDb();
  const rows = await db.query<VehicleRow & Record<string, unknown>>(`${SELECT_VEHICLE} WHERE v.slug = $2 AND v.published`, [
    locale,
    slug,
  ]);
  return (await hydrate(db, rows, locale))[0] ?? null;
}

export async function getFeatured(locale: Locale, limit = 3): Promise<Vehicle[]> {
  const db = await getDb();
  const rows = await db.query<VehicleRow & Record<string, unknown>>(
    `${SELECT_VEHICLE} WHERE v.published ORDER BY v.featured DESC, v.created_at DESC LIMIT $2`,
    [locale, limit],
  );
  return hydrate(db, rows, locale);
}

export async function getSimilar(vehicle: Vehicle, locale: Locale, limit = 3): Promise<Vehicle[]> {
  const db = await getDb();
  const rows = await db.query<VehicleRow & Record<string, unknown>>(
    `${SELECT_VEHICLE} WHERE v.published AND v.id <> $2 AND v.body_type = $3 ORDER BY v.created_at DESC LIMIT $4`,
    [locale, vehicle.id, vehicle.bodyType, limit],
  );
  return hydrate(db, rows, locale);
}

export async function getBrands(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.query<{ brand: string }>("SELECT DISTINCT brand FROM vehicles WHERE published ORDER BY brand");
  return rows.map((r) => r.brand);
}

export async function getAllSlugs(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.query<{ slug: string }>("SELECT slug FROM vehicles WHERE published ORDER BY created_at DESC");
  return rows.map((r) => r.slug);
}

/** Loads colours and photos for a batch of cars in two queries (no N+1). */
async function hydrate(db: Db, rows: VehicleRow[], locale: Locale): Promise<Vehicle[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);

  const [colorRows, imageRows] = await Promise.all([
    db.query<{ id: number; vehicle_id: number; hex: string; name: string | null }>(
      `SELECT c.id, c.vehicle_id, c.hex, ct.name
       FROM vehicle_colors c
       LEFT JOIN vehicle_color_translations ct ON ct.color_id = c.id AND ct.locale = $2
       WHERE c.vehicle_id = ANY($1::int[])
       ORDER BY c.vehicle_id, c.position, c.id`,
      [ids, locale],
    ),
    db.query<{ vehicle_id: number; color_id: number | null; kind: VehicleImage["kind"]; url: string; alt: string | null }>(
      `SELECT vehicle_id, color_id, kind, url, alt FROM vehicle_images
       WHERE vehicle_id = ANY($1::int[])
       ORDER BY vehicle_id, position, id`,
      [ids],
    ),
  ]);

  const colorsByVehicle = new Map<number, VehicleColor[]>();
  const colorById = new Map<number, VehicleColor>();
  for (const c of colorRows) {
    const color: VehicleColor = { id: c.id, name: c.name ?? c.hex, hex: c.hex, images: [] };
    colorById.set(c.id, color);
    colorsByVehicle.set(c.vehicle_id, [...(colorsByVehicle.get(c.vehicle_id) ?? []), color]);
  }

  const imagesByVehicle = new Map<number, VehicleImage[]>();
  for (const img of imageRows) {
    const image: VehicleImage = { url: img.url, kind: img.kind, alt: img.alt ?? undefined };
    if (img.color_id != null) colorById.get(img.color_id)?.images.push(image);
    else imagesByVehicle.set(img.vehicle_id, [...(imagesByVehicle.get(img.vehicle_id) ?? []), image]);
  }

  return rows.map((r) => {
    const colors = colorsByVehicle.get(r.id) ?? [];
    // Cards use images[0]: general photos first, else the first colour's photos.
    const general = imagesByVehicle.get(r.id) ?? [];
    return {
      id: r.id,
      slug: r.slug,
      brand: r.brand,
      model: r.model,
      trim: r.trim_level,
      year: r.year,
      status: r.status,
      fuelType: r.fuel_type,
      bodyType: r.body_type,
      drive: r.drive,
      transmission: r.transmission,
      description: r.description,
      horsepower: r.horsepower,
      evRangeKm: r.ev_range_km,
      batteryKwh: r.battery_kwh,
      accel0100: r.accel_0_100,
      topSpeedKmh: r.top_speed_kmh,
      seats: r.seats,
      lengthMm: r.length_mm,
      widthMm: r.width_mm,
      heightMm: r.height_mm,
      warrantyYears: r.warranty_years,
      warrantyKm: r.warranty_km,
      priceAmd: r.price_amd,
      featured: r.featured,
      images: general.length ? general : (colors.find((c) => c.images.length)?.images ?? []),
      colors,
      createdAt: new Date(r.created_at).toISOString(),
    };
  });
}

const BODY: BodyType[] = ["SEDAN", "CROSSOVER", "SUV", "HATCHBACK", "MPV", "PICKUP"];
const FUEL: FuelType[] = ["ELECTRIC", "EREV", "PHEV", "HYBRID", "PETROL"];
const STATUS: VehicleStatus[] = ["IN_STOCK", "IN_TRANSIT", "PRE_ORDER"];
const SORT: SortKey[] = ["newest", "price_asc", "price_desc"];

export const filterOptions = { body: BODY, fuel: FUEL, status: STATUS, sort: SORT };

/** Turns untrusted query-string values into a typed filter object. */
export function parseFilters(params: Record<string, string | string[] | undefined>): VehicleFilters {
  const one = (k: string) => {
    const v = params[k];
    return typeof v === "string" && v.length > 0 ? v.slice(0, 100) : undefined;
  };
  const pick = <T extends string>(value: string | undefined, allowed: readonly T[]) =>
    value && (allowed as readonly string[]).includes(value) ? (value as T) : undefined;

  return {
    brand: one("brand"),
    body: pick(one("body"), BODY),
    fuel: pick(one("fuel"), FUEL),
    status: pick(one("status"), STATUS),
    sort: pick(one("sort"), SORT),
  };
}
