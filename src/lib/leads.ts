import type { Locale } from "@/i18n/config";
import { getDb } from "./db";
import type { ContactChannel, LeadType } from "./types";

export interface NewLead {
  type: LeadType;
  name: string;
  phone: string;
  email: string | null;
  channel: ContactChannel;
  message: string | null;
  vehicleSlug: string | null;
  locale: Locale;
  consent: boolean;
  extra?: Record<string, unknown> | null;
}

/** Saves a form request. The car is linked by slug; unknown slugs are kept in `extra`. */
export async function createLead(lead: NewLead): Promise<number> {
  const db = await getDb();
  const extra = { ...(lead.extra ?? {}), ...(lead.vehicleSlug ? { vehicleSlug: lead.vehicleSlug } : {}) };
  const [{ id }] = await db.query<{ id: number }>(
    `INSERT INTO leads (type, name, phone, email, channel, message, vehicle_id, locale, consent, extra)
     VALUES ($1, $2, $3, $4, $5, $6,
             (SELECT id FROM vehicles WHERE slug = $7),
             $8, $9, $10)
     RETURNING id`,
    [
      lead.type, lead.name, lead.phone, lead.email, lead.channel, lead.message,
      lead.vehicleSlug, lead.locale, lead.consent, Object.keys(extra).length ? JSON.stringify(extra) : null,
    ],
  );
  return id;
}
