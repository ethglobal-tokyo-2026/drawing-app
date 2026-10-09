import { MAX_LARGE_LAYOUT_BATCH } from "@drawing-app/api/client";
import { describe, expect, it, vi } from "vitest";
import { boardSticker } from "../api/testFixtures";
import { emptyApi } from "../api/testing";
import { placeUnplaced, toBoardSticker } from "./boardSticker";
import { deriveLargeLayout, largeSpotFrom, saveDerivedLayout, type LargeSpot } from "./largeLayout";
import { fieldOf, PHONE_BOARD, toPx, unitOf, type BoardSize, type Placement } from "./placement";

const largeBoard = (W: number, H: number): BoardSize => ({ W, H, U: unitOf("large", W) });
const PHONE: BoardSize = { ...PHONE_BOARD, U: unitOf("phone", PHONE_BOARD.W) };
/** iPads' boards in Safari, upright and turned: their viewports less a 72px tab strip. */
const IPADS = [largeBoard(744, 975), largeBoard(820, 1022), largeBoard(1180, 662)];
const spot = (x: number, y: number): Placement => ({ on: true, x, y, s: 0.3, r: 4, z: 2 });
/** How many units apart two spots' centers are drawn on a board. */
const apart = (board: BoardSize, a: Placement, b: Placement) => {
  const field = fieldOf(board.W, board.H);
  const [p, q] = [toPx(field, a), toPx(field, b)];
  return Math.hypot(q.x - p.x, q.y - p.y) / board.U;
};

describe("the large layout derived from the phone's", () => {
  it("keeps the phone's arrangement at the stickers' own size, centered on the board", () => {
    const [a, b] = [spot(0.2, 0.3), spot(0.7, 0.85)];
    for (const ipad of IPADS) {
      expect(apart(ipad, largeSpotFrom(a, ipad), largeSpotFrom(b, ipad))).toBeCloseTo(
        apart(PHONE, a, b),
        2,
      );
      expect(largeSpotFrom(spot(0.5, 0.5), ipad)).toMatchObject({ x: 0.5, y: 0.5 });
      expect(largeSpotFrom(a, ipad)).toMatchObject({ on: a.on, s: a.s, r: a.r, z: a.z });
    }
  });

  it("fits the arrangement to a field shorter than the phone's, edge to edge", () => {
    // An iPad mini turned, in Safari.
    const short = largeBoard(1133, 586);
    expect(fieldOf(short.W, short.H).h).toBeLessThan(fieldOf(PHONE.W, PHONE.H).h);
    expect([largeSpotFrom(spot(0.4, 0), short).y, largeSpotFrom(spot(0.4, 1), short).y]).toEqual([
      0, 1,
    ]);
  });

  it("gives every sticker you hold a spot and lists it for saving, and none to one you gave", () => {
    const placement = { onBoard: true, x: 0.3, y: 0.4, scale: 0.3, rotation: 0, z: 1 };
    const [held, gave] = placeUnplaced(
      [boardSticker({ placement }), boardSticker({ placement, held: false })].map(toBoardSticker),
    ).stickers;
    const { stickers, derived } = deriveLargeLayout([held, gave], IPADS[0]);
    expect(derived.map((d) => d.id)).toEqual([held.id]);
    expect(stickers.map((s) => s.placements.large)).toEqual([derived[0].placement, null]);
  });
});

describe("saving a derived large layout", () => {
  it("sends a layout bigger than one request takes in parts, each sticker once", async () => {
    const derived: LargeSpot[] = Array.from({ length: MAX_LARGE_LAYOUT_BATCH + 1 }, (_, i) => ({
      id: `s${i}`,
      placement: spot(0.5, 0.5),
    }));
    const api = emptyApi();
    const sent = vi.spyOn(api, "saveLargeLayout");
    await saveDerivedLayout(api, derived);
    expect(sent.mock.calls.map(([batch]) => batch.length)).toEqual([MAX_LARGE_LAYOUT_BATCH, 1]);
    expect(new Set(sent.mock.calls.flatMap(([batch]) => batch.map((e) => e.stickerId))).size).toBe(
      derived.length,
    );
  });
});
