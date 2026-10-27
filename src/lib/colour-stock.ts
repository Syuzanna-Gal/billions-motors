/*
 * Stock counted per paint + interior combination ("white with black interior: 2").
 * Pure functions shared by the site, the admin and the sales form; unit tested in colour-stock.test.ts.
 */

export interface ColourStock {
  exteriorId: number;
  /** null when the car has no interior options. */
  interiorId: number | null;
  stock: number;
}

export const MAX_COLOUR_STOCK = 999;

/** Units of one paint colour, all interiors together. */
export function paintStock(rows: readonly ColourStock[], exteriorId: number): number {
  return rows.reduce((sum, r) => (r.exteriorId === exteriorId ? sum + r.stock : sum), 0);
}

/** Units of one exact combination. */
export function comboStock(rows: readonly ColourStock[], exteriorId: number, interiorId: number | null): number {
  return rows.find((r) => r.exteriorId === exteriorId && r.interiorId === interiorId)?.stock ?? 0;
}

export const totalStock = (rows: readonly ColourStock[]) => rows.reduce((sum, r) => sum + r.stock, 0);

/** Index of the first item with units, else 0 — so the car page opens on a colour that's actually there. */
export function firstAvailable<T>(items: readonly T[], units: (item: T) => number): number {
  const i = items.findIndex((item) => units(item) > 0);
  return i < 0 ? 0 : i;
}

/** Form field of one grid cell. Interior 0 = no interior options. */
export const cellName = (exteriorId: number, interiorId: number | null) => `cs:${exteriorId}:${interiorId ?? 0}`;

export type GridResult =
  | { mode: "clear" }
  | { mode: "save"; cells: ColourStock[] }
  | { mode: "error"; badCells: string[] };

/**
 * Reads the admin's grid (one box per paint × interior). All boxes empty = stop counting by
 * colour. Otherwise empty boxes count as 0. Only combinations of this car's own colours are read.
 */
export function parseStockGrid(
  get: (name: string) => string | null,
  exteriorIds: readonly number[],
  interiorIds: readonly number[],
): GridResult {
  const interiors: (number | null)[] = interiorIds.length ? [...interiorIds] : [null];
  const cells: ColourStock[] = [];
  const badCells: string[] = [];
  let anyFilled = false;
  for (const exteriorId of exteriorIds) {
    for (const interiorId of interiors) {
      const name = cellName(exteriorId, interiorId);
      const raw = (get(name) ?? "").trim();
      if (raw === "") {
        cells.push({ exteriorId, interiorId, stock: 0 });
        continue;
      }
      anyFilled = true;
      const n = Number(raw);
      if (!/^\d+$/.test(raw) || n > MAX_COLOUR_STOCK) badCells.push(name);
      else cells.push({ exteriorId, interiorId, stock: n });
    }
  }
  if (badCells.length) return { mode: "error", badCells };
  return anyFilled ? { mode: "save", cells } : { mode: "clear" };
}
