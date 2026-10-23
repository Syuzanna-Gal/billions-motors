import { getDb } from "../db";

export const LEAD_STATUSES = ["NEW", "IN_PROGRESS", "DONE", "SPAM"] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export interface LeadRow {
  id: number;
  type: string;
  status: LeadStatus;
  name: string;
  phone: string;
  email: string | null;
  channel: string;
  message: string | null;
  locale: string;
  vehicle_name: string | null;
  vehicle_slug: string | null;
  created_at: Date | string;
}

export async function listLeads(status?: LeadStatus, limit = 200): Promise<LeadRow[]> {
  const db = await getDb();
  return db.query<LeadRow>(
    `SELECT l.id, l.type, l.status, l.name, l.phone, l.email, l.channel, l.message, l.locale, l.created_at,
            concat_ws(' ', v.brand, v.model, v.trim_level) AS vehicle_name, v.slug AS vehicle_slug
     FROM leads l LEFT JOIN vehicles v ON v.id = l.vehicle_id
     WHERE ($1::text IS NULL OR l.status = $1)
     ORDER BY l.created_at DESC LIMIT $2`,
    [status ?? null, limit],
  );
}

export async function setLeadStatus(id: number, status: LeadStatus) {
  const db = await getDb();
  await db.query("UPDATE leads SET status = $1 WHERE id = $2", [status, id]);
}

export async function countNewLeads(): Promise<number> {
  const db = await getDb();
  const [{ n }] = await db.query<{ n: number }>("SELECT count(*)::int AS n FROM leads WHERE status = 'NEW'");
  return n;
}
