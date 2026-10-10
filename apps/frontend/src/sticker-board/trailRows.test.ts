import { describe, expect, it } from "vitest";
import { gratitude, people, trailEntry } from "../api/testFixtures";
import type { PersonView } from "../api/views";
import { i18next } from "../i18n/i18n";
import { artistShareLine, defaultOpenRow, toTrailRows, type TrailRow } from "./trailRows";

const who = (id: string): PersonView => ({ id, handle: id, name: id, nsfwOptIn: false });
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
    const split = { kept: "2,357", share: "589", artist: "@mika" };
    expect(artistShareLine(row("g", ken, me, gratitude), mika, "me")).toBe(
      i18next.t(($) => $.stickerBoard.transferTrail.artistShare.between, {
        ...split,
        giver: "@ken",
      }),
    );
    expect(artistShareLine(row("g", me, ken, gratitude), mika, "me")).toBe(
      i18next.t(($) => $.stickerBoard.transferTrail.artistShare.youGaveIt, split),
    );
    expect(artistShareLine(row("g", ken, mika, gratitude), me, "me")).toBe(
      i18next.t(($) => $.stickerBoard.transferTrail.artistShare.youDrewIt, { share: "589" }),
    );
  });

  it.each([
    ["nothing was shared", row("g", ken, me, { total: 600, artistShare: 0, seenByGiverAt: null })],
    ["it has no gratitude", row("g", ken, me, null)],
  ])("has no share line when %s", (_, given) => {
    expect(artistShareLine(given, mika, "me")).toBeNull();
  });

  it("keeps when the giver watched the gratitude", () => {
    const entry = (seenByGiverAt: string | null) =>
      trailEntry({
        giftId: "g",
        receiver: people.ken,
        gratitude: gratitude({ giftId: "g", total: 30, seenByGiverAt }),
      });
    const watchedAt = "2026-09-26T00:00:02.000Z";
    expect(toTrailRows([entry(null)])[0]?.gratitude?.seenByGiverAt).toBeNull();
    expect(toTrailRows([entry(watchedAt)])[0]?.gratitude?.seenByGiverAt).toBe(
      Date.parse(watchedAt),
    );
  });
});
