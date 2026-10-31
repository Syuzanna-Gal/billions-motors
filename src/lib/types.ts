import type { ColourStock } from "./colour-stock";

export type VehicleStatus = "IN_STOCK" | "IN_TRANSIT" | "PRE_ORDER";
export type FuelType = "ELECTRIC" | "EREV" | "PHEV" | "HYBRID" | "PETROL";
export type BodyType = "SEDAN" | "CROSSOVER" | "SUV" | "HATCHBACK" | "WAGON" | "MPV" | "PICKUP";
export type DriveType = "FWD" | "RWD" | "AWD";

export interface VehicleImage {
  url: string;
  kind: "EXTERIOR" | "INTERIOR";
  alt?: string;
}

/**
 * A paint colour (EXTERIOR) or an interior trim (INTERIOR), each with its own picker.
 * Photos are per colour; an empty list falls back to the car's general photos.
 */
export interface VehicleColor {
  id: number;
  kind: "EXTERIOR" | "INTERIOR";
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
  /** Main price, without warranty (shown large). */
  priceAmd: number | null;
  /** Price with the warranty, shown under the main one; null = not shown. */
  priceWarrantyAmd: number | null;
  /** Cars left; null = not counted (pre-order / in transit). */
  stock: number | null;
  /** Days until a car on the road arrives (never below 1); null if not in transit or no date set. */
  arrivalDays: number | null;
  featured: boolean;
  /** Photo for catalogue cards: the chosen cover, else the first exterior photo. */
  cover: VehicleImage | null;
  /** General photos (not tied to a colour). */
  images: VehicleImage[];
  /** Paint colours, then interior trims (see `kind`). */
  colors: VehicleColor[];
  /** Stock per paint + interior (car page only); empty = the car is counted as a whole. */
  colorStock: ColourStock[];
  interior360Url: string | null;
  videoUrl: string | null;
  createdAt: string;
}

/** "relevance" only applies to searches (best match first). */
export type SortKey = "relevance" | "newest" | "price_asc" | "price_desc";

export interface VehicleFilters {
  brand?: string;
  body?: BodyType;
  fuel?: FuelType;
  status?: VehicleStatus;
  sort?: SortKey;
  /** Free-text search by car name. */
  q?: string;
}

export type ContactChannel = "WHATSAPP" | "PHONE" | "TELEGRAM" | "EMAIL";
export type LeadType = "OFFER" | "FINANCING" | "CONTACT";
