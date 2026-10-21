export type VehicleStatus = "IN_STOCK" | "IN_TRANSIT" | "PRE_ORDER";
export type FuelType = "ELECTRIC" | "EREV" | "PHEV" | "HYBRID" | "PETROL";
export type BodyType = "SEDAN" | "CROSSOVER" | "SUV" | "HATCHBACK" | "MPV" | "PICKUP";
export type DriveType = "FWD" | "RWD" | "AWD";

export interface VehicleImage {
  url: string;
  kind: "EXTERIOR" | "INTERIOR";
  alt?: string;
}

/** One paint option. Photos are per colour; an empty list falls back to the car's main photos. */
export interface VehicleColor {
  id: number;
  /** In the requested language. */
  name: string;
  hex: string;
  images: VehicleImage[];
}

/** Mirrors the planned `vehicles` table; the DB layer will return this same shape. */
export interface Vehicle {
  id: number;
  slug: string;
  brand: string;
  model: string;
  trim: string | null;
  year: number;
  status: VehicleStatus;
  fuelType: FuelType;
  bodyType: BodyType;
  drive: DriveType;
  /** In the requested language. */
  transmission: string | null;
  description: string | null;
  horsepower: number;
  evRangeKm: number | null;
  batteryKwh: number | null;
  accel0100: number | null;
  topSpeedKmh: number | null;
  seats: number;
  lengthMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  warrantyYears: number;
  warrantyKm: number;
  priceAmd: number | null;
  featured: boolean;
  images: VehicleImage[];
  colors: VehicleColor[];
  createdAt: string;
}

export type SortKey = "newest" | "price_asc" | "price_desc";

export interface VehicleFilters {
  brand?: string;
  body?: BodyType;
  fuel?: FuelType;
  status?: VehicleStatus;
  sort?: SortKey;
}

export type ContactChannel = "WHATSAPP" | "PHONE" | "TELEGRAM" | "EMAIL";
export type LeadType = "OFFER" | "FINANCING" | "CONTACT";
