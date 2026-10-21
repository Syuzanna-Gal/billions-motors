import type { Vehicle } from "./types";

/**
 * Development seed data. Replaced by the PostgreSQL `vehicles` table once the
 * real catalog is imported. Prices are null until the business provides them.
 */
export const mockVehicles: Vehicle[] = [
  {
    id: 1, slug: "deepal-s09-4wd-ultra-2026", brand: "Deepal", model: "S09", trim: "4WD Ultra+", year: 2026,
    status: "PRE_ORDER", fuelType: "EREV", bodyType: "CROSSOVER", drive: "AWD", transmission: "Single speed",
    horsepower: 492, evRangeKm: 220, batteryKwh: null, accel0100: null, topSpeedKmh: null, seats: 6,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 150000, priceAmd: null,
    featured: true, images: [], createdAt: "2026-10-15",
  },
  {
    id: 2, slug: "byd-seal-06-dm-i-2026", brand: "BYD", model: "Seal 06 DM-i", trim: null, year: 2026,
    status: "PRE_ORDER", fuelType: "PHEV", bodyType: "SEDAN", drive: "FWD", transmission: "Single speed",
    horsepower: 163, evRangeKm: 128, batteryKwh: 16, accel0100: 7.9, topSpeedKmh: 180, seats: 5,
    lengthMm: 4830, widthMm: 1875, heightMm: 1495, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: true, images: [], createdAt: "2026-10-14",
  },
  {
    id: 3, slug: "zeekr-7x-4wd-ultra-2026", brand: "Zeekr", model: "7X", trim: "4WD Ultra 103", year: 2026,
    status: "IN_TRANSIT", fuelType: "ELECTRIC", bodyType: "CROSSOVER", drive: "AWD", transmission: "Single speed",
    horsepower: 796, evRangeKm: null, batteryKwh: 103, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: true, images: [], createdAt: "2026-10-12",
  },
  {
    id: 4, slug: "li-l7-ultra-2026", brand: "Li Auto", model: "L7", trim: "Ultra", year: 2026,
    status: "IN_STOCK", fuelType: "EREV", bodyType: "CROSSOVER", drive: "AWD", transmission: "Single speed",
    horsepower: 449, evRangeKm: 286, batteryKwh: null, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: false, images: [], createdAt: "2026-10-10",
  },
  {
    id: 5, slug: "changan-a07-550-2026", brand: "Changan", model: "A07", trim: "550 Premium", year: 2026,
    status: "IN_STOCK", fuelType: "ELECTRIC", bodyType: "SEDAN", drive: "RWD", transmission: "Single speed",
    horsepower: 272, evRangeKm: 550, batteryKwh: null, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: false, images: [], createdAt: "2026-10-09",
  },
  {
    id: 6, slug: "zeekr-007-4wd-ultra-2026", brand: "Zeekr", model: "007", trim: "4WD Ultra 103", year: 2026,
    status: "PRE_ORDER", fuelType: "ELECTRIC", bodyType: "SEDAN", drive: "AWD", transmission: "Single speed",
    horsepower: 796, evRangeKm: null, batteryKwh: 103, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: false, images: [], createdAt: "2026-10-08",
  },
  {
    id: 7, slug: "deepal-s07-dm-2026", brand: "Deepal", model: "S07 DM", trim: null, year: 2026,
    status: "PRE_ORDER", fuelType: "EREV", bodyType: "CROSSOVER", drive: "RWD", transmission: "Single speed",
    horsepower: 258, evRangeKm: 230, batteryKwh: null, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: false, images: [], createdAt: "2026-10-07",
  },
  {
    id: 8, slug: "byd-sea-lion-05-520-2025", brand: "BYD", model: "Sea Lion 05", trim: "520 Smart", year: 2025,
    status: "IN_STOCK", fuelType: "ELECTRIC", bodyType: "CROSSOVER", drive: "FWD", transmission: "Single speed",
    horsepower: 218, evRangeKm: 520, batteryKwh: null, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: false, images: [], createdAt: "2026-10-05",
  },
  {
    id: 9, slug: "changan-qiyuan-q05-506-2026", brand: "Changan", model: "Qiyuan Q05", trim: "506", year: 2026,
    status: "PRE_ORDER", fuelType: "ELECTRIC", bodyType: "CROSSOVER", drive: "FWD", transmission: "Single speed",
    horsepower: 163, evRangeKm: 506, batteryKwh: null, accel0100: null, topSpeedKmh: null, seats: 5,
    lengthMm: null, widthMm: null, heightMm: null, warrantyYears: 3, warrantyKm: 100000, priceAmd: null,
    featured: false, images: [], createdAt: "2026-10-03",
  },
];
