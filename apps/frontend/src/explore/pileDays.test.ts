import type { Explore } from "@drawing-app/api/client";
import { describe, expect, it } from "vitest";
import { people, sticker } from "../api/testFixtures";
import { nextRefill, ticketDay } from "../tickets/tickets";
import { dayBadge, dayKey, pileDays, spokenDay, ticketDayNumber } from "./pileDays";

const explore = (overrides: Partial<Explore>): Explore => ({
  todaysStickers: [],
  activity: [],
  leaderboards: {
    weekStart: "2026-09-20T15:00:00.000Z",
    mostGratitude: [],
    bestCombo: [],
    longestStreak: [],
  },
  ...overrides,
});

describe("ticketDayNumber", () => {
  it("turns over with the ticket day, at midnight in Tokyo", () => {
    const midnight = nextRefill(new Date("2026-09-26T12:00:00Z")).getTime();
    for (const ms of [midnight - 1, midnight]) {
      expect(dayKey(ticketDayNumber(ms))).toBe(ticketDay(new Date(ms)));
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
    const days = pileDays(
      explore({
        todaysStickers: [today2, today1],
        activity: [
          { type: "sealed", at: today2.sealedAt, sticker: today2 },
          { type: "sealed", at: today1.sealedAt, sticker: today1 },
          { type: "sealed", at: yesterday.sealedAt, sticker: yesterday },
        ],
      }),
    );
    expect(days.map(({ day }) => dayKey(day))).toEqual(["2026-09-26", "2026-09-25"]);
    expect(days.map(({ stickers }) => stickers.map((pile) => pile.sticker.id))).toEqual([
      [today1.id, today2.id],
      [yesterday.id],
    ]);
  });

  it("keeps a given sticker on the day it was sealed, tagged with who it last went to", () => {
    const given = sticker({ sealedAt: "2026-09-24T09:00:00.000Z" });
    const days = pileDays(
      explore({
        activity: [
          {
            type: "received",
            at: "2026-09-26T08:00:00.000Z",
            sticker: given,
            giver: people.ken,
            receiver: people.bob,
          },
          {
            type: "received",
            at: "2026-09-25T08:00:00.000Z",
            sticker: given,
            giver: people.mika,
            receiver: people.ken,
          },
        ],
      }),
    );
    expect(days).toHaveLength(1);
    expect(dayKey(days[0].day)).toBe("2026-09-24");
    expect(days[0].stickers).toEqual([{ sticker: given, givenTo: people.bob }]);
  });

  it("is empty when Explore has no stickers", () => {
    expect(pileDays(explore({}))).toEqual([]);
  });
});
