import { describe, expect, it } from "vitest";
import { ceremonyTime, flight, sealFrame, T, TOTAL, type SealFrame } from "./sealTimeline";

// A 300 × 260 sticker on the sheet, and the card's slot lower down.
const box = { x: 40, y: 120, w: 300, h: 260 };
const body = { w: 270, h: 234 };
const slot = { x: 14, y: 520, w: 362, h: 208 };
const path = flight(box, body, slot);
const frameAt = (t: number) => sealFrame(t, path, 3);

describe("sealTimeline", () => {
  it.each<[string, (f: SealFrame) => number, number, number]>([
    ["the cut line runs around the contour", (f) => f.cut.progress, T.cut0, T.cut1],
    ["the paper outside the cut dims", (f) => f.dim, T.dim0, T.dim1],
    ["the wet front spreads", (f) => f.pour.scale, T.flow0, T.flow1],
    ["the wet front fades", (f) => f.pour.opacity, T.flow1 - 40, T.flow1 + 220],
    ["the resin tint rises", (f) => f.tint, T.rise0, T.rise1],
    ["the gloss follows", (f) => f.gloss, T.rise0 + 80, T.rise1 + 80],
    ["the specular gathers", (f) => f.spec.scale, T.form0, T.form1],
    ["the rim light comes up", (f) => f.rim, T.form0 + 90, T.form1 + 40],
    ["the sticker peels up", (f) => f.piece.rotateX, T.peel0, T.peel1],
    ["the cut line fades", (f) => f.cut.alpha, T.peel0, T.peel0 + 220],
    ["the dim clears", (f) => f.dim, T.peel0, T.peel0 + 320],
    ["the veil rises", (f) => f.veil, T.card0, T.card1],
    ["the card slides up", (f) => f.card.y, T.card0, T.card1],
    ["the sticker flies to the card", (f) => f.piece.x, T.move0, T.move1],
    ["the used sticker silhouette goes", (f) => f.usedStickerSilhouette, T.card1, T.card1 + 260],
    ["the card's first line fades up", (f) => f.items[0].y, T.txt0, T.txt0 + 240],
    ["its second line follows", (f) => f.items[1].y, T.txt0 + 40, T.txt0 + 280],
  ])("%s, and only over its own span", (_, value, start, end) => {
    const v = (t: number) => value(frameAt(t));
    expect(v(start - 1)).toBe(v(start));
    expect(v(start + 1)).not.toBe(v(start));
    expect(v(end - 1)).not.toBe(v(end));
    expect(v(end + 1)).toBe(v(end));
  });

  it("lands the sticker in the middle of the slot, fitted to it", () => {
    const end = frameAt(TOTAL).piece;
    expect(box.x + box.w / 2 + end.x).toBeCloseTo(slot.x + slot.w / 2);
    expect(box.y + box.h / 2 + end.y).toBeCloseTo(slot.y + slot.h / 2);
    expect(body.w * end.scale).toBeLessThanOrEqual(slot.w);
    expect(body.h * end.scale).toBeLessThanOrEqual(slot.h);
  });

  it("overshoots as it lands, then settles", () => {
    // A small sticker grows into the slot, so only the landing's bounce can take it past its size.
    const small = flight({ x: 120, y: 200, w: 130, h: 110 }, { w: 118, h: 100 }, slot);
    const scaleAt = (t: number) => sealFrame(t, small, 3).piece.scale;
    expect(scaleAt(T.land)).toBeGreaterThan(scaleAt(TOTAL));
  });

  it("ends only at the last frame", () => {
    expect(frameAt(TOTAL - 1).done).toBe(false);
    expect(frameAt(TOTAL).done).toBe(true);
  });

  it("jumps to the end when skipped, and starts there under reduced motion", () => {
    expect(ceremonyTime(400, { skipped: true, reduced: false })).toBe(TOTAL);
    expect(ceremonyTime(0, { skipped: false, reduced: true })).toBe(TOTAL);
    expect(ceremonyTime(400, { skipped: false, reduced: false })).toBe(400);
    expect(ceremonyTime(TOTAL + 900, { skipped: false, reduced: false })).toBe(TOTAL);
  });
});
