// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { sticker } from "../api/testFixtures";
import { exploreDay, type PileDay } from "./pileDays";
import { arrivalsOf, FALL_MAX, lastSeen, markSeen } from "./pileVisits";

const TODAY = exploreDay(Date.parse("2026-09-26T12:00:00Z"));
/** `hour` o'clock in Tokyo on September `day`. */
const at = (hour: number, day = 26) =>
  new Date(Date.UTC(2026, 8, day) + (hour - 9) * 3_600_000).toISOString();

/** Today's stickers sealed on the hour at each of `hours`, Tokyo time, oldest first. */
const todayAt = (hours: number[]): PileDay => ({
  day: TODAY,
  stickers: hours.map((hour) => ({ sticker: sticker({ sealedAt: at(hour) }), givenTo: null })),
});

afterEach(() => localStorage.clear());

describe("arrivalsOf", () => {
  it("drops today's newest stickers on a first look, with no NEW pips", () => {
    const today = todayAt(Array.from({ length: 20 }, (_, i) => 5 + i * 0.5));
    const { fresh, falling } = arrivalsOf([today], TODAY, null);
    expect(fresh.size).toBe(0);
    expect(falling).toEqual(today.stickers.slice(-FALL_MAX).map((pile) => pile.sticker.id));
  });

  it("drops only what's new since the last look, and marks it NEW", () => {
    const today = todayAt([6, 7, 8, 9]);
    const seen = Date.parse(at(7));
    const { fresh, falling } = arrivalsOf([today], TODAY, seen);
    const newOnes = today.stickers.slice(2).map((pile) => pile.sticker.id);
    expect([...fresh]).toEqual(newOnes);
    expect(falling).toEqual(newOnes);
  });

  it("drops nothing when nothing is new", () => {
    const today = todayAt([6, 7]);
    const { fresh, falling, newest } = arrivalsOf([today], TODAY, Date.parse(at(7)));
    expect(fresh.size).toBe(0);
    expect(falling).toEqual([]);
    expect(newest).toBe(Date.parse(at(7)));
  });

  it("marks a new sticker on an older day NEW without dropping it through today's heap", () => {
    const yesterday: PileDay = {
      day: TODAY - 1,
      stickers: [{ sticker: sticker({ sealedAt: at(23, 25) }), givenTo: null }],
    };
    const { fresh, falling } = arrivalsOf([todayAt([]), yesterday], TODAY, Date.parse(at(20, 25)));
    expect([...fresh]).toEqual([yesterday.stickers[0].sticker.id]);
    expect(falling).toEqual([]);
  });
});

describe("the last look", () => {
  it("is remembered per person on this device", () => {
    expect(lastSeen("me")).toBeNull();
    markSeen("me", 1234);
    expect(lastSeen("me")).toBe(1234);
    expect(lastSeen("someone else")).toBeNull();
  });
});
