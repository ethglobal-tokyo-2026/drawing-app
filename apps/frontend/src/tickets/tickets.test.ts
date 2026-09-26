import { describe, expect, it } from "vitest";
import { FRESH_TICKETS } from "../api/testing";
import { dailyTickets, nextKind, nextRefill, ticketDay, type Tickets } from "./tickets";

/** A moment in UTC; Tokyo is 9 hours ahead, so 15:00 UTC is Tokyo's midnight. */
const utc = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 8, d, h, m));

type Use = Tickets["usedToday"][number];
const use = (dayIndex: number, kind: Use["kind"], outline?: string): Use => ({
  id: dayIndex + 1,
  dayIndex,
  kind,
  sticker: outline ? { id: `s-${dayIndex}`, outline, width: 10, height: 10 } : null,
});

describe("tickets", () => {
  it("starts each ticket day at midnight in Tokyo, wherever the device is", () => {
    expect(ticketDay(utc(24, 14, 59))).toBe("2026-09-24");
    expect(ticketDay(utc(24, 15))).toBe("2026-09-25");
  });

  it("finds the next Tokyo midnight", () => {
    expect(nextRefill(utc(24, 14, 59))).toEqual(utc(24, 15));
    expect(nextRefill(utc(24, 15))).toEqual(utc(25, 15));
    expect(nextRefill(utc(30, 16))).toEqual(new Date(Date.UTC(2026, 9, 1, 15)));
  });

  it("spends daily tickets before reserve ones, then runs out", () => {
    expect(nextKind({ ...FRESH_TICKETS, reserveLeft: 2 })).toBe("daily");
    expect(nextKind({ ...FRESH_TICKETS, dailyLeft: 0, reserveLeft: 2 })).toBe("reserve");
    expect(nextKind({ ...FRESH_TICKETS, dailyLeft: 0, reserveLeft: 0 })).toBeNull();
  });

  it("stubs the day's daily tickets in order, each used one with the outline it became", () => {
    const stubs = dailyTickets({
      ...FRESH_TICKETS,
      dailyLeft: 1,
      usedToday: [use(0, "daily", "M0 0L1 1Z"), use(1, "daily")],
    });
    expect(stubs).toEqual([{ used: true, outline: "M0 0L1 1Z" }, { used: true }, { used: false }]);
  });

  it("leaves reserve tickets off the daily stubs", () => {
    const usedToday = [0, 1, 2].map((i) => use(i, "daily")).concat(use(3, "reserve", "M0 0Z"));
    const stubs = dailyTickets({ ...FRESH_TICKETS, dailyLeft: 0, usedToday });
    expect(stubs).toEqual([{ used: true }, { used: true }, { used: true }]);
  });
});
