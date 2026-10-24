// Run: npm test   (Node's built-in test runner, no extra packages)
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { editDistance, rankCars, tokenize, trigramSimilarity, type SearchableCar } from "./search.ts";

const CARS: SearchableCar[] = [
  { id: 1, brand: "Deepal", model: "S09", trim: "4WD Ultra+", year: 2026 },
  { id: 2, brand: "BYD", model: "Seal 06 DM-i", trim: null, year: 2026 },
  { id: 3, brand: "Zeekr", model: "7X", trim: "4WD Ultra 103", year: 2026 },
  { id: 4, brand: "Li Auto", model: "L7", trim: "Ultra", year: 2026 },
  { id: 5, brand: "Changan", model: "A07", trim: "550 Premium", year: 2026 },
  { id: 6, brand: "BYD", model: "Sea Lion 05", trim: "520 Smart", year: 2025 },
  { id: 7, brand: "Zeekr", model: "001", trim: "YOU", year: 2025 },
];

const search = (q: string) => rankCars(q, CARS);
const top = (q: string) => search(q).matches[0];

describe("tokenize", () => {
  it("lower-cases and splits on punctuation", () => {
    assert.deepEqual(tokenize("Li Auto L7 Ultra+"), ["li", "auto", "l7", "ultra"]);
    assert.deepEqual(tokenize("Seal 06 DM-i"), ["seal", "06", "dm", "i"]);
  });
  it("transliterates Russian and Armenian", () => {
    assert.deepEqual(tokenize("Зикр"), ["zikr"]);
    assert.deepEqual(tokenize("Չանգան"), ["changan"]);
    assert.deepEqual(tokenize("Բուրջ"), ["burj"]); // "ու" → u
  });
  it("drops accents and empty input", () => {
    assert.deepEqual(tokenize("Ëxéed"), ["exeed"]);
    assert.deepEqual(tokenize("  --  "), []);
  });
});

describe("editDistance", () => {
  it("counts edits and swapped letters", () => {
    assert.equal(editDistance("zeekr", "zeekr", 2), 0);
    assert.equal(editDistance("zekr", "zeekr", 2), 1);
    assert.equal(editDistance("zeerk", "zeekr", 2), 1); // swap
    assert.equal(editDistance("chnagan", "changan", 2), 1);
  });
  it("stops early above the limit", () => {
    assert.equal(editDistance("byd", "changan", 1), 2);
  });
});

describe("trigramSimilarity", () => {
  it("is 1 for equal strings and 0 for unrelated ones", () => {
    assert.equal(trigramSimilarity("zeekr", "zeekr"), 1);
    assert.equal(trigramSimilarity("byd", "qqq"), 0);
  });
});

describe("rankCars", () => {
  it("finds by brand, model and full name", () => {
    assert.deepEqual(search("byd").matches.sort(), [2, 6]);
    assert.equal(search("byd").total, 2);
    assert.equal(top("7x"), 3);
    assert.equal(top("Li Auto L7"), 4);
    assert.equal(top("seal 06"), 2);
  });

  it("puts the closest match first", () => {
    assert.equal(top("zeekr 7x"), 3);
    assert.equal(top("byd sea lion"), 6);
  });

  it("matches while the visitor is still typing", () => {
    assert.deepEqual(search("zee").matches.sort(), [3, 7]);
    assert.equal(top("chang"), 5);
  });

  it("tolerates typos", () => {
    assert.equal(top("chnagan"), 5);
    assert.deepEqual(search("zekr").matches.sort(), [3, 7]);
    assert.equal(top("deepl s09"), 1);
  });

  it("ignores spacing", () => {
    assert.equal(top("seal06"), 2);
    assert.equal(top("liauto"), 4);
    assert.equal(top("li auto l7 ultra"), 4);
  });

  it("understands Russian and Armenian spellings", () => {
    assert.deepEqual(search("зикр").matches.sort(), [3, 7]);
    assert.deepEqual(search("Զիկր").matches.sort(), [3, 7]);
    assert.deepEqual(search("бид").matches.sort(), [2, 6]);
    assert.equal(top("Չանգան"), 5);
  });

  it("filters by year only when a year is typed", () => {
    assert.deepEqual(search("zeekr 2025").matches, [7]);
    assert.deepEqual(search("byd 2026").matches, [2]);
  });

  it("offers similar cars when nothing matches exactly", () => {
    const r = search("zeekr 9x");
    assert.deepEqual(r.matches, []);
    assert.deepEqual(r.similar.sort(), [3, 7]);
  });

  it("doesn't call a car similar for a two-letter coincidence", () => {
    // "li" is the start of "Lion", but a Li Auto search shouldn't suggest the BYD Sea Lion.
    assert.ok(!search("li auto l7").similar.includes(6));
    assert.ok(!search("li auto l9").similar.includes(6));
    assert.deepEqual(search("li auto l9").similar, [4]);
  });

  it("never lists a car twice", () => {
    for (const q of ["byd", "zeekr 9x", "ultra", "seal"]) {
      const { matches, similar } = search(q);
      assert.equal(new Set([...matches, ...similar]).size, matches.length + similar.length, q);
    }
  });

  it("returns nothing for empty, one-letter or nonsense queries", () => {
    for (const q of ["", " ", "z", "%%%", "qwxzpt"]) {
      const r = search(q);
      assert.deepEqual(r.matches, [], q);
    }
    assert.deepEqual(search("qwxzpt").similar, []);
  });

  it("keeps the input order for equal scores", () => {
    assert.deepEqual(search("ultra").matches, [1, 3, 4]);
  });

  it("respects limits and very long input", () => {
    const limited = rankCars("byd", CARS, { limit: 1 });
    assert.equal(limited.matches.length, 1);
    assert.equal(limited.total, 2);
    assert.doesNotThrow(() => search("z".repeat(10_000)));
  });

  it("is fast enough for a large catalogue", () => {
    const many = Array.from({ length: 2000 }, (_, i) => ({ ...CARS[i % CARS.length], id: i }));
    const start = performance.now();
    rankCars("zeekr 7x ultra", many);
    assert.ok(performance.now() - start < 100, "2000 cars ranked in under 100 ms");
  });
});
