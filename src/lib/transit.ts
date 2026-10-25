/*
 * Countdown for cars on the road. The admin enters "arrives in N days"; we store the date
 * (today + N, in Yerevan time). The site then shows the days left, computed on every request,
 * so it goes down by itself each day with no scheduled job. It never goes below 1: a car that is
 * late keeps showing "1 day" until someone changes its status (e.g. to In stock).
 *
 * Dates are plain "YYYY-MM-DD" strings, so no time-zone shifts sneak in.
 */

export const SHOP_TIME_ZONE = "Asia/Yerevan";
const DAY_MS = 86_400_000;
export const MAX_TRANSIT_DAYS = 365;

/** Today's date in the showroom's time zone, as "YYYY-MM-DD". */
export function today(now: Date = new Date(), timeZone = SHOP_TIME_ZONE): string {
  // en-CA formats dates as YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

const toUtc = (date: string) => Date.parse(`${date}T00:00:00Z`);
export const isIsoDate = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(toUtc(v));

/**
 * A DATE column as "YYYY-MM-DD". Drivers return a string (our parser) or, on a connection opened
 * before that parser was set, a Date at local midnight — read its local parts, not UTC.
 */
export function toIsoDate(v: unknown): string | null {
  if (isIsoDate(v)) return v;
  if (v instanceof Date && !Number.isNaN(v.getTime())) {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${v.getFullYear()}-${pad(v.getMonth() + 1)}-${pad(v.getDate())}`;
  }
  return null;
}

/** Days left for a car in transit, or null when there's no countdown. */
export function transitDays(status: string, arrival: unknown, now: Date = new Date()): number | null {
  const date = status === "IN_TRANSIT" ? toIsoDate(arrival) : null;
  return date ? daysLeft(date, now) : null;
}

/** The date `days` days after `from`. */
export function addDays(from: string, days: number): string {
  return new Date(toUtc(from) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Days from today until `arrival`, never less than 1 (frozen at 1 once due). */
export function daysLeft(arrival: string, now: Date = new Date()): number {
  const diff = Math.round((toUtc(arrival) - toUtc(today(now))) / DAY_MS);
  return Math.max(1, diff);
}
