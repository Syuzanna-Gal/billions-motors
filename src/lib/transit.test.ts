// Run: npm test
import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { addDays, daysLeft, isIsoDate, toIsoDate, today, transitDays } from "./transit.ts";

describe("transit countdown", () => {
  it("uses the Yerevan date, not the server's", () => {
    // 21:30 UTC on Oct 25 is already Oct 26 in Yerevan (UTC+4).
    assert.equal(today(new Date("2026-10-25T21:30:00Z")), "2026-10-26");
    assert.equal(today(new Date("2026-10-25T19:59:00Z")), "2026-10-25");
  });

  it("adds days across month and year ends", () => {
    assert.equal(addDays("2026-10-25", 31), "2026-11-25");
    assert.equal(addDays("2026-12-20", 15), "2027-01-04");
    assert.equal(addDays("2028-02-28", 1), "2028-02-29");
  });

  it("goes down by one each day", () => {
    const set = new Date("2026-10-25T08:00:00Z");
    const arrival = addDays(today(set), 31);
    assert.equal(daysLeft(arrival, set), 31);
    assert.equal(daysLeft(arrival, new Date("2026-10-26T08:00:00Z")), 30);
    assert.equal(daysLeft(arrival, new Date("2026-11-24T08:00:00Z")), 1);
  });

  it("freezes at 1 day when the car is late", () => {
    const arrival = "2026-11-25";
    assert.equal(daysLeft(arrival, new Date("2026-11-25T08:00:00Z")), 1);
    assert.equal(daysLeft(arrival, new Date("2026-12-31T08:00:00Z")), 1);
  });

  it("changes at midnight Yerevan time", () => {
    const arrival = "2026-11-01";
    assert.equal(daysLeft(arrival, new Date("2026-10-30T19:59:00Z")), 2); // 23:59 Oct 30 in Yerevan
    assert.equal(daysLeft(arrival, new Date("2026-10-30T20:00:00Z")), 1); // 00:00 Oct 31
  });

  it("counts down only while the car is in transit", () => {
    const now = new Date("2026-10-25T08:00:00Z");
    assert.equal(transitDays("IN_TRANSIT", "2026-11-25", now), 31);
    assert.equal(transitDays("IN_STOCK", "2026-11-25", now), null);
    assert.equal(transitDays("IN_TRANSIT", null, now), null);
  });

  it("reads dates from either driver form", () => {
    assert.equal(toIsoDate("2026-11-25"), "2026-11-25");
    assert.equal(toIsoDate(new Date(2026, 10, 25)), "2026-11-25"); // local midnight
    assert.equal(toIsoDate("junk"), null);
  });

  it("validates dates", () => {
    assert.ok(isIsoDate("2026-10-25"));
    assert.ok(!isIsoDate("2026-13-01"));
    assert.ok(!isIsoDate("25.10.2026"));
    assert.ok(!isIsoDate(null));
  });
});
