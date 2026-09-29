import { describe, expect, it } from "vitest";
import {
  addDays,
  nextTokyoTicketDayStart,
  tokyoTicketDay,
  tokyoTicketDayStart,
} from "./ticketDays.ts";

const HOUR_MS = 60 * 60 * 1000;
const TOKYO = "Asia/Tokyo";
const MIDNIGHT = 0;
// An ordinary day, and the last days of a month and of a year.
const DAYS = ["2026-01-15", "2026-09-30", "2026-12-31"];

/** `at`'s calendar date on Tokyo's clock, as `YYYY-MM-DD`. */
const tokyoDate = (at: Date) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TOKYO,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);

const tokyoHour = (at: Date) =>
  Number(
    new Intl.DateTimeFormat("en-US", { timeZone: TOKYO, hour: "numeric", hourCycle: "h23" }).format(
      at,
    ),
  );

describe("Tokyo ticket days", () => {
  it("run midnight to midnight, Tokyo time, and refill at the next midnight", () => {
    for (const day of DAYS) {
      const start = tokyoTicketDayStart(day);
      expect(tokyoHour(start)).toBe(MIDNIGHT);
      expect(tokyoDate(start)).toBe(day);
      expect(tokyoTicketDay(start)).toBe(day);
      expect(tokyoTicketDay(new Date(start.getTime() - 1))).toBe(addDays(day, -1));
      for (const ms of [start.getTime() - 1, start.getTime(), start.getTime() + 12 * HOUR_MS]) {
        const at = new Date(ms);
        const next = nextTokyoTicketDayStart(at);
        expect(next.getTime()).toBeGreaterThan(ms);
        expect(tokyoHour(next)).toBe(MIDNIGHT);
        expect(tokyoTicketDay(next)).toBe(addDays(tokyoTicketDay(at), 1));
      }
    }
  });
});
