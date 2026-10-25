import { cache } from "react";
import { defaultDictionary, locales, type Dictionary, type Locale } from "@/i18n";
import { getDb } from "./db";
import { applyOverrides } from "./text-overrides";

/*
 * Site texts for a page: the built-in texts with the admin's edits applied.
 * Loaded once per request (React cache), from one small query.
 */

const loadOverrides = cache(async (): Promise<Record<Locale, Map<string, string>>> => {
  const byLocale = Object.fromEntries(locales.map((l) => [l, new Map<string, string>()])) as Record<Locale, Map<string, string>>;
  const db = await getDb();
  const rows = await db.query<{ key: string; locale: Locale; value: string }>("SELECT key, locale, value FROM site_texts");
  for (const r of rows) byLocale[r.locale]?.set(r.key, r.value);
  return byLocale;
});

export const getDictionary = cache(async (locale: Locale): Promise<Dictionary> => {
  return applyOverrides(defaultDictionary(locale), (await loadOverrides())[locale]);
});
