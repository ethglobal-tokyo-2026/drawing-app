import type { Person, TransferTrailEntry } from "@drawing-app/api/client";
import { describe, expect, it } from "vitest";
import type { PersonView } from "../api/views";
import { artistShareLine, defaultOpenRow, toTrailRows, type TrailRow } from "./trailRows";

const who = (id: string): PersonView => ({ id, handle: id, name: id, ageStatus: "adult" });
const [me, mika, ken] = [who("me"), who("mika"), who("ken")];

const row = (
  giftId: string,
  giver: PersonView,
  receiver: PersonView,
  gratitude: TrailRow["gratitude"] = null,
): TrailRow => ({ giftId, giver, receiver, receivedAt: 0, gratitude });

describe("the Transfer Trail", () => {
  it("opens the most recent gratitude, and none while you owe gratitude for the newest gift", () => {
    const withGratitude = row("old", ken, mika, {
      total: 600,
      artistShare: 0,
      seenByGiverAt: null,
    });
    expect(defaultOpenRow([row("new", mika, ken), withGratitude], "me")).toBe("old");
    expect(defaultOpenRow([row("new", mika, me), withGratitude], "me")).toBeNull();
  });

  it("splits the artist's share out of the giver's part, in plain words", () => {
    const gratitude = { total: 2946, artistShare: 589, seenByGiverAt: null };
    expect(artistShareLine(row("g", ken, me, gratitude), mika, "me")).toBe(
      "2,357 to @ken · 589 to @mika, its artist",
    );
    expect(artistShareLine(row("g", me, ken, gratitude), mika, "me")).toBe(
      "2,357 came to you · 589 to @mika, its artist",
    );
    expect(artistShareLine(row("g", ken, mika, gratitude), me, "me")).toBe(
      "589 of it came to you, its artist",
    );
  });

  it("has no share line when the artist gave it or nothing was shared", () => {
    expect(
      artistShareLine(
        row("g", mika, me, { total: 600, artistShare: 0, seenByGiverAt: null }),
        mika,
        "me",
      ),
    ).toBeNull();
    expect(artistShareLine(row("g", ken, me, null), mika, "me")).toBeNull();
  });

  it("keeps when the giver watched the gratitude", () => {
    const person = (id: string): Person => ({
      id,
      handle: id,
      lineDisplayName: id,
      linePictureUrl: null,
      ensName: null,
      ageStatus: "adult",
    });
    const entry = (seenByGiverAt: string | null): TransferTrailEntry => ({
      giftId: "g",
      giver: person("mika"),
      receiver: person("ken"),
      receivedAt: "2026-09-26T00:00:00.000Z",
      gratitude: {
        giftId: "g",
        method: "tap",
        hits: 3,
        total: 30,
        peakMult: 1,
        peakTier: 1,
        originalArtistGratitudeShare: 0,
        gameConfigVersion: "test",
        recordedAt: "2026-09-26T00:00:01.000Z",
        seenByGiverAt,
      },
    });
    const watchedAt = "2026-09-26T00:00:02.000Z";
    expect(toTrailRows([entry(null)])[0]?.gratitude?.seenByGiverAt).toBeNull();
    expect(toTrailRows([entry(watchedAt)])[0]?.gratitude?.seenByGiverAt).toBe(
      Date.parse(watchedAt),
    );
  });
});
