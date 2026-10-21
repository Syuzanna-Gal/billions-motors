import type { Locale } from "@/i18n/config";
import type { Vehicle } from "./types";

export function vehicleName(v: Pick<Vehicle, "brand" | "model" | "trim">): string {
  return [v.brand, v.model, v.trim].filter(Boolean).join(" ");
}

export function formatNumber(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "hy" ? "hy-AM" : "en-US").format(Math.round(n));
}

export function formatAmd(n: number, locale: Locale): string {
  return `${formatNumber(n, locale)} ${locale === "hy" ? "դր." : "AMD"}`;
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => String(values[k] ?? ""));
}
