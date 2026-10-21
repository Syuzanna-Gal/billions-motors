import { mockVehicles } from "./mock-vehicles";
import type { BodyType, FuelType, SortKey, Vehicle, VehicleFilters, VehicleStatus } from "./types";

/*
 * Data access for vehicles. Every page goes through these functions, so when the
 * PostgreSQL layer lands only this file changes (queries instead of the array).
 */

export async function listVehicles(filters: VehicleFilters = {}): Promise<Vehicle[]> {
  let rows = mockVehicles.filter(
    (v) =>
      (!filters.brand || v.brand === filters.brand) &&
      (!filters.body || v.bodyType === filters.body) &&
      (!filters.fuel || v.fuelType === filters.fuel) &&
      (!filters.status || v.status === filters.status),
  );
  rows = sortVehicles(rows, filters.sort ?? "newest");
  return rows;
}

export async function getVehicle(slug: string): Promise<Vehicle | null> {
  return mockVehicles.find((v) => v.slug === slug) ?? null;
}

export async function getFeatured(limit = 3): Promise<Vehicle[]> {
  const featured = mockVehicles.filter((v) => v.featured);
  return (featured.length ? featured : mockVehicles).slice(0, limit);
}

export async function getSimilar(vehicle: Vehicle, limit = 3): Promise<Vehicle[]> {
  return mockVehicles
    .filter((v) => v.id !== vehicle.id && v.bodyType === vehicle.bodyType)
    .slice(0, limit);
}

export async function getBrands(): Promise<string[]> {
  return [...new Set(mockVehicles.map((v) => v.brand))].sort((a, b) => a.localeCompare(b));
}

export async function getAllSlugs(): Promise<string[]> {
  return mockVehicles.map((v) => v.slug);
}

function sortVehicles(rows: Vehicle[], sort: SortKey): Vehicle[] {
  const copy = [...rows];
  if (sort === "newest") return copy.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  // Cars without a price ("contact for price") go last in both price orders.
  const dir = sort === "price_asc" ? 1 : -1;
  return copy.sort((a, b) => {
    if (a.priceAmd == null && b.priceAmd == null) return 0;
    if (a.priceAmd == null) return 1;
    if (b.priceAmd == null) return -1;
    return (a.priceAmd - b.priceAmd) * dir;
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
    return typeof v === "string" && v.length > 0 ? v : undefined;
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
