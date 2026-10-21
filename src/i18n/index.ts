import { en, type Dictionary } from "./en";
import { hy } from "./hy";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, hy };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
export * from "./config";
