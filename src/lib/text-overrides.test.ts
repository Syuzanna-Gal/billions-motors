// Run: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  applyOverrides, checkPlaceholders, fieldLabel, fieldText, getAt, listFields, textToList,
} from "./text-overrides.ts";

const dict = {
  home: {
    title: "Drive what others wait for.",
    steps: [
      { title: "Choose", text: "Browse cars." },
      { title: "Handover", text: "Get the keys." },
    ],
  },
  ticker: ["Warranty", "Financing"],
  catalog: { showing: "Showing {count} cars" },
  units: { days: { one: "day", other: "days" } },
};

describe("text overrides", () => {
  it("lists every editable text, lists of strings as one field", () => {
    assert.deepEqual(listFields(dict), [
      { key: "home.title", kind: "text" },
      { key: "home.steps.0.title", kind: "text" },
      { key: "home.steps.0.text", kind: "text" },
      { key: "home.steps.1.title", kind: "text" },
      { key: "home.steps.1.text", kind: "text" },
      { key: "ticker", kind: "list" },
      { key: "catalog.showing", kind: "text" },
      { key: "units.days.one", kind: "text" },
      { key: "units.days.other", kind: "text" },
    ]);
  });

  it("applies overrides without touching the defaults", () => {
    const out = applyOverrides(dict, new Map([
      ["home.title", "New title"],
      ["home.steps.1.text", "Keys in hand."],
      ["ticker", "Warranty\n\nFinancing\n\nTest drives"],
    ]));
    assert.equal(out.home.title, "New title");
    assert.equal(out.home.steps[1].text, "Keys in hand.");
    assert.deepEqual(out.ticker, ["Warranty", "Financing", "Test drives"]);
    assert.equal(dict.home.title, "Drive what others wait for.");
    assert.deepEqual(dict.ticker, ["Warranty", "Financing"]);
  });

  it("ignores stale or wrongly shaped overrides", () => {
    const out = applyOverrides(dict, new Map([
      ["home.removed", "x"],
      ["home.steps", "not an object list"],
      ["home.steps.9.title", "x"],
      ["ticker", "   \n\n  "],
    ]));
    assert.deepEqual(out, dict);
  });

  it("reads field values, lists joined by blank lines", () => {
    assert.equal(fieldText(dict, { key: "ticker", kind: "list" }), "Warranty\n\nFinancing");
    assert.equal(fieldText(dict, { key: "home.steps.0.text", kind: "text" }), "Browse cars.");
    assert.equal(getAt(dict, "home.nope.deeper"), undefined);
    assert.deepEqual(textToList("a\n\n\nb\n \nc"), ["a", "b", "c"]);
  });

  it("requires the same placeholders", () => {
    assert.equal(checkPlaceholders("Showing {count} cars", "{count} cars found"), null);
    assert.match(checkPlaceholders("Showing {count} cars", "Cars")!, /Keep \{count\}/);
    assert.match(checkPlaceholders("Showing cars", "Showing {q}")!, /remove it/);
  });

  it("makes readable labels", () => {
    assert.equal(fieldLabel("home.steps.0.title", 1), "Steps · 1 · Title");
    assert.equal(fieldLabel("home.titleStart", 1), "Title start");
    assert.equal(fieldLabel("pages.import-process.body", 1), "Import process · Body");
  });
});
