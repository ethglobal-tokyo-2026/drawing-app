import { describe, expect, it } from "vitest";
import {
  ceremonyTime,
  cutterAt,
  flight,
  HOLD,
  lineShownAt,
  sealFrame,
  T,
  TOTAL,
  type SealFrame,
} from "./sealTimeline";

// A 300 × 260 sticker on the sheet, and the card's slot lower down.
const box = { x: 40, y: 120, w: 300, h: 260 };
const body = { w: 270, h: 234 };
const slot = { x: 14, y: 520, w: 362, h: 208 };
const path = flight(box, body, slot);
const frameAt = (t: number) => sealFrame(t, path, 3);
/** Each of the card's lines takes as long to fade up as the first. */
const LINE_FADE = lineShownAt(0) - T.txt0;

describe("sealTimeline", () => {
  it.each<[string, (f: SealFrame) => number, number, number]>([
    ["the cut line runs around the contour", (f) => f.cut.progress, T.cut0, T.cut1],
    ["the paper outside the cut dims", (f) => f.dim, T.dim0, T.dim1],
    ["the wet front spreads", (f) => f.pour.scale, T.flow0, T.flow1],
    ["the wet front fades", (f) => f.pour.opacity, T.flow1 - 40, T.flow1 + 220],
    ["a made foil rises with the resin", (f) => f.foil, T.rise0, T.rise1],
    ["the gloss follows", (f) => f.gloss, T.rise0 + 80, T.rise1 + 80],
    ["the specular gathers", (f) => f.spec.scale, T.form0, T.form1],
    ["the sticker peels up", (f) => f.sticker.rotateX, T.peel0, T.peel1],
    ["the cut line fades", (f) => f.cut.alpha, T.peel0, T.peel0 + 220],
    ["the dim clears", (f) => f.dim, T.peel0, T.peel0 + 320],
    ["the veil rises", (f) => f.veil, T.card0, T.card1],
    ["the card slides up", (f) => f.card.y, T.card0, T.card1],
    ["the sticker flies to the card", (f) => f.sticker.x, T.move0, T.move1],
    ["the used sticker silhouette goes", (f) => f.usedStickerSilhouette, T.card1, T.card1 + 260],
    ["the card's first line fades up", (f) => f.items[0].y, T.txt0, lineShownAt(0)],
    ["its second line follows", (f) => f.items[1].y, lineShownAt(1) - LINE_FADE, lineShownAt(1)],
  ])("%s, and only over its own span", (_, value, start, end) => {
    const v = (t: number) => value(frameAt(t));
    expect(v(start - 1)).toBe(v(start));
    expect(v(start + 1)).not.toBe(v(start));
    expect(v(end - 1)).not.toBe(v(end));
    expect(v(end + 1)).toBe(v(end));
  });

  it("shows each of the card's lines, to be read and pressed, only once it's all the way up", () => {
    const line = (t: number) => frameAt(t).items[1];
    expect(line(lineShownAt(1) - 1).shown).toBe(false);
    expect(line(lineShownAt(1))).toEqual({ opacity: 1, y: 0, shown: true });
  });

  it("lands the sticker in the middle of the slot, fitted to it", () => {
    const end = frameAt(TOTAL).sticker;
    expect(box.x + box.w / 2 + end.x).toBeCloseTo(slot.x + slot.w / 2);
    expect(box.y + box.h / 2 + end.y).toBeCloseTo(slot.y + slot.h / 2);
    expect(body.w * end.scale).toBeLessThanOrEqual(slot.w);
    expect(body.h * end.scale).toBeLessThanOrEqual(slot.h);
  });

  it("overshoots as it lands, then settles", () => {
    // A small sticker grows into the slot, so only the landing's bounce can take it past its size.
    const small = flight({ x: 120, y: 200, w: 130, h: 110 }, { w: 118, h: 100 }, slot);
    const scaleAt = (t: number) => sealFrame(t, small, 3).sticker.scale;
    expect(scaleAt(T.land)).toBeGreaterThan(scaleAt(TOTAL));
  });

  it("lands with its cast as baked: under the sticker, at full strength", () => {
    const { sticker, shadow } = frameAt(TOTAL);
    expect(shadow).toEqual({
      opacity: 1,
      x: sticker.x,
      y: sticker.y,
      rotate: sticker.rotate,
      scale: sticker.scale,
    });
  });

  it("ends only at the last frame", () => {
    expect(frameAt(TOTAL - 1).done).toBe(false);
    expect(frameAt(TOTAL).done).toBe(true);
  });

  it("waits with the cut made, before anything that says it's sealed", () => {
    const f = frameAt(HOLD);
    expect(f.cut).toEqual({ progress: 1, alpha: 1 });
    expect(f.pour.opacity).toBe(0);
    expect(f.foil).toBe(0);
    expect(f.lifted).toBe(false);
    expect(f.card.opacity).toBe(0);
  });

  it("waits at the cut until the seal is recorded, then runs to the end", () => {
    const waiting = { recorded: false, reduced: false };
    const recorded = { recorded: true, reduced: false };
    expect(ceremonyTime(0, 400, waiting)).toBe(400);
    expect(ceremonyTime(600, 400, waiting)).toBe(HOLD);
    expect(ceremonyTime(HOLD, 20_000, waiting)).toBe(HOLD);
    expect(ceremonyTime(HOLD, 400, recorded)).toBe(HOLD + 400);
    // Recorded before the cut is made, it never waits.
    expect(ceremonyTime(600, 400, recorded)).toBe(1000);
    expect(ceremonyTime(TOTAL - 10, 400, recorded)).toBe(TOTAL);
  });

  it("starts at the wait under reduced motion, and goes to the end once recorded", () => {
    expect(ceremonyTime(0, 16, { recorded: false, reduced: true })).toBe(HOLD);
    expect(ceremonyTime(HOLD, 16, { recorded: true, reduced: true })).toBe(TOTAL);
  });

  it("keeps the cutter running round the cut while it waits, from rest, a lap at a time", () => {
    // 840 px at the cutter's speed is a 2 s lap, which starts after half the 500 ms ramp.
    expect(cutterAt(0, 840)).toBe(0);
    expect(cutterAt(1250, 840)).toBeCloseTo(0.5);
    expect(cutterAt(2250, 840)).toBeCloseTo(0);
    // It gets up to speed: its first 100 ms cover less than 100 ms at full speed.
    expect(cutterAt(100, 840)).toBeLessThan(cutterAt(1100, 840) - cutterAt(1000, 840));
    // However long or short the line, a lap takes 1.3–2.6 s.
    expect(cutterAt(250 + 1300, 20_000)).toBeCloseTo(0.5);
    expect(cutterAt(250 + 650, 40)).toBeCloseTo(0.5);
  });
});
