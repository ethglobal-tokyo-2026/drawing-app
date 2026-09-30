import { describe, expect, it } from "vitest";
import { FRESH_TICKETS } from "../api/testing";
import { formatRefillTime } from "./refill";
import { describeTickets, nextKind, ticketView, type Tickets } from "./tickets";

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
  it("spends daily tickets before reserve ones, then runs out", () => {
    expect(nextKind({ ...FRESH_TICKETS, reserveLeft: 2 })).toBe("daily");
    expect(nextKind({ ...FRESH_TICKETS, dailyLeft: 0, reserveLeft: 2 })).toBe("reserve");
    expect(nextKind({ ...FRESH_TICKETS, dailyLeft: 0, reserveLeft: 0 })).toBeNull();
  });

  it("leads with the day's stubs while daily tickets are left: fresh first, then the used ones newest first", () => {
    const view = ticketView({
      ...FRESH_TICKETS,
      dailyLeft: 1,
      reserveLeft: 5,
      usedToday: [use(0, "daily", "M0 0L1 1Z"), use(1, "daily")],
    });
    expect(view).toEqual({
      show: "daily",
      daily: 1,
      stubs: [{ used: false }, { used: true }, { used: true, outline: "M0 0L1 1Z" }],
      reserve: 5,
    });
  });

  it("puts one reserve ticket in the daily slots' place once they're used", () => {
    const usedToday = [0, 1, 2].map((i) => use(i, "daily"));
    expect(ticketView({ ...FRESH_TICKETS, dailyLeft: 0, reserveLeft: 3, usedToday })).toEqual({
      show: "reserve",
      reserve: 3,
    });
  });

  it("shows the used day, and leaves reserve uses off it, once nothing is left", () => {
    const usedToday = [0, 1, 2].map((i) => use(i, "daily")).concat(use(3, "reserve", "M0 0Z"));
    const refill = utc(24, 15);
    const view = ticketView({
      ...FRESH_TICKETS,
      dailyLeft: 0,
      reserveLeft: 0,
      usedToday,
      nextRefillAt: refill.toISOString(),
    });
    expect(view).toEqual({
      show: "none",
      stubs: [{ used: true }, { used: true }, { used: true }],
      reserve: 0,
      refillAt: refill,
    });
  });

  it("names only the tickets there are", () => {
    const usedToday = [0, 1].map((i) => use(i, "daily"));
    const one = { ...FRESH_TICKETS, dailyLeft: 1, usedToday };
    expect(describeTickets(one)).toBe("1 daily ticket left");
    expect(describeTickets({ ...one, reserveLeft: 5 })).toBe(
      "1 daily ticket and 5 reserve tickets left",
    );
    expect(describeTickets({ ...one, dailyLeft: 0, reserveLeft: 1 })).toBe("1 reserve ticket left");
    const none = { ...one, dailyLeft: 0, nextRefillAt: utc(24, 15).toISOString() };
    expect(describeTickets(none)).toBe(`no tickets until ${formatRefillTime(utc(24, 15))}`);
  });
});
