import type { Locale } from "@/i18n/config";
import { getDb, type Db } from "./db";
import { MAX_QUERY_LENGTH, MIN_QUERY_LENGTH, rankCars } from "./search";
import type {
  BodyType, DriveType, FuelType, SortKey, Vehicle, VehicleColor, VehicleFilters, VehicleImage, VehicleStatus,
} from "./types";

/*
 * Data access for cars. Every page goes through these functions.
 * The public site shows published cars that aren't sold out (stock NULL = not counted).
 */
const VISIBLE = "v.published AND (v.stock IS NULL OR v.stock > 0)";

interface VehicleRow {
  id: number; slug: string; brand: string; model: string; trim_level: string | null; year: number;
  status: VehicleStatus; fuel_type: FuelType; body_type: BodyType; drive: DriveType;
  horsepower: number; ev_range_km: number | null; battery_kwh: number | null; accel_0_100: number | null;
  top_speed_kmh: number | null; seats: number; length_mm: number | null; width_mm: number | null; height_mm: number | null;
  warranty_years: number; warranty_km: number; price_amd: number | null; stock: number | null;
  interior_360_url: string | null; video_url: string | null; featured: boolean; created_at: Date | string;
  transmission: string | null; description: string | null;
}

const SELECT_VEHICLE = `
  SELECT v.*, t.transmission, t.description
  FROM vehicles v
  LEFT JOIN vehicle_translations t ON t.vehicle_id = v.id AND t.locale = $1`;

const ORDER_BY: Record<SortKey, string> = {
  // Outside a search there's nothing to rank by: same as newest. The default listing order.
  relevance: "v.featured DESC, v.created_at DESC, v.id DESC",
  newest: "v.created_at DESC, v.id DESC",
  // Cars without a price ("contact for price") go last in both price orders.
  price_asc: "v.price_amd ASC NULLS LAST, v.created_at DESC",
  price_desc: "v.price_amd DESC NULLS LAST, v.created_at DESC",
};

/** WHERE conditions for the catalogue filters; appends their values to `params`. */
function filterConditions(filters: VehicleFilters, params: unknown[]): string[] {
  const where = [VISIBLE];
  const add = (sql: string, value: unknown) => {
    params.push(value);
    where.push(sql.replace("?", `$${params.length}`));
  };
  if (filters.brand) add("v.brand = ?", filters.brand);
  if (filters.body) add("v.body_type = ?", filters.body);
  if (filters.fuel) add("v.fuel_type = ?", filters.fuel);
  if (filters.status) add("v.status = ?", filters.status);
  return where;
}

export interface Page {
  limit: number;
  offset: number;
}

/** One page of the catalogue plus the total for pagination (one query via a window count). */
export async function listVehicles(
  locale: Locale,
  filters: VehicleFilters = {},
  { limit, offset }: Page = { limit: 200, offset: 0 },
): Promise<{ cars: Vehicle[]; total: number }> {
  const db = await getDb();
  const params: unknown[] = [locale];
  const where = filterConditions(filters, params);
  params.push(limit, offset);

  const rows = await db.query<VehicleRow & { total: number }>(
    `${SELECT_VEHICLE.replace("SELECT v.*,", "SELECT v.*, count(*) OVER ()::int AS total,")}
     WHERE ${where.join(" AND ")} ORDER BY ${ORDER_BY[filters.sort ?? "newest"]}
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params,
  );
  // An offset past the end returns no rows (and no total): count separately only then.
  const total = rows[0]?.total ?? (offset > 0 ? await countVehicles(db, filters) : 0);
  return { cars: await hydrate(db, rows, locale), total };
}

async function countVehicles(db: Db, filters: VehicleFilters): Promise<number> {
  const params: unknown[] = [];
  const where = filterConditions(filters, params);
  const [{ n }] = await db.query<{ n: number }>(`SELECT count(*)::int AS n FROM vehicles v WHERE ${where.join(" AND ")}`, params);
  return n;
}

export interface SearchResults {
  /** Cars matching every word of the query. */
  matches: Vehicle[];
  /** Close but not exact (other models of the brand, bigger typos). */
  similar: Vehicle[];
  /** Number of matching cars, before paging. */
  total: number;
}

/**
 * Search by name within the catalogue filters. Two light queries: the names of the visible
 * cars (ranked in memory by lib/search), then card details for only the cars on this page.
 * Matches are best-first unless the visitor picked another sort; similar cars come with
 * the first page only.
 */
export async function searchVehicles(
  locale: Locale,
  filters: VehicleFilters,
  { limit = 24, offset = 0, similarLimit = 6 }: Partial<Page> & { similarLimit?: number } = {},
): Promise<SearchResults> {
  const query = (filters.q ?? "").trim();
  if (query.length < MIN_QUERY_LENGTH) return { matches: [], similar: [], total: 0 };

  const db = await getDb();
  const params: unknown[] = [];
  const where = filterConditions(filters, params);
  const names = await db.query<SortableName>(
    `SELECT v.id, v.brand, v.model, v.trim_level, v.year, v.price_amd, v.created_at FROM vehicles v
     WHERE ${where.join(" AND ")} ORDER BY ${ORDER_BY.relevance}`,
    params,
  );
  const ranked = rankCars(
    query,
    names.map((r) => ({ id: r.id, brand: r.brand, model: r.model, trim: r.trim_level, year: r.year })),
    { limit: Number.MAX_SAFE_INTEGER, similarLimit },
  );

  // A chosen sort applies to all matches before paging, so page 2 continues page 1.
  let matchIds = ranked.matches;
  if (filters.sort && filters.sort !== "relevance") {
    const byId = new Map(names.map((n) => [n.id, n]));
    matchIds = [...matchIds].sort((a, b) => SORTERS[filters.sort as Exclude<SortKey, "relevance">](byId.get(a)!, byId.get(b)!));
  }
  const pageIds = matchIds.slice(offset, offset + limit);
  const similarIds = offset === 0 ? ranked.similar : [];

  const cars = await vehiclesByIds(db, locale, [...pageIds, ...similarIds]);
  const pick = (ids: number[]) => ids.flatMap((id) => cars.get(id) ?? []);
  return { matches: pick(pageIds), similar: pick(similarIds), total: ranked.total };
}

type SortableName = {
  id: number; brand: string; model: string; trim_level: string | null; year: number;
  price_amd: number | null; created_at: Date | string;
};

/** Card details for the given cars, keyed by id. */
async function vehiclesByIds(db: Db, locale: Locale, ids: number[]): Promise<Map<number, Vehicle>> {
  if (ids.length === 0) return new Map();
  const rows = await db.query<VehicleRow & Record<string, unknown>>(`${SELECT_VEHICLE} WHERE v.id = ANY($2::int[])`, [locale, ids]);
  return new Map((await hydrate(db, rows, locale)).map((v) => [v.id, v]));
}

// In-memory equivalents of ORDER_BY, for sorting search matches. Cars without a price go last.
const byPrice = (dir: 1 | -1) => (a: SortableName, b: SortableName) =>
  a.price_amd == null ? (b.price_amd == null ? 0 : 1) : b.price_amd == null ? -1 : dir * (a.price_amd - b.price_amd);
const time = (v: Date | string) => new Date(v).getTime();
const SORTERS: Record<Exclude<SortKey, "relevance">, (a: SortableName, b: SortableName) => number> = {
  newest: (a, b) => time(b.created_at) - time(a.created_at),
  price_asc: byPrice(1),
  price_desc: byPrice(-1),
};

export async function getVehicle(slug: string, locale: Locale): Promise<Vehicle | null> {
  const db = await getDb();
  const rows = await db.query<VehicleRow & Record<string, unknown>>(`${SELECT_VEHICLE} WHERE v.slug = $2 AND ${VISIBLE}`, [
    locale,
    slug,
  ]);
  return (await hydrate(db, rows, locale, "full"))[0] ?? null;
}

export async function getFeatured(locale: Locale, limit = 3): Promise<Vehicle[]> {
  const db = await getDb();
  const rows = await db.query<VehicleRow & Record<string, unknown>>(
    `${SELECT_VEHICLE} WHERE ${VISIBLE} ORDER BY v.featured DESC, v.created_at DESC LIMIT $2`,
    [locale, limit],
  );
  return hydrate(db, rows, locale);
}

/** "You may also like": the cars picked in the admin, otherwise the newest cars with the same body type. */
export async function getSimilar(vehicle: Vehicle, locale: Locale, limit = 3): Promise<Vehicle[]> {
  const db = await getDb();
  const picked = await db.query<VehicleRow & Record<string, unknown>>(
    `${SELECT_VEHICLE} JOIN vehicle_related r ON r.related_id = v.id AND r.vehicle_id = $2
     WHERE ${VISIBLE} ORDER BY r.position LIMIT 6`,
    [locale, vehicle.id],
  );
  if (picked.length) return hydrate(db, picked, locale);
  const rows = await db.query<VehicleRow & Record<string, unknown>>(
    `${SELECT_VEHICLE} WHERE ${VISIBLE} AND v.id <> $2 AND v.body_type = $3 ORDER BY v.created_at DESC LIMIT $4`,
    [locale, vehicle.id, vehicle.bodyType, limit],
  );
  return hydrate(db, rows, locale);
}

export async function getBrands(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.query<{ brand: string }>(`SELECT DISTINCT v.brand FROM vehicles v WHERE ${VISIBLE} ORDER BY v.brand`);
  return rows.map((r) => r.brand);
}

export async function getAllSlugs(): Promise<string[]> {
  const db = await getDb();
  const rows = await db.query<{ slug: string }>(`SELECT v.slug FROM vehicles v WHERE ${VISIBLE} ORDER BY v.created_at DESC`);
  return rows.map((r) => r.slug);
}

/**
 * Turns rows into Vehicles.
 *  - "card": only the cover photo (one query) — for listings, where loading every photo
 *    of every car would mean thousands of rows.
 *  - "full": all colours and photos (two queries, no N+1) — for the car page.
 */
async function hydrate(db: Db, rows: VehicleRow[], locale: Locale, detail: "card" | "full" = "card"): Promise<Vehicle[]> {
  if (rows.length === 0) return [];
  const ids = rows.map((r) => r.id);
  type ImageRow = { vehicle_id: number; color_id: number | null; kind: VehicleImage["kind"]; url: string; alt: string | null; is_cover: boolean };
  const toImage = (img: ImageRow): VehicleImage => ({ url: img.url, kind: img.kind, alt: img.alt ?? undefined });

  if (detail === "card") {
    // Best photo per car: the chosen cover, else an exterior shot (paint photos before general ones).
    const covers = await db.query<ImageRow>(
      `SELECT DISTINCT ON (vehicle_id) vehicle_id, color_id, kind, url, alt, is_cover
       FROM vehicle_images WHERE vehicle_id = ANY($1::int[])
       ORDER BY vehicle_id, is_cover DESC, (kind = 'EXTERIOR') DESC, position, id`,
      [ids],
    );
    const coverByVehicle = new Map(covers.map((c) => [c.vehicle_id, toImage(c)]));
    return rows.map((r) => toVehicle(r, { cover: coverByVehicle.get(r.id) ?? null, images: [], colors: [] }));
  }

  const [colorRows, imageRows] = await Promise.all([
    db.query<{ id: number; vehicle_id: number; kind: VehicleColor["kind"]; hex: string; name: string | null }>(
      `SELECT c.id, c.vehicle_id, c.kind, c.hex, ct.name
       FROM vehicle_colors c
       LEFT JOIN vehicle_color_translations ct ON ct.color_id = c.id AND ct.locale = $2
       WHERE c.vehicle_id = ANY($1::int[])
       ORDER BY c.vehicle_id, (c.kind = 'INTERIOR'), c.position, c.id`,
      [ids, locale],
    ),
    db.query<ImageRow>(
      `SELECT vehicle_id, color_id, kind, url, alt, is_cover FROM vehicle_images
       WHERE vehicle_id = ANY($1::int[])
       ORDER BY vehicle_id, position, id`,
      [ids],
    ),
  ]);

  const colorsByVehicle = new Map<number, VehicleColor[]>();
  const colorById = new Map<number, VehicleColor>();
  for (const c of colorRows) {
    const color: VehicleColor = { id: c.id, kind: c.kind, name: c.name ?? c.hex, hex: c.hex, images: [] };
    colorById.set(c.id, color);
    colorsByVehicle.set(c.vehicle_id, [...(colorsByVehicle.get(c.vehicle_id) ?? []), color]);
  }

  const generalByVehicle = new Map<number, VehicleImage[]>();
  const coverByVehicle = new Map<number, VehicleImage>();
  for (const row of imageRows) {
    const image = toImage(row);
    if (row.is_cover) coverByVehicle.set(row.vehicle_id, image);
    const color = row.color_id != null ? colorById.get(row.color_id) : undefined;
    if (color) color.images.push(image);
    else generalByVehicle.set(row.vehicle_id, [...(generalByVehicle.get(row.vehicle_id) ?? []), image]);
  }

  return rows.map((r) => {
    const colors = colorsByVehicle.get(r.id) ?? [];
    const images = generalByVehicle.get(r.id) ?? [];
    const firstExterior = [...colors.flatMap((c) => c.images), ...images].find((i) => i.kind === "EXTERIOR");
    return toVehicle(r, { cover: coverByVehicle.get(r.id) ?? firstExterior ?? images[0] ?? null, images, colors });
  });
}

function toVehicle(r: VehicleRow, media: Pick<Vehicle, "cover" | "images" | "colors">): Vehicle {
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
    stock: r.stock,
    featured: r.featured,
    interior360Url: r.interior_360_url,
    videoUrl: r.video_url,
    createdAt: new Date(r.created_at).toISOString(),
    ...media,
  };
}

const BODY: BodyType[] = ["SEDAN", "CROSSOVER", "SUV", "HATCHBACK", "WAGON", "MPV", "PICKUP"];
const FUEL: FuelType[] = ["ELECTRIC", "EREV", "PHEV", "HYBRID", "PETROL"];
const STATUS: VehicleStatus[] = ["IN_STOCK", "IN_TRANSIT", "PRE_ORDER"];
const SORT: SortKey[] = ["relevance", "newest", "price_asc", "price_desc"];

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
    q: one("q")?.trim().slice(0, MAX_QUERY_LENGTH) || undefined,
  };
}
