import { getDb } from "../db";
import type { AdminUser } from "../auth";
import { carName } from "./cars";

/* Recording sales: one click for the salesperson, stock goes down in the same transaction. */

export interface SellableCar {
  id: number;
  name: string;
  status: string;
  stock: number | null;
  colors: { id: number; name: string; hex: string }[];
}

export async function listSellableCars(): Promise<SellableCar[]> {
  const db = await getDb();
  const cars = await db.query<{ id: number; brand: string; model: string; trim_level: string | null; year: number; status: string; stock: number | null }>(
    `SELECT id, brand, model, trim_level, year, status, stock FROM vehicles
     WHERE published ORDER BY brand, model, year DESC, id`,
  );
  const colors = await db.query<{ id: number; vehicle_id: number; hex: string; name: string | null }>(
    `SELECT c.id, c.vehicle_id, c.hex, ct.name FROM vehicle_colors c
     LEFT JOIN vehicle_color_translations ct ON ct.color_id = c.id AND ct.locale = 'en'
     ORDER BY c.position, c.id`,
  );
  return cars.map((c) => ({
    id: c.id,
    name: `${carName(c)} · ${c.year}`,
    status: c.status,
    stock: c.stock,
    colors: colors.filter((k) => k.vehicle_id === c.id).map((k) => ({ id: k.id, name: k.name ?? k.hex, hex: k.hex })),
  }));
}

export interface SaleInput {
  vehicleId: number;
  colorId: number | null;
  quantity: number;
  priceAmd: number | null;
  customerName: string | null;
  customerPhone: string | null;
  note: string | null;
}

export type SaleResult =
  | { ok: true; carName: string; stockLeft: number | null; tracked: boolean }
  | { ok: false; error: string };

export async function recordSale(input: SaleInput, user: AdminUser): Promise<SaleResult> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    // Lock the car row so two salespeople can't sell the last unit at the same time.
    const [car] = await tx.query<{ id: number; brand: string; model: string; trim_level: string | null; year: number; stock: number | null }>(
      "SELECT id, brand, model, trim_level, year, stock FROM vehicles WHERE id = $1 FOR UPDATE",
      [input.vehicleId],
    );
    if (!car) return { ok: false, error: "This car no longer exists." };
    const name = `${carName(car)} · ${car.year}`;

    let colorName: string | null = null;
    if (input.colorId) {
      const [c] = await tx.query<{ name: string | null; hex: string }>(
        `SELECT ct.name, c.hex FROM vehicle_colors c
         LEFT JOIN vehicle_color_translations ct ON ct.color_id = c.id AND ct.locale = 'en'
         WHERE c.id = $1 AND c.vehicle_id = $2`,
        [input.colorId, car.id],
      );
      if (!c) return { ok: false, error: "That colour doesn't belong to this car." };
      colorName = c.name ?? c.hex;
    }

    const tracked = car.stock !== null;
    if (tracked && car.stock! < input.quantity) {
      return { ok: false, error: `Only ${car.stock} left in stock for ${name}.` };
    }
    if (tracked) await tx.query("UPDATE vehicles SET stock = stock - $1, updated_at = now() WHERE id = $2", [input.quantity, car.id]);

    await tx.query(
      `INSERT INTO sales (vehicle_id, vehicle_name, color_id, color_name, quantity, price_amd, customer_name, customer_phone, note, stock_tracked, sold_by, sold_by_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [car.id, name, input.colorId, colorName, input.quantity, input.priceAmd, input.customerName, input.customerPhone, input.note,
       tracked, user.id, user.name || user.email],
    );
    return { ok: true, carName: name, stockLeft: tracked ? car.stock! - input.quantity : null, tracked };
  });
}

export interface SaleRow {
  id: number;
  vehicle_id: number | null;
  vehicle_name: string;
  color_name: string | null;
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
    `SELECT id, vehicle_id, vehicle_name, color_name, quantity, price_amd, customer_name, customer_phone, note,
            sold_by, sold_by_name, created_at, cancelled_at
     FROM sales WHERE ($1::int IS NULL OR sold_by = $1) ORDER BY created_at DESC LIMIT $2`,
    [user.role === "FULL" ? null : user.id, limit],
  );
}

/** Undo a sale (mistake): puts the stock back. Sales people can undo only their own, within 24 hours. */
export async function cancelSale(saleId: number, user: AdminUser): Promise<string | null> {
  const db = await getDb();
  return db.transaction(async (tx) => {
    const [sale] = await tx.query<{ vehicle_id: number | null; quantity: number; stock_tracked: boolean; sold_by: number | null; cancelled_at: unknown; age_hours: number }>(
      `SELECT vehicle_id, quantity, stock_tracked, sold_by, cancelled_at,
              EXTRACT(EPOCH FROM now() - created_at)::float / 3600 AS age_hours
       FROM sales WHERE id = $1 FOR UPDATE`,
      [saleId],
    );
    if (!sale || sale.cancelled_at) return "This sale was already undone.";
    if (user.role !== "FULL" && (sale.sold_by !== user.id || sale.age_hours > 24)) {
      return "You can undo only your own sales from the last 24 hours. Ask an admin.";
    }
    if (sale.stock_tracked && sale.vehicle_id) {
      await tx.query("UPDATE vehicles SET stock = coalesce(stock, 0) + $1, updated_at = now() WHERE id = $2", [sale.quantity, sale.vehicle_id]);
    }
    await tx.query("UPDATE sales SET cancelled_at = now(), cancelled_by = $1 WHERE id = $2", [user.name || user.email, saleId]);
    return null;
  });
}
