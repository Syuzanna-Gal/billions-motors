/*
 * Car search: ranks cars by how well their name matches what the visitor typed.
 *
 * Pure functions with no database or framework imports, so they are unit tested directly
 * (search.test.ts). The catalogue is small (hundreds of cars), so ranking in memory takes well
 * under a millisecond and handles what a plain SQL LIKE can't, with no database extensions:
 *   - typos:                    "zekr" → Zeekr, "chnagan" → Changan
 *   - Armenian/Russian input:   "Զիկր", "зикр", "бид" → Zeekr, BYD
 *   - spacing:                  "seal06" → Seal 06, "liauto" → Li Auto
 *   - partial typing:           "zee" → Zeekr (for the live suggestions)
 *
 * Results come in two groups: `matches` (every word found) and `similar` (close but not
 * exact, e.g. other models of the same brand), so "Zeekr 9X" still shows the Zeekrs we have.
 */

export interface SearchableCar {
  id: number;
  brand: string;
  model: string;
  trim: string | null;
  year: number;
}

export interface RankedIds {
  /** Cars matching every word of the query, best first. */
  matches: number[];
  /** Cars that are close (same brand, a typo too far, …), best first. Never overlaps `matches`. */
  similar: number[];
  /** All matching cars, before `limit`. */
  total: number;
}

export const MAX_QUERY_LENGTH = 80;
/** Shorter queries return nothing: one letter matches almost every car. */
export const MIN_QUERY_LENGTH = 2;

/* ------------------------------------------------------------------ normalisation */

// Armenian and Cyrillic letters → Latin, so "Զիկր" / "Зикр" can be compared with "Zeekr".
const TRANSLIT: Record<string, string> = {
  // Russian
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k",
  л: "l", м: "m", н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
  // Armenian ("ու" is handled before this table)
  ա: "a", բ: "b", գ: "g", դ: "d", ե: "e", զ: "z", է: "e", ը: "y", թ: "t", ժ: "zh", ի: "i", լ: "l",
  խ: "kh", ծ: "ts", կ: "k", հ: "h", ձ: "dz", ղ: "gh", ճ: "ch", մ: "m", յ: "y", ն: "n", շ: "sh",
  ո: "o", չ: "ch", պ: "p", ջ: "j", ռ: "r", ս: "s", վ: "v", տ: "t", ր: "r", ց: "ts", փ: "p",
  ք: "k", և: "ev", օ: "o", ֆ: "f",
};

/**
 * Lower-case Latin words: accents removed, Armenian/Cyrillic transliterated,
 * punctuation turned into spaces. "Li Auto L7 Ultra+" → ["li", "auto", "l7", "ultra"].
 */
export function tokenize(text: string): string[] {
  const latin = text
    .normalize("NFKD")
    .replace(/\p{M}/gu, "") // combining accents
    .toLowerCase()
    .replace(/ու/g, "u")
    .replace(/[Ѐ-ӿԱ-և]/g, (ch) => TRANSLIT[ch] ?? ch);
  return latin.split(/[^a-z0-9]+/).filter(Boolean);
}

/**
 * Other spellings people use for brand names — in Russian/Armenian (already transliterated
 * by `tokenize`) or common romanisations. Matched like extra words of the car's name.
 * Keys are the brand as tokenised.
 */
const BRAND_ALIASES: Record<string, string[]> = {
  byd: ["bid", "biyd", "bi di"],
  zeekr: ["zikr", "zeker", "zekr", "zeekar"],
  changan: ["chanan", "chang an"],
  "li auto": ["lixiang", "li xiang", "li avto", "liauto"],
  deepal: ["dipal"],
  geely: ["dzhili", "jili", "djili"],
  chery: ["cheri"],
  haval: ["khaval", "khavejl"],
  jetour: ["dzhetur", "jetur", "djetur"],
  exeed: ["eksid", "exid", "ekseed"],
  hongqi: ["khunci", "hunchi", "honchi"],
  voyah: ["voya", "voyakh"],
  avatr: ["avatar"],
  xpeng: ["ekspeng", "xpen"],
  leapmotor: ["lipmotor"],
  tank: ["tanq"],
  aito: ["ayto"],
};

/* ------------------------------------------------------------------ string distance */

/**
 * Optimal-string-alignment distance (Levenshtein + swapped neighbours, "zeerk" → "zeekr" = 1).
 * Gives up early and returns `max + 1` once the distance is known to exceed `max`.
 */
export function editDistance(a: string, b: string, max: number): number {
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev2: number[] = [];
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, prev2[j - 2] + 1);
      cur.push(d);
      if (d < rowMin) rowMin = d;
    }
    if (rowMin > max) return max + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[b.length];
}

/** Trigram similarity in [0, 1], like PostgreSQL's pg_trgm. Used for whole-name closeness. */
export function trigramSimilarity(a: string, b: string): number {
  const grams = (s: string) => {
    const padded = `  ${s} `;
    const set = new Set<string>();
    for (let i = 0; i < padded.length - 2; i++) set.add(padded.slice(i, i + 3));
    return set;
  };
  const ga = grams(a);
  const gb = grams(b);
  let shared = 0;
  for (const g of ga) if (gb.has(g)) shared++;
  return shared / (ga.size + gb.size - shared || 1);
}

/* ------------------------------------------------------------------ scoring */

/** A car prepared for matching once per search. */
interface Doc {
  id: number;
  order: number;
  words: string[]; // name words, brand aliases and the year
  compact: string; // all name words without spaces: "bydseal06dmi"
  nameCompact: string; // brand + model only, for trigram closeness
  year: string;
}

function toDoc(car: SearchableCar, order: number): Doc {
  const brandWords = tokenize(car.brand);
  const nameWords = [...brandWords, ...tokenize(car.model), ...tokenize(car.trim ?? "")];
  const aliases = (BRAND_ALIASES[brandWords.join(" ")] ?? []).map(tokenize);
  return {
    id: car.id,
    order,
    words: [...nameWords, ...aliases.flat()],
    // Space-separated so a match can't run from one spelling into the next.
    compact: [nameWords.join(""), ...aliases.map((a) => a.join(""))].join(" "),
    nameCompact: [...brandWords, ...tokenize(car.model)].join(""),
    year: String(car.year),
  };
}

const isYear = (w: string) => /^(19|20)\d{2}$/.test(w);

/** How many typos a word of this length may have and still count. */
const typoBudget = (len: number) => (len >= 8 ? 2 : len >= 4 ? 1 : 0);

// Scores for one query word against one car, from strongest to weakest evidence.
const EXACT = 1;
const PREFIX = 0.9; // "zee" while typing "zeekr"
const INSIDE = 0.8; // "seal06" inside "bydseal06dmi"
const TYPO_1 = 0.75;
const TYPO_2 = 0.65;
/** A word scoring at least this counts as found. */
const FOUND = 0.6;

function wordScore(q: string, doc: Doc): number {
  if (isYear(q)) return q === doc.year ? EXACT : 0;
  let best = 0;
  const budget = typoBudget(q.length);
  for (const w of doc.words) {
    if (w === q) return EXACT;
    if (w.startsWith(q)) best = Math.max(best, PREFIX);
    else if (budget > 0 && best < TYPO_1) {
      // Compare with the whole word and with its start (the visitor may still be typing).
      const d = Math.min(editDistance(q, w, budget), w.length > q.length ? editDistance(q, w.slice(0, q.length), budget) : budget + 1);
      if (d <= budget) best = Math.max(best, d <= 1 ? TYPO_1 : TYPO_2); // d > budget means "too different"
    }
  }
  if (best < INSIDE && q.length >= 3 && doc.compact.includes(q)) best = INSIDE;
  return best;
}

interface Scored {
  doc: Doc;
  score: number;
  matched: boolean;
}

function scoreDoc(queryWords: string[], queryCompact: string, doc: Doc): Scored {
  const scores = queryWords.map((q) => wordScore(q, doc));
  let score = scores.reduce((a, b) => a + b, 0) / scores.length;
  let matched = scores.every((s) => s >= FOUND);

  // The whole query typed without spaces: "liautol7", "seal06dmi". A typed year must still match.
  const yearsOk = queryWords.every((q, i) => !isYear(q) || scores[i] === EXACT);
  if (!matched && yearsOk && queryCompact.length >= 4 && doc.compact.includes(queryCompact)) {
    score = Math.max(score, INSIDE);
    matched = true;
  }
  if (!matched) {
    // Not every word was found: keep it as "similar" if it shares a real word (not just the
    // first two letters of one, "li" in "Lion") or is close as a whole.
    const sharesWord = scores.some((s, i) => s === EXACT || (s >= FOUND && queryWords[i].length >= 3));
    const shared = sharesWord ? score : 0;
    score = Math.max(shared, trigramSimilarity(queryCompact, doc.nameCompact));
  }
  return { doc, score, matched };
}

/** Below this a non-matching car isn't shown as similar. */
const SIMILAR_MIN = 0.3;

/**
 * Ranks `cars` for `query`. Ties keep the input order, so pass cars already sorted the way
 * the site lists them (featured, newest).
 */
export function rankCars(
  query: string,
  cars: readonly SearchableCar[],
  { limit = 60, similarLimit = 6 }: { limit?: number; similarLimit?: number } = {},
): RankedIds {
  const trimmed = query.trim().slice(0, MAX_QUERY_LENGTH);
  const queryWords = [...new Set(tokenize(trimmed))].slice(0, 8);
  const queryCompact = queryWords.filter((w) => !isYear(w)).join("");
  if (trimmed.length < MIN_QUERY_LENGTH || queryWords.length === 0) return { matches: [], similar: [], total: 0 };

  const scored = cars.map((car, i) => scoreDoc(queryWords, queryCompact, toDoc(car, i)));
  const byScore = (a: Scored, b: Scored) => b.score - a.score || a.doc.order - b.doc.order;

  const matches = scored.filter((s) => s.matched).sort(byScore);
  const similar = scored.filter((s) => !s.matched && s.score >= SIMILAR_MIN).sort(byScore);
  return {
    matches: matches.slice(0, limit).map((s) => s.doc.id),
    similar: similar.slice(0, similarLimit).map((s) => s.doc.id),
    total: matches.length,
  };
}
