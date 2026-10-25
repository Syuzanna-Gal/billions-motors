/*
 * Site texts edited in the admin. The built-in texts (src/i18n/*.ts) stay the defaults; the admin
 * stores only what was changed, as (key, locale) → value, and those win when a page is rendered.
 * Keys are dotted paths into the dictionary: "home.titleStart", "home.steps.0.title", "pages.about.body".
 *
 * Pure functions (no database), unit tested in text-overrides.test.ts.
 */

/** One editable text. Lists of strings (paragraphs, ticker items) are edited as one field. */
export interface TextField {
  key: string;
  kind: "text" | "list";
}

type Json = string | Json[] | { [k: string]: Json };

/** Every editable text in a dictionary, in reading order. */
export function listFields(dict: Json, prefix = ""): TextField[] {
  if (typeof dict === "string") return [{ key: prefix, kind: "text" }];
  if (Array.isArray(dict)) {
    if (dict.every((v) => typeof v === "string")) return [{ key: prefix, kind: "list" }];
    return dict.flatMap((v, i) => listFields(v, join(prefix, String(i))));
  }
  return Object.entries(dict).flatMap(([k, v]) => listFields(v, join(prefix, k)));
}

const join = (a: string, b: string) => (a ? `${a}.${b}` : b);

/** The value at a dotted path, or undefined. */
export function getAt(dict: Json, key: string): Json | undefined {
  let node: Json | undefined = dict;
  for (const part of key.split(".")) {
    if (node === undefined || typeof node === "string") return undefined;
    node = Array.isArray(node) ? node[Number(part)] : node[part];
  }
  return node;
}

/** Lists are stored and edited as one text: items separated by a blank line. */
export const listToText = (items: string[]) => items.join("\n\n");
export const textToList = (text: string) =>
  text.split(/\n\s*\n/).map((s) => s.trim()).filter(Boolean);

/** The field's value as edited in the admin (lists joined into one text). */
export function fieldText(dict: Json, field: TextField): string {
  const v = getAt(dict, field.key);
  if (field.kind === "list") return Array.isArray(v) ? listToText(v as string[]) : "";
  return typeof v === "string" ? v : "";
}

/**
 * A copy of `dict` with the overrides applied. Unknown keys (e.g. a text removed in a later
 * version of the site) and values of the wrong shape are ignored, so a stale override can't break a page.
 */
export function applyOverrides<T>(dict: T, overrides: Map<string, string>): T {
  if (overrides.size === 0) return dict;
  const copy = structuredClone(dict) as Json;
  for (const [key, value] of overrides) {
    const parts = key.split(".");
    const last = parts.pop()!;
    const parent = parts.length ? getAt(copy, parts.join(".")) : copy;
    if (parent === undefined || typeof parent === "string") continue;
    const current = Array.isArray(parent) ? parent[Number(last)] : parent[last];
    if (typeof current === "string") setChild(parent, last, value);
    else if (Array.isArray(current) && current.every((v) => typeof v === "string")) {
      const items = textToList(value);
      if (items.length) setChild(parent, last, items);
    }
  }
  return copy as T;
}

function setChild(parent: Json[] | { [k: string]: Json }, key: string, value: Json) {
  if (Array.isArray(parent)) parent[Number(key)] = value;
  else parent[key] = value;
}

/** "{count}", "{q}": values the site fills in. An edited text must keep the same ones. */
export const placeholders = (text: string) => [...new Set(text.match(/\{\w+\}/g) ?? [])].sort();

export function checkPlaceholders(defaultText: string, edited: string): string | null {
  const need = placeholders(defaultText);
  const have = placeholders(edited);
  const missing = need.filter((p) => !have.includes(p));
  const extra = have.filter((p) => !need.includes(p));
  if (missing.length) return `Keep ${missing.join(", ")} in the text — the site fills it in.`;
  if (extra.length) return `${extra.join(", ")} isn't filled in here — remove it.`;
  return null;
}

/** "home.steps.0.title" → "Steps 1 · Title" (the section is shown separately). */
export function fieldLabel(key: string, dropPrefix: number): string {
  return key
    .split(".")
    .slice(dropPrefix)
    .map((p) => (/^\d+$/.test(p) ? String(Number(p) + 1) : humanize(p)))
    .join(" · ");
}

const humanize = (s: string) => {
  const words = s.replace(/[-_]/g, " ").replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
};
