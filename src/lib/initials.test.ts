import { test } from "node:test";
import assert from "node:assert/strict";
import { initials } from "./initials.ts";

test("initials for a name shown without a logo", () => {
  assert.equal(initials("Ameria Bank"), "AB");
  assert.equal(initials("Ардшинбанк"), "АР");
  assert.equal(initials("  Ինեկոբանկ "), "ԻՆ");
  assert.equal(initials("ACBA Bank Armenia"), "AB");
  assert.equal(initials(""), "");
});
