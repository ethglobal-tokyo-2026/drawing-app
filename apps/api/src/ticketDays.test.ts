import { describe, expect, it } from "vitest";
import {
  addDays,
  EXPLORE_DAY_START_HOUR,
  exploreDay,
  exploreDayStart,
  nextTokyoTicketDayStart,
  tokyoTicketDay,
  tokyoTicketDayStart,
} from "./ticketDays.ts";

const HOUR_MS = 60 * 60 * 1000;
const TOKYO = "Asia/Tokyo";
const MIDNIGHT = 0;

/** `at`'s calendar date on `timeZone`'s clock, as `YYYY-MM-DD`. */
const dateIn = (at: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(at);
// Tokyo keeps one offset all year; New York and London change their clocks, Lord Howe by half an hour.
const ZONES = ["Asia/Tokyo", "America/New_York", "Europe/London", "Australia/Lord_Howe"];
// An ordinary day, and each day in 2026 when one of those zones changes its clocks.
const DAYS = [
  "2026-01-15",
  "2026-03-08",
  "2026-03-29",
  "2026-04-05",
  "2026-10-04",
  "2026-10-25",
  "2026-11-01",
];

const hourIn = (at: Date, timeZone: string) =>
  Number(
    new Intl.DateTimeFormat("en-US", { timeZone, hour: "numeric", hourCycle: "h23" }).format(at),
  );

describe("Explore's days", () => {
  it("begin at EXPLORE_DAY_START_HOUR on the zone's own clock, even on days the clocks change", () => {
    for (const timeZone of ZONES) {
      for (const day of DAYS) {
        const start = exploreDayStart(day, timeZone);
        expect(hourIn(start, timeZone)).toBe(EXPLORE_DAY_START_HOUR);
        expect(exploreDay(start, timeZone)).toBe(day);
        expect(exploreDay(new Date(start.getTime() - 1), timeZone)).toBe(addDays(day, -1));
      }
    }
  });
});

describe("Tokyo ticket days", () => {
  it("run midnight to midnight, Tokyo time, and refill at the next midnight", () => {
    for (const day of DAYS) {
      const start = tokyoTicketDayStart(day);
      expect(hourIn(start, TOKYO)).toBe(MIDNIGHT);
      expect(dateIn(start, TOKYO)).toBe(day);
      expect(tokyoTicketDay(start)).toBe(day);
      expect(tokyoTicketDay(new Date(start.getTime() - 1))).toBe(addDays(day, -1));
      for (const ms of [start.getTime() - 1, start.getTime(), start.getTime() + 12 * HOUR_MS]) {
        const at = new Date(ms);
        const next = nextTokyoTicketDayStart(at);
        expect(next.getTime()).toBeGreaterThan(ms);
        expect(hourIn(next, TOKYO)).toBe(MIDNIGHT);
        expect(tokyoTicketDay(next)).toBe(addDays(tokyoTicketDay(at), 1));
      }
    }
  });
});
