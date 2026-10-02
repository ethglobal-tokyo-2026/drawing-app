import type { PileSticker } from "@drawing-app/api/client";
import { describe, expect, it } from "vitest";
import { sticker } from "../api/testFixtures";
import { withNewestPage, withOlderPage } from "./pilePages";

const HOUR = 60 * 60 * 1000;
const START = Date.parse("2026-09-26T03:00:00.000Z");

/** A pile sticker sealed `hours` after START, none given. */
const at = (hours: number): PileSticker => ({
  sticker: sticker({ sealedAt: new Date(START + hours * HOUR).toISOString() }),
  givenTo: null,
});

const idsOf = ({ stickers }: { stickers: readonly PileSticker[] }) =>
  stickers.map(({ sticker: s }) => s.id);

describe("withNewestPage", () => {
  // Loaded newest first: Explore's first page, then one older page under it.
  const [s5, s4, s3, s2] = [5, 4, 3, 2].map(at);
  const loaded = withOlderPage(
    { stickers: [s5, s4], before: "c4" },
    { stickers: [s3, s2], before: "c2" },
  );

  it("keeps the older pages a fresh first page reaches back to, without repeating any", () => {
    const fresh = { stickers: [at(6), s5], before: "c5" };
    const joined = withNewestPage(loaded, fresh);
    expect(idsOf(joined)).toEqual([...idsOf(fresh), ...idsOf({ stickers: [s4, s3, s2] })]);
    expect(joined.before).toBe("c2");
  });

  it("starts over from a fresh first page that doesn't reach them, so nothing between goes missing", () => {
    const fresh = { stickers: [at(8), at(7)], before: "c7" };
    expect(withNewestPage(loaded, fresh)).toEqual(fresh);
  });
});
