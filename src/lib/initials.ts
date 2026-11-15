/** Pure helper, unit tested in initials.test.ts. */

/** Initials for a name shown without a logo: "Ameria Bank" → "AB", "Ինեկոբանկ" → "ԻՆ". */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const letters = words.length > 1 ? words.slice(0, 2).map((w) => [...w][0]) : [...(words[0] ?? "")].slice(0, 2);
  return letters.join("").toUpperCase();
}
