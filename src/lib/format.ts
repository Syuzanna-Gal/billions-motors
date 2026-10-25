import { amdSuffix, localeTags, type Locale } from "@/i18n/config";
import type { Vehicle } from "./types";

export function vehicleName(v: Pick<Vehicle, "brand" | "model" | "trim">): string {
  return [v.brand, v.model, v.trim].filter(Boolean).join(" ");
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(localeTags[locale].intl).format(Math.round(n));
}

export function formatAmd(n: number, locale: Locale): string {
  return `${formatNumber(n, locale)} ${amdSuffix[locale]}`;
}

type PluralForms = { one: string; few: string; many: string; other: string };

/** "1 day" / "5 days"; in Russian "1 день" / "3 дня" / "5 дней". */
export function plural(n: number, forms: PluralForms, locale: Locale): string {
  const rule = new Intl.PluralRules(localeTags[locale].intl).select(n) as keyof PluralForms;
  return `${formatNumber(n, locale)} ${forms[rule] ?? forms.other}`;
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
}
