import { TOKYO_UTC_OFFSET_MS, tokyoTicketDay, type Sticker } from "@drawing-app/api/client";
import { describe, expect, it } from "vitest";
import { sticker } from "../api/testFixtures";
import { dayBadge, dayKey, pileDays, spokenDay, ticketDayNumber } from "./pileDays";

/** Stickers as a page of the pile holds them, none given. */
const piled = (...stickers: Sticker[]) => stickers.map((s) => ({ sticker: s, givenTo: null }));

describe("ticketDayNumber", () => {
  it("turns over with the ticket day, at midnight in Tokyo", () => {
    const midnight = Date.parse("2026-09-27") - TOKYO_UTC_OFFSET_MS;
    for (const ms of [midnight - 1, midnight]) {
      expect(dayKey(ticketDayNumber(ms))).toBe(tokyoTicketDay(new Date(ms)));
    }
    expect(ticketDayNumber(midnight) - ticketDayNumber(midnight - 1)).toBe(1);
  });

  it("prints a day's badge and says it in the app's language", () => {
    const day = ticketDayNumber(Date.parse("2026-09-24T03:00:00Z"));
    expect(dayBadge(day)).toBe("9.24");
    expect(spokenDay(day, "en")).toBe("September 24");
    expect(spokenDay(day, "ja")).toBe("9月24日");
  });
});

describe("pileDays", () => {
  it("lays each sticker on the day it was sealed, newest day first and oldest sticker first", () => {
    const today1 = sticker({ sealedAt: "2026-09-26T05:00:00.000Z" });
    const today2 = sticker({ sealedAt: "2026-09-26T09:00:00.000Z" });
    const yesterday = sticker({ sealedAt: "2026-09-25T09:00:00.000Z" });
    const days = pileDays(piled(today2, today1, yesterday));
    expect(days.map(({ day }) => dayKey(day))).toEqual(["2026-09-26", "2026-09-25"]);
    expect(days.map(({ stickers }) => stickers.map((pile) => pile.sticker.id))).toEqual([
      [today1.id, today2.id],
      [yesterday.id],
    ]);
  });

  it("is empty when the pile has no stickers", () => {
    expect(pileDays([])).toEqual([]);
  });
});
