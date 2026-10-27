import { getDb } from "../db";
import type { AdminUser } from "../auth";
import { carName, syncStock } from "./cars";
import { comboStock, type ColourStock } from "../colour-stock";
import { interpolate } from "../format";
import type { AdminDict } from "./i18n";

/* Recording sales: one click for the salesperson, stock goes down in the same transaction. */

export interface SellableCar {
  id: number;
  name: string;
  status: string;
  stock: number | null;
  /** Paint colours. */
  colors: { id: number; name: string; hex: string }[];
  /** Interior trims (only asked for when the car is counted by colour). */
  interiors: { id: number; name: string; hex: string }[];
  /** Stock per paint + interior; empty = counted as a whole. */
  combos: ColourStock[];
}

export async function listSellableCars(): Promise<SellableCar[]> {
  const db = await getDb();
  const cars = await db.query<{ id: number; brand: string; model: string; trim_level: string | null; year: number; status: string; stock: number | null }>(
    `SELECT id, brand, model, trim_level, year, status, stock FROM vehicles
     WHERE published ORDER BY brand, model, year DESC, id`,
  );
  const [colors, combos] = await Promise.all([
    db.query<{ id: number; vehicle_id: number; kind: string; hex: string; name: string | null }>(
      `SELECT c.id, c.vehicle_id, c.kind, c.hex, ct.name FROM vehicle_colors c
       JOIN vehicles v ON v.id = c.vehicle_id AND v.published
       LEFT JOIN vehicle_color_translations ct ON ct.color_id = c.id AND ct.locale = 'en'
       ORDER BY c.position, c.id`,
    ),
    db.query<ColourStock & { vehicle_id: number }>(
      `SELECT s.vehicle_id, s.exterior_id AS "exteriorId", s.interior_id AS "interiorId", s.stock
       FROM vehicle_color_stock s JOIN vehicles v ON v.id = s.vehicle_id AND v.published`,
    ),
  ]);
  const of = (vehicleId: number, kind: string) =>
    colors.filter((k) => k.vehicle_id === vehicleId && k.kind === kind).map((k) => ({ id: k.id, name: k.name ?? k.hex, hex: k.hex }));
  return cars.map((c) => {
    const own = combos.filter((k) => k.vehicle_id === c.id).map(({ exteriorId, interiorId, stock }) => ({ exteriorId, interiorId, stock }));
    return {
      id: c.id,
      name: `${carName(c)} · ${c.year}`,
      status: c.status,
      stock: c.stock,
      colors: of(c.id, "EXTERIOR"),
      // Interiors matter only when stock is counted per combination.
      interiors: own.some((k) => k.interiorId !== null) ? of(c.id, "INTERIOR") : [],
      combos: own,
    };
  });
}

export interface SaleInput {
  vehicleId: number;
  colorId: number | null;
  interiorId: number | null;
  quantity: number;
  priceAmd: number | null;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
}

export type SaleResult =
  | { ok: true; carName: string; stockLeft: number | null; tracked: boolean; byColour?: boolean }
  | { ok: false; error: string };

export async function recordSale(input: SaleInput, user: AdminUser, t: AdminDict["sell"]): Promise<SaleResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Lock the car row so two salespeople can't sell the last unit at the same time.
    const [car] = await tx.query<{ id: number; brand: string; model: string; trim_level: string | null; year: number; stock: number | null }>(
      "SELECT id, brand, model, trim_level, year, stock FROM vehicles WHERE id = $1 FOR UPDATE",
      [input.vehicleId],
    );
    if (!car) return { ok: false, error: t.carGone };
    const name = `${carName(car)} · ${car.year}`;

    const colourName = async (id: number | null, kind: string) => {
      if (!id) return null;
      const [c] = await tx.query<{ name: string | null; hex: string }>(
        `SELECT ct.name, c.hex FROM vehicle_colors c
         LEFT JOIN vehicle_color_translations ct ON ct.color_id = c.id AND ct.locale = 'en'
         WHERE c.id = $1 AND c.vehicle_id = $2 AND c.kind = $3`,
        [id, car.id, kind],
      );
      return c ? c.name ?? c.hex : undefined;
    };
    const colorName = await colourName(input.colorId, "EXTERIOR");
    const interiorName = await colourName(input.interiorId, "INTERIOR");
    if (colorName === undefined || interiorName === undefined) return { ok: false, error: t.colourWrong };

    const combos = await tx.query<ColourStock>(
      `SELECT exterior_id AS "exteriorId", interior_id AS "interiorId", stock FROM vehicle_color_stock WHERE vehicle_id = $1`,
      [car.id],
    );
    const byColour = combos.length > 0;
    const tracked = byColour || car.stock !== null;
    let stockLeft: number | null = null;

    if (byColour) {
      // Counted by colour: the exact paint + interior must be chosen, and that combination must have units.
      const needsInterior = combos.some((c) => c.interiorId !== null);
      if (!input.colorId || (needsInterior && !input.interiorId)) return { ok: false, error: t.pickCombo };
      const interiorId = needsInterior ? input.interiorId : null;
      const have = comboStock(combos, input.colorId, interiorId);
      const combo = [colorName, needsInterior ? interiorName : null].filter(Boolean).join(" / ");
      if (have < input.quantity) {
        return { ok: false, error: have === 0 ? interpolate(t.comboSoldOut, { combo }) : interpolate(t.onlyLeft, { count: have, car: `${name} · ${combo}` }) };
      }
      await tx.query(
        "UPDATE vehicle_color_stock SET stock = stock - $1 WHERE exterior_id = $2 AND interior_id IS NOT DISTINCT FROM $3",
        [input.quantity, input.colorId, interiorId],
      );
      await syncStock(tx, car.id);
      stockLeft = have - input.quantity;
    } else if (tracked) {
      if (car.stock! < input.quantity) return { ok: false, error: interpolate(t.onlyLeft, { count: car.stock!, car: name }) };
      await tx.query("UPDATE vehicles SET stock = stock - $1, updated_at = now() WHERE id = $2", [input.quantity, car.id]);
      stockLeft = car.stock! - input.quantity;
    }

    await tx.query(
      `INSERT INTO sales (vehicle_id, vehicle_name, color_id, color_name, interior_id, interior_name, by_colour, quantity, price_amd,
                          customer_name, customer_phone, note, stock_tracked, sold_by, sold_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)`,
      [car.id, name, input.colorId, colorName, byColour ? input.interiorId : null, byColour ? interiorName : null, byColour,
       input.quantity, input.priceAmd, input.customerName, input.customerPhone, input.note, tracked, user.id, user.name || user.email],
    );
    return { ok: true, carName: name, stockLeft, tracked, byColour };
  });
}

export interface SaleRow {
  id: number;
  vehicle_id: number | null;
  vehicle_name: string;
  color_name: string | null;
  interior_name: string | null;
  quantity: number;
  price_amd: number | null;
  customer_name: string | null;
  customer_phone: string | null;
  note: string | null;
  sold_by: number | null;
  sold_by_name: string;
  created_at: Date | string;
  cancelled_at: Date | string | null;
}

/** Sales people see their own sales; FULL sees everyone's. */
export async function listSales(user: AdminUser, limit = 30): Promise<SaleRow[]> {
  const db = await getDb();
  return db.query<SaleRow>(
    `SELECT id, vehicle_id, vehicle_name, color_name, interior_name, quantity, price_amd, customer_name, customer_phone, note,
            sold_by, sold_by_name, created_at, cancelled_at
     FROM sales WHERE ($1::int IS NULL OR sold_by = $1) ORDER BY created_at DESC LIMIT $2`,
    [user.role === "FULL" ? null : user.id, limit],
  );
}

/** Undo a sale (mistake): puts the stock back. Sales people can undo only their own, within 24 hours. */
export async function cancelSale(saleId: number, user: AdminUser, t: AdminDict["sell"]): Promise<string | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [sale] = await tx.query<{
      vehicle_id: number | null; color_id: number | null; interior_id: number | null; by_colour: boolean;
      quantity: number; stock_tracked: boolean; sold_by: number | null; cancelled_at: unknown; age_hours: number;
    }>(
      `SELECT vehicle_id, color_id, interior_id, by_colour, quantity, stock_tracked, sold_by, cancelled_at,
              EXTRACT(EPOCH FROM now() - created_at)::float / 3600 AS age_hours
       FROM sales WHERE id = $1 FOR UPDATE`,
      [saleId],
    );
    if (!sale || sale.cancelled_at) return t.alreadyUndone;
    if (user.role !== "FULL" && (sale.sold_by !== user.id || sale.age_hours > 24)) {
      return t.undoOwn;
    }
    if (sale.stock_tracked && sale.vehicle_id) {
      await tx.query("SELECT 1 FROM vehicles WHERE id = $1 FOR UPDATE", [sale.vehicle_id]);
      // Back into the same paint + interior if the car is still counted that way.
      const put = sale.by_colour && sale.color_id
        ? await tx.query(
          `UPDATE vehicle_color_stock SET stock = stock + $1
           WHERE vehicle_id = $2 AND exterior_id = $3 AND interior_id IS NOT DISTINCT FROM $4 RETURNING 1`,
          [sale.quantity, sale.vehicle_id, sale.color_id, sale.interior_id])
        : [];
      if (put.length) await syncStock(tx, sale.vehicle_id);
      else if (!(await tx.query("SELECT 1 FROM vehicle_color_stock WHERE vehicle_id = $1 LIMIT 1", [sale.vehicle_id])).length) {
        await tx.query("UPDATE vehicles SET stock = coalesce(stock, 0) + $1, updated_at = now() WHERE id = $2", [sale.quantity, sale.vehicle_id]);
      }
      // Else: that colour combination was removed since; the other colours' counts stay as they are.
    }
    await tx.query("UPDATE sales SET cancelled_at = now(), cancelled_by = $1 WHERE id = $2", [user.name || user.email, saleId]);
    return null;
  });
}
