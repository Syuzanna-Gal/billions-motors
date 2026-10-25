import { en, type Dictionary } from "./en";
import { hy } from "./hy";
import { ru } from "./ru";
import type { Locale } from "./config";

const dictionaries: Record<Locale, Dictionary> = { en, hy, ru };

/**
 * The built-in texts. Pages use getDictionary() from "@/lib/dictionary", which applies the
 * texts edited in the admin on top of these.
 */
export function defaultDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export type { Dictionary };
export * from "./config";
