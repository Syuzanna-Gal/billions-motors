import { test } from "node:test";
import assert from "node:assert/strict";
import { cellName, comboStock, firstAvailable, paintStock, parseStockGrid, totalStock, type ColourStock } from "./colour-stock.ts";

const rows: ColourStock[] = [
  { exteriorId: 1, interiorId: 10, stock: 2 },
  { exteriorId: 1, interiorId: 11, stock: 1 },
  { exteriorId: 2, interiorId: 10, stock: 0 },
  { exteriorId: 2, interiorId: 11, stock: 0 },
  { exteriorId: 3, interiorId: 10, stock: 0 },
  { exteriorId: 3, interiorId: 11, stock: 4 },
];

test("paint stock adds up every interior of that paint", () => {
  assert.equal(paintStock(rows, 1), 3);
  assert.equal(paintStock(rows, 2), 0);
  assert.equal(paintStock(rows, 99), 0);
});

test("combo and total stock", () => {
  assert.equal(comboStock(rows, 3, 11), 4);
  assert.equal(comboStock(rows, 3, 12), 0);
  assert.equal(totalStock(rows), 7);
});

test("the car page opens on the first colour that has units", () => {
  assert.equal(firstAvailable([2, 3, 1], (id) => paintStock(rows, id)), 1);
  assert.equal(firstAvailable([2], (id) => paintStock(rows, id)), 0);
  assert.equal(firstAvailable([], () => 1), 0);
});

const form = (values: Record<string, string>) => (name: string) => values[name] ?? null;

test("grid: empty boxes are 0 once anything is filled", () => {
  const r = parseStockGrid(form({ [cellName(1, 10)]: "2", [cellName(2, 11)]: " 1 " }), [1, 2], [10, 11]);
  assert.deepEqual(r, {
    mode: "save",
    cells: [
      { exteriorId: 1, interiorId: 10, stock: 2 },
      { exteriorId: 1, interiorId: 11, stock: 0 },
      { exteriorId: 2, interiorId: 10, stock: 0 },
      { exteriorId: 2, interiorId: 11, stock: 1 },
    ],
  });
});

test("grid: all empty = stop counting by colour", () => {
  assert.deepEqual(parseStockGrid(form({}), [1, 2], [10]), { mode: "clear" });
});

test("grid: a car without interior options has one box per paint", () => {
  const r = parseStockGrid(form({ "cs:1:0": "3" }), [1], []);
  assert.deepEqual(r, { mode: "save", cells: [{ exteriorId: 1, interiorId: null, stock: 3 }] });
});

test("grid: rejects negatives, decimals, text and huge numbers", () => {
  for (const bad of ["-1", "1.5", "two", "1000"]) {
    const r = parseStockGrid(form({ "cs:1:0": bad }), [1], []);
    assert.deepEqual(r, { mode: "error", badCells: ["cs:1:0"] }, bad);
  }
});

test("grid: ignores boxes for colours the car doesn't have", () => {
  const r = parseStockGrid(form({ "cs:7:0": "5" }), [1], []);
  assert.deepEqual(r, { mode: "clear" });
});
