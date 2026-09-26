import { describe, expect, it } from "vitest";
import { FOIL_REACH, foilMaskAlpha } from "./foilMask.ts";

const SIZE = 101;
const CENTER = 50;

/** A cut's alpha: opaque where `inside` says, clear elsewhere. */
function cut(inside: (x: number, y: number) => boolean) {
  const alpha = new Uint8Array(SIZE * SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) alpha[y * SIZE + x] = inside(x, y) ? 255 : 0;
  }
  return alpha;
}

describe("the foil band's mask", () => {
  it("reaches the same distance past the cut in every direction", () => {
    const band = foilMaskAlpha(
      cut((x, y) => x === CENTER && y === CENTER),
      SIZE,
      SIZE,
    );
    const reach = FOIL_REACH * SIZE;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const distance = Math.hypot(x - CENTER, y - CENTER);
        const alpha = band[y * SIZE + x];
        if (distance <= reach - 1) expect(alpha, `${x}, ${y}`).toBe(255);
        if (distance >= reach + 1) expect(alpha, `${x}, ${y}`).toBe(0);
      }
    }
  });

  it("covers the cut itself, which the sticker's image hides", () => {
    const inside = (x: number, y: number) => Math.abs(x - CENTER) < 20 && Math.abs(y - CENTER) < 12;
    const band = foilMaskAlpha(cut(inside), SIZE, SIZE);
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) if (inside(x, y)) expect(band[y * SIZE + x]).toBe(255);
    }
  });

  it("is clear everywhere for a cut with nothing inside", () => {
    expect(
      foilMaskAlpha(
        cut(() => false),
        SIZE,
        SIZE,
      ).every((alpha) => alpha === 0),
    ).toBe(true);
  });
});
