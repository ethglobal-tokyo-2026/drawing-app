import { describe, expect, it } from "vitest";
import {
  ceremonyTime,
  CUTTER_RAMP,
  CUTTER_SPEED,
  cutterAt,
  flight,
  HOLD,
  LAP_MAX,
  LAP_MIN,
  lineShownAt,
  sealFrame,
  SPANS,
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
    ["the wet front fades", (f) => f.pour.opacity, ...SPANS.frontFade],
    ["a made foil rises with the resin", (f) => f.foil, T.rise0, T.rise1],
    ["the gloss follows", (f) => f.gloss, ...SPANS.gloss],
    ["the specular gathers", (f) => f.spec.scale, T.form0, T.form1],
    ["the sticker peels up", (f) => f.sticker.rotateX, T.peel0, T.peel1],
    ["the cut line fades", (f) => f.cut.alpha, ...SPANS.cutLineFade],
    ["the dim clears", (f) => f.dim, ...SPANS.dimClear],
    ["the veil rises", (f) => f.veil, T.card0, T.card1],
    ["the card slides up", (f) => f.card.y, T.card0, T.card1],
    ["the sticker flies to the card", (f) => f.sticker.x, T.move0, T.move1],
    ["the used sticker silhouette goes", (f) => f.usedStickerSilhouette, ...SPANS.silhouetteFade],
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
    const half = HOLD / 2;
    expect(ceremonyTime(0, half, waiting)).toBe(half);
    expect(ceremonyTime(half, HOLD, waiting)).toBe(HOLD);
    expect(ceremonyTime(HOLD, TOTAL, waiting)).toBe(HOLD);
    expect(ceremonyTime(HOLD, 1, recorded)).toBe(HOLD + 1);
    // Recorded before the cut is made, it never waits.
    expect(ceremonyTime(half, half + 1, recorded)).toBe(HOLD + 1);
    expect(ceremonyTime(TOTAL - 1, half, recorded)).toBe(TOTAL);
  });

  it("starts at the wait under reduced motion, and goes to the end once recorded", () => {
    expect(ceremonyTime(0, 16, { recorded: false, reduced: true })).toBe(HOLD);
    expect(ceremonyTime(HOLD, 16, { recorded: true, reduced: true })).toBe(TOTAL);
  });

  it("keeps the cutter running round the cut while it waits, from rest, a lap at a time", () => {
    // A line whose lap at the cutter's speed is neither the shortest nor the longest it allows.
    const lap = (LAP_MIN + LAP_MAX) / 2;
    const length = lap * CUTTER_SPEED;
    // Its laps run as if it had set off at full speed half the ramp late.
    const late = CUTTER_RAMP / 2;
    expect(cutterAt(0, length)).toBe(0);
    expect(cutterAt(late + lap / 2, length)).toBeCloseTo(0.5);
    expect(cutterAt(late + lap, length)).toBeCloseTo(0);
    // It gets up to speed: the ramp's first half covers less than as long at full speed.
    const fullSpeed = cutterAt(CUTTER_RAMP + late, length) - cutterAt(CUTTER_RAMP, length);
    expect(cutterAt(late, length)).toBeLessThan(fullSpeed);
    // However long or short the line, a lap takes from LAP_MIN to LAP_MAX.
    expect(cutterAt(late + LAP_MAX / 2, LAP_MAX * CUTTER_SPEED * 10)).toBeCloseTo(0.5);
    expect(cutterAt(late + LAP_MIN / 2, (LAP_MIN * CUTTER_SPEED) / 10)).toBeCloseTo(0.5);
  });
});
