export const locales = ["hy", "en", "ru"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "hy";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeLabels: Record<Locale, string> = { hy: "ՀՅ", en: "EN", ru: "RU" };

/** BCP-47 tags for number formatting and Open Graph. */
export const localeTags: Record<Locale, { intl: string; og: string }> = {
  hy: { intl: "hy-AM", og: "hy_AM" },
  en: { intl: "en-US", og: "en_US" },
  ru: { intl: "ru-RU", og: "ru_RU" },
};

export const amdSuffix: Record<Locale, string> = { hy: "դր.", en: "AMD", ru: "драм" };

/** hreflang map for a path that exists in every language, e.g. "/cars". */
export function languageAlternates(path: string): Record<string, string> {
  return Object.fromEntries(locales.map((l) => [l, `/${l}${path}`]));
}
