import { describe, expect, it } from "vitest";
import type { PersonView } from "../api/views";
import { artistShareLine, defaultOpenRow, type TrailRow } from "./trailRows";

const who = (id: string): PersonView => ({ id, handle: id, name: id });
const [me, mika, ken] = [who("me"), who("mika"), who("ken")];

const row = (
  giftId: string,
  giver: PersonView,
  receiver: PersonView,
  gratitude: TrailRow["gratitude"] = null,
): TrailRow => ({ giftId, giver, receiver, receivedAt: 0, gratitude });

describe("the Transfer Trail", () => {
  it("opens the most recent thanks, and none while you owe thanks for the newest gift", () => {
    const thanked = row("old", ken, mika, { total: 600, artistShare: 0 });
    expect(defaultOpenRow([row("new", mika, ken), thanked], "me")).toBe("old");
    expect(defaultOpenRow([row("new", mika, me), thanked], "me")).toBeNull();
  });

  it("splits the artist's share out of the giver's part, in plain words", () => {
    const thanks = { total: 2946, artistShare: 589 };
    expect(artistShareLine(row("g", ken, me, thanks), mika, "me")).toBe(
      "2,357 to @ken · 589 to @mika, its artist",
    );
    expect(artistShareLine(row("g", me, ken, thanks), mika, "me")).toBe(
      "2,357 came to you · 589 to @mika, its artist",
    );
    expect(artistShareLine(row("g", ken, mika, thanks), me, "me")).toBe(
      "589 came to you, its artist",
    );
  });

  it("has no share line when the artist gave it or nothing was shared", () => {
    expect(
      artistShareLine(row("g", mika, me, { total: 600, artistShare: 0 }), mika, "me"),
    ).toBeNull();
    expect(artistShareLine(row("g", ken, me, null), mika, "me")).toBeNull();
  });
});
