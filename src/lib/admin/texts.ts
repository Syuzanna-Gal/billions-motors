import { defaultDictionary, locales, type Locale } from "@/i18n";
import { getDb } from "../db";
import { checkPlaceholders, fieldLabel, fieldText, listFields, type TextField } from "../text-overrides";
import { interpolate } from "../format";
import type { AdminDict } from "./i18n";

/* Admin → Site texts: every text of the public site, grouped the way the site is laid out. */

export interface TextSection {
  slug: keyof AdminDict["texts"]["sections"];
  /** Top-level dictionary keys in this section. */
  prefixes: string[];
  /** Page to open from the admin to see the result. */
  preview: string;
}

/** Laid out like the site. Titles and descriptions are in the admin dictionaries (lib/admin/i18n). */
export const TEXT_SECTIONS: TextSection[] = [
  { slug: "home", preview: "", prefixes: ["home", "ticker"] },
  { slug: "header-footer", preview: "", prefixes: ["nav", "footer", "meta"] },
  { slug: "cars", preview: "/cars", prefixes: ["catalog", "search"] },
  { slug: "car-page", preview: "/cars", prefixes: ["car"] },
  { slug: "info-pages", preview: "/about", prefixes: ["pages"] },
  { slug: "loan", preview: "/loan-calculator", prefixes: ["loan"] },
  { slug: "contact", preview: "/contact", prefixes: ["contact", "form"] },
  { slug: "labels", preview: "/cars", prefixes: ["status", "fuel", "body", "drive", "units"] },
];

export interface TextRow {
  field: TextField;
  label: string;
  group: string;
  values: Record<Locale, { current: string; default: string; edited: boolean }>;
}

export const sectionBySlug = (slug: string) => TEXT_SECTIONS.find((s) => s.slug === slug);

function sectionFields(section: TextSection): TextField[] {
  const all = listFields(defaultDictionary("en") as never);
  return all.filter((f) => section.prefixes.includes(f.key.split(".")[0]))
    .sort((a, b) => section.prefixes.indexOf(a.key.split(".")[0]) - section.prefixes.indexOf(b.key.split(".")[0]));
}

async function overrides(keys?: string[]): Promise<Map<string, string>> {
  const db = await getDb();
  const rows = keys
    ? await db.query<{ key: string; locale: string; value: string }>("SELECT key, locale, value FROM site_texts WHERE key = ANY($1)", [keys])
    : await db.query<{ key: string; locale: string; value: string }>("SELECT key, locale, value FROM site_texts");
  return new Map(rows.map((r) => [`${r.key}|${r.locale}`, r.value]));
}

export async function getSectionTexts(section: TextSection): Promise<TextRow[]> {
  const fields = sectionFields(section);
  const saved = await overrides(fields.map((f) => f.key));
  return fields.map((field) => {
    const values = Object.fromEntries(
      locales.map((l) => {
        const def = fieldText(defaultDictionary(l) as never, field);
        const over = saved.get(`${field.key}|${l}`);
        return [l, { current: over ?? def, default: def, edited: over !== undefined }];
      }),
    ) as TextRow["values"];
    return { field, label: fieldLabel(field.key, 1), group: field.key.split(".")[0], values };
  });
}

/** How many texts were changed per section, for the overview. */
export async function editedCounts(): Promise<Record<string, number>> {
  const saved = await overrides();
  const counts: Record<string, number> = {};
  for (const key of saved.keys()) {
    const prefix = key.split(".")[0];
    const section = TEXT_SECTIONS.find((s) => s.prefixes.includes(prefix));
    if (section) counts[section.slug] = (counts[section.slug] ?? 0) + 1;
  }
  return counts;
}

export const fieldName = (key: string, locale: Locale) => `t:${key}:${locale}`;
const MAX_LENGTH = 4000;
const normalize = (v: string) => v.replace(/\r\n?/g, "\n").replace(/[ \t]+\n/g, "\n").trim();

/**
 * Saves a section. Texts equal to the default (or emptied) go back to the default.
 * Nothing is saved if any text is invalid; the errors are returned per field.
 */
export async function saveSectionTexts(
  section: TextSection,
  form: FormData,
  editor: string,
  t: AdminDict["texts"],
): Promise<{ saved: number; errors: Record<string, string> }> {
  const errors: Record<string, string> = {};
  const upserts: [string, Locale, string][] = [];
  const resets: [string, Locale][] = [];

  for (const field of sectionFields(section)) {
    for (const l of locales) {
      const raw = form.get(fieldName(field.key, l));
      if (typeof raw !== "string") continue;
      const value = normalize(raw);
      const def = fieldText(defaultDictionary(l) as never, field);
      if (!value || value === def) {
        resets.push([field.key, l]);
        continue;
      }
      const problem = value.length > MAX_LENGTH
        ? interpolate(t.tooLong, { max: MAX_LENGTH })
        : checkPlaceholders(def, value, { keep: t.keepPlaceholders, extra: t.extraPlaceholders });
      if (problem) errors[fieldName(field.key, l)] = problem;
      else upserts.push([field.key, l, value]);
    }
  }
  if (Object.keys(errors).length) return { saved: 0, errors };

  const db = await getDb();
  await db.transaction(async (tx) => {
    for (const [key, l] of resets) await tx.query("DELETE FROM site_texts WHERE key = $1 AND locale = $2", [key, l]);
    for (const [key, l, value] of upserts) {
      await tx.query(
        `INSERT INTO site_texts (key, locale, value, updated_by) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = now(), updated_by = EXCLUDED.updated_by
         WHERE site_texts.value IS DISTINCT FROM EXCLUDED.value`,
        [key, l, value, editor],
      );
    }
  });
  return { saved: upserts.length, errors };
}
