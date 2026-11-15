import { cache } from "react";
import { getDb } from "./db";

export { initials as bankInitials } from "./initials";

/*
 * Partner banks shown as round logos on the Financing page. There are BANK_SLOTS fixed places,
 * edited in Admin → Banks; a place shows on the site when it is switched on and has a logo or name.
 */

export const BANK_SLOTS = 10;

export interface Bank {
  slot: number;
  name: string;
  logoUrl: string | null;
  /** The bank's website (https), opened when the logo is clicked. */
  url: string | null;
  visible: boolean;
}

type Row = { slot: number; name: string; logo_url: string | null; url: string | null; visible: boolean };
const toBank = (r: Row): Bank => ({ slot: r.slot, name: r.name, logoUrl: r.logo_url, url: r.url, visible: r.visible });

/** All places, for the admin. */
export async function getBankSlots(): Promise<Bank[]> {
  const db = await getDb();
  const rows = await db.query<Row>("SELECT slot, name, logo_url, url, visible FROM partner_banks ORDER BY slot");
  return rows.map(toBank);
}

/** The banks the site shows, in place order. */
export const getShownBanks = cache(async (): Promise<Bank[]> => {
  const db = await getDb();
  const rows = await db.query<Row>(
    `SELECT slot, name, logo_url, url, visible FROM partner_banks
     WHERE visible AND (logo_url IS NOT NULL OR name <> '') ORDER BY slot`,
  );
  return rows.map(toBank);
});

/** Updates one place. Returns the logo it replaced (to delete its file), if any. */
export async function saveBankSlot(slot: number, values: { name: string; url: string | null; visible: boolean; logoUrl?: string | null }) {
  const db = await getDb();
  const [old] = await db.query<{ logo_url: string | null }>("SELECT logo_url FROM partner_banks WHERE slot = $1", [slot]);
  const logoChanged = values.logoUrl !== undefined && values.logoUrl !== old?.logo_url;
  await db.query(
    `UPDATE partner_banks SET name = $2, url = $3, visible = $4, updated_at = now()
       ${logoChanged ? ", logo_url = $5" : ""}
     WHERE slot = $1`,
    logoChanged ? [slot, values.name, values.url, values.visible, values.logoUrl] : [slot, values.name, values.url, values.visible],
  );
  return logoChanged ? old?.logo_url ?? null : null;
}
