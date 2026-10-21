import type { Db } from "./index";
import type { BodyType, DriveType, FuelType, VehicleStatus } from "../types";

/*
 * Demo cars for local development and the private test site. Runs only when the
 * vehicles table is empty, so it never touches real data. Disable with SEED_DEMO=false.
 * Colour names are placeholders until the real catalogue is imported.
 */

type L = { hy: string; en: string; ru: string };

const PAINT: Record<string, { hex: string; name: L }> = {
  white: { hex: "#ecebe6", name: { en: "Pearl White", hy: "Մարգարտյա սպիտակ", ru: "Жемчужно-белый" } },
  black: { hex: "#17171a", name: { en: "Obsidian Black", hy: "Օբսիդիան սև", ru: "Обсидиановый чёрный" } },
  grey: { hex: "#5b5e63", name: { en: "Graphite Grey", hy: "Գրաֆիտե մոխրագույն", ru: "Графитовый серый" } },
  blue: { hex: "#1f2a44", name: { en: "Midnight Blue", hy: "Կեսգիշերային կապույտ", ru: "Полуночный синий" } },
  green: { hex: "#2f4a3c", name: { en: "Forest Green", hy: "Անտառային կանաչ", ru: "Лесной зелёный" } },
  silver: { hex: "#b9bcc0", name: { en: "Lunar Silver", hy: "Լուսնային արծաթագույն", ru: "Лунное серебро" } },
};

const SINGLE_SPEED: L = { en: "Single speed", hy: "Մեկ աստիճանով", ru: "Одноступенчатая" };

interface SeedCar {
  slug: string; brand: string; model: string; trim: string | null; year: number;
  status: VehicleStatus; fuel: FuelType; body: BodyType; drive: DriveType;
  hp: number; range?: number; battery?: number; accel?: number; top?: number; seats?: number;
  dims?: [number, number, number]; warrantyKm?: number; featured?: boolean; createdAt: string;
  colors: (keyof typeof PAINT)[];
}

const CARS: SeedCar[] = [
  { slug: "deepal-s09-4wd-ultra-2026", brand: "Deepal", model: "S09", trim: "4WD Ultra+", year: 2026, status: "PRE_ORDER",
    fuel: "EREV", body: "CROSSOVER", drive: "AWD", hp: 492, range: 220, seats: 6, warrantyKm: 150000, featured: true,
    createdAt: "2026-10-15", colors: ["black", "white", "grey"] },
  { slug: "byd-seal-06-dm-i-2026", brand: "BYD", model: "Seal 06 DM-i", trim: null, year: 2026, status: "PRE_ORDER",
    fuel: "PHEV", body: "SEDAN", drive: "FWD", hp: 163, range: 128, battery: 16, accel: 7.9, top: 180,
    dims: [4830, 1875, 1495], featured: true, createdAt: "2026-10-14", colors: ["white", "black", "blue", "silver"] },
  { slug: "zeekr-7x-4wd-ultra-2026", brand: "Zeekr", model: "7X", trim: "4WD Ultra 103", year: 2026, status: "IN_TRANSIT",
    fuel: "ELECTRIC", body: "CROSSOVER", drive: "AWD", hp: 796, battery: 103, featured: true, createdAt: "2026-10-12",
    colors: ["grey", "white", "green"] },
  { slug: "li-l7-ultra-2026", brand: "Li Auto", model: "L7", trim: "Ultra", year: 2026, status: "IN_STOCK",
    fuel: "EREV", body: "CROSSOVER", drive: "AWD", hp: 449, range: 286, createdAt: "2026-10-10", colors: ["black", "silver", "white"] },
  { slug: "changan-a07-550-2026", brand: "Changan", model: "A07", trim: "550 Premium", year: 2026, status: "IN_STOCK",
    fuel: "ELECTRIC", body: "SEDAN", drive: "RWD", hp: 272, range: 550, createdAt: "2026-10-09", colors: ["white", "blue", "grey"] },
  { slug: "zeekr-007-4wd-ultra-2026", brand: "Zeekr", model: "007", trim: "4WD Ultra 103", year: 2026, status: "PRE_ORDER",
    fuel: "ELECTRIC", body: "SEDAN", drive: "AWD", hp: 796, battery: 103, createdAt: "2026-10-08", colors: ["black", "white", "silver"] },
  { slug: "deepal-s07-dm-2026", brand: "Deepal", model: "S07 DM", trim: null, year: 2026, status: "PRE_ORDER",
    fuel: "EREV", body: "CROSSOVER", drive: "RWD", hp: 258, range: 230, createdAt: "2026-10-07", colors: ["white", "grey", "green"] },
  { slug: "byd-sea-lion-05-520-2025", brand: "BYD", model: "Sea Lion 05", trim: "520 Smart", year: 2025, status: "IN_STOCK",
    fuel: "ELECTRIC", body: "CROSSOVER", drive: "FWD", hp: 218, range: 520, createdAt: "2026-10-05", colors: ["white", "black", "blue"] },
  { slug: "changan-qiyuan-q05-506-2026", brand: "Changan", model: "Qiyuan Q05", trim: "506", year: 2026, status: "PRE_ORDER",
    fuel: "ELECTRIC", body: "CROSSOVER", drive: "FWD", hp: 163, range: 506, createdAt: "2026-10-03", colors: ["silver", "white", "black"] },
];

export async function seedDemoData(db: Db) {
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM vehicles");
  if (n > 0) return;

  await db.transaction(async (tx) => {
    for (const c of CARS) {
      const [{ id }] = await tx.query<{ id: number }>(
        `INSERT INTO vehicles (slug, brand, model, trim_level, year, status, fuel_type, body_type, drive, horsepower,
           ev_range_km, battery_kwh, accel_0_100, top_speed_kmh, seats, length_mm, width_mm, height_mm,
           warranty_years, warranty_km, price_amd, featured, created_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,3,$19,NULL,$20,$21)
         RETURNING id`,
        [c.slug, c.brand, c.model, c.trim, c.year, c.status, c.fuel, c.body, c.drive, c.hp,
         c.range ?? null, c.battery ?? null, c.accel ?? null, c.top ?? null, c.seats ?? 5,
         c.dims?.[0] ?? null, c.dims?.[1] ?? null, c.dims?.[2] ?? null, c.warrantyKm ?? 100000, c.featured ?? false, c.createdAt],
      );
      for (const locale of ["hy", "en", "ru"] as const) {
        await tx.query("INSERT INTO vehicle_translations (vehicle_id, locale, transmission) VALUES ($1, $2, $3)", [
          id, locale, SINGLE_SPEED[locale],
        ]);
      }
      for (const [position, key] of c.colors.entries()) {
        const paint = PAINT[key];
        const [{ id: colorId }] = await tx.query<{ id: number }>(
          "INSERT INTO vehicle_colors (vehicle_id, hex, position) VALUES ($1, $2, $3) RETURNING id",
          [id, paint.hex, position],
        );
        for (const locale of ["hy", "en", "ru"] as const) {
          await tx.query("INSERT INTO vehicle_color_translations (color_id, locale, name) VALUES ($1, $2, $3)", [
            colorId, locale, paint.name[locale],
          ]);
        }
      }
    }
  });
  console.info(`[db] seeded ${CARS.length} demo cars`);
}
