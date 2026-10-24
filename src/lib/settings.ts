import { cache } from "react";
import type { Locale } from "@/i18n/config";
import { getDb } from "./db";

/*
 * Contact info shown on the site, editable in Admin → Contact info.
 * Values live in the site_settings table; anything not set yet falls back to .env.
 */

export const SETTING_KEYS = [
  "phone", "whatsapp", "telegram", "email", "instagram", "facebook",
  "address_hy", "address_en", "address_ru", "hours_hy", "hours_en", "hours_ru", "map_url", "map_location",
] as const;
export type SettingKey = (typeof SETTING_KEYS)[number];
export type Settings = Record<SettingKey, string>;

const DEFAULTS: Settings = {
  phone: process.env.NEXT_PUBLIC_PHONE ?? "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP ?? "",
  telegram: process.env.NEXT_PUBLIC_TELEGRAM ?? "",
  email: process.env.NEXT_PUBLIC_EMAIL ?? "",
  instagram: "",
  facebook: "",
  address_hy: "", address_en: "", address_ru: "",
  hours_hy: "", hours_en: "", hours_ru: "",
  map_url: "",
  map_location: "",
};

export const getSettings = cache(async (): Promise<Settings> => {
  const db = await getDb();
  const rows = await db.query<{ key: string; value: string }>("SELECT key, value FROM site_settings");
  const settings = { ...DEFAULTS };
  for (const r of rows) if ((SETTING_KEYS as readonly string[]).includes(r.key)) settings[r.key as SettingKey] = r.value;
  return settings;
});

export async function saveSettings(values: Partial<Settings>) {
  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const key of SETTING_KEYS) {
      if (values[key] === undefined) continue;
      await tx.query(
        `INSERT INTO site_settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now()`,
        [key, values[key]!.trim()],
      );
    }
  });
}

/** Contact details for the public site, already resolved for one language. */
export interface Contact {
  phone: string;
  telHref: string;
  whatsappHref: string | null;
  telegramHref: string | null;
  email: string;
  instagram: string | null;
  facebook: string | null;
  address: string;
  hours: string;
  mapUrl: string | null;
  /** Google Maps embed for the contact page, from the showroom coordinates. */
  mapEmbed: string | null;
}

export async function getContact(locale: Locale): Promise<Contact> {
  const s = await getSettings();
  const digits = (v: string) => v.replace(/[^\d]/g, "");
  const url = (v: string) => (/^https:\/\//.test(v) ? v : null);
  const point = parseMapLocation(s.map_location);
  return {
    phone: s.phone,
    telHref: `tel:${s.phone.replace(/[^+\d]/g, "")}`,
    whatsappHref: digits(s.whatsapp) ? `https://wa.me/${digits(s.whatsapp)}` : null,
    telegramHref: s.telegram ? `https://t.me/${s.telegram.replace(/^@|^https:\/\/t\.me\//, "")}` : null,
    email: s.email,
    instagram: url(s.instagram),
    facebook: url(s.facebook),
    address: s[`address_${locale}`],
    hours: s[`hours_${locale}`],
    mapUrl: url(s.map_url) ?? (point ? `https://www.google.com/maps?q=${point}` : null),
    mapEmbed: point ? `https://www.google.com/maps?q=${point}&hl=${locale}&z=16&output=embed` : null,
  };
}

/**
 * Finds the showroom coordinates in what the admin pasted: plain "40.2231, 44.5315" or a
 * full Google Maps link (the pin's !3d…!4d… is preferred over the map centre @lat,lng).
 * Returns "lat,lng" or null.
 */
export function parseMapLocation(input: string): string | null {
  const v = input.trim();
  if (!v) return null;
  const m =
    /!3d(-?\d{1,2}\.\d+)!4d(-?\d{1,3}\.\d+)/.exec(v) ??
    /(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/.exec(v);
  if (!m) return null;
  const lat = Number(m[1]);
  const lng = Number(m[2]);
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return null;
  return `${lat},${lng}`;
}
