import { MAX_LARGE_LAYOUT_BATCH, MAX_SCALE } from "@drawing-app/api/client";
import { describe, expect, it, vi } from "vitest";
import { boardSticker, sticker } from "../api/testFixtures";
import { emptyApi } from "../api/testing";
import { toApiPlacement } from "../api/views";
import { placeUnplaced, toBoardSticker, type PlacedBoardSticker } from "./boardSticker";
import {
  deriveLargeLayout,
  LARGE_SPREAD,
  largeSpotFrom,
  saveDerivedLayout,
  type LargeSpot,
} from "./largeLayout";
import {
  fieldOf,
  LARGE_LANDING_GROWTH,
  sRangeOf,
  PHONE_BOARD,
  stickerBox,
  unitOf,
  type BoardSize,
  type SRange,
  type Placement,
} from "./placement";

const largeBoard = (W: number, H: number): BoardSize => ({ W, H, U: unitOf("large", W) });
/** Any size at all: the spread alone. */
const ANY_SIZE: SRange = { min: 0, max: Infinity };
const PHONE: BoardSize = { ...PHONE_BOARD, U: unitOf("phone", PHONE_BOARD.W) };
/** iPads' boards in Safari, upright and turned: their viewports less a 72px tab strip. */
const IPADS = [largeBoard(744, 975), largeBoard(820, 1022), largeBoard(1180, 662)];
const spot = (x: number, y: number, s = 0.3): Placement => ({ on: true, x, y, s, r: 0, z: 2 });
/** Stickers you hold at these phone spots, with no large spot yet. */
const holding = (...spots: Placement[]) =>
  placeUnplaced(spots.map((p) => toBoardSticker(boardSticker({ placement: toApiPlacement(p) }))))
    .stickers;
/** Whether two stickers' boxes overlap where a board draws them at these spots. */
const overlapOn = (
  board: BoardSize,
  [a, b]: [PlacedBoardSticker, PlacedBoardSticker],
  [p, q]: [Placement, Placement],
) => {
  const field = fieldOf(board.W, board.H);
  const [m, n] = [stickerBox(field, board.U, p, a), stickerBox(field, board.U, q, b)];
  return Math.abs(m.x - n.x) < (m.w + n.w) / 2 && Math.abs(m.y - n.y) < (m.h + n.h) / 2;
};
const largeOf = (stickers: readonly PlacedBoardSticker[], board: BoardSize) =>
  new Map(deriveLargeLayout(stickers, board).derived.map((d) => [d.id, d.placement]));

describe("the large layout derived from the phone's", () => {
  it("spreads the phone's arrangement across the board's field, centered, a size larger", () => {
    const [corner, far] = [spot(0, 0), spot(1, 1)];
    const edge = (1 - LARGE_SPREAD) / 2;
    for (const ipad of IPADS) {
      expect(largeSpotFrom(corner, ANY_SIZE)).toMatchObject({ x: edge, y: edge });
      expect(largeSpotFrom(far, ANY_SIZE)).toMatchObject({ x: 1 - edge, y: 1 - edge });
      expect(largeSpotFrom(spot(0.5, 0.5), ANY_SIZE)).toMatchObject({ x: 0.5, y: 0.5 });
      const [held] = holding(corner);
      const large = largeOf([held], ipad).get(held.id);
      expect(large).toMatchObject({ on: corner.on, r: corner.r, z: corner.z });
      expect(large?.s).toBeCloseTo(corner.s * LARGE_LANDING_GROWTH);
    }
  });

  it("derives no sticker past its largest size on the board", () => {
    const turned = IPADS[2];
    const [tall] = placeUnplaced([
      toBoardSticker(
        boardSticker({
          sticker: sticker({ width: 300, height: 1000 }),
          placement: toApiPlacement(spot(0.5, 0.5, MAX_SCALE)),
        }),
      ),
    ]).stickers;
    const largest = sRangeOf(tall, "large", fieldOf(turned.W, turned.H), turned.U).max;
    expect(largest).toBeLessThan(MAX_SCALE * LARGE_LANDING_GROWTH);
    expect(largeOf([tall], turned).get(tall.id)?.s).toBeCloseTo(largest);
  });

  it("pulls apart stickers the spread pushed together, and leaves stacked ones stacked", () => {
    // Stacked a pixel clear on the phone; a turned iPad's field is shorter, so the spread meets them.
    const s = 0.4;
    const gap = (s * PHONE.U + 1) / fieldOf(PHONE.W, PHONE.H).h;
    const [top, below, onTop] = holding(
      spot(0.5, 0.3, s),
      spot(0.5, 0.3 + gap, s),
      spot(0.55, 0.3, s),
    );
    const turned = IPADS[2];
    const phones: [Placement, Placement] = [top.placements.phone, below.placements.phone];
    expect(overlapOn(PHONE, [top, below], phones)).toBe(false);
    expect(
      overlapOn(
        turned,
        [top, below],
        [largeSpotFrom(phones[0], ANY_SIZE), largeSpotFrom(phones[1], ANY_SIZE)],
      ),
    ).toBe(true);
    const large = largeOf([top, below, onTop], turned);
    const at = (s: PlacedBoardSticker) => large.get(s.id) ?? s.placements.phone;
    expect(overlapOn(turned, [top, below], [at(top), at(below)])).toBe(false);
    expect(overlapOn(PHONE, [top, onTop], [top.placements.phone, onTop.placements.phone])).toBe(
      true,
    );
    expect(overlapOn(turned, [top, onTop], [at(top), at(onTop)])).toBe(true);
  });

  it("derives the same layout whatever order the stickers come in", () => {
    // Columns clear on the phone, whose stickers a turned iPad's shorter field pushes together.
    const s = 0.3;
    const step = (s * PHONE.U + 4) / fieldOf(PHONE.W, PHONE.H).h;
    const grid = holding(
      ...[0.1, 0.5, 0.9].flatMap((x) => [0, 1, 2, 3].map((row) => spot(x, 0.2 + row * step, s))),
    );
    for (const ipad of IPADS)
      expect(largeOf([...grid].reverse(), ipad)).toEqual(largeOf(grid, ipad));
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
