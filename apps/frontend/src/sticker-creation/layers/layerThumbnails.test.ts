// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { contextOf, fakeContext2d } from "../../sticker-board/timelapse/testCanvas";
import type { Rect } from "../sealing/stickerPasses";
import { CHIP_HEIGHT, CHIP_WIDTH } from "./LayerChip";
import { THUMB_INSET, drawThumbnail } from "./layerThumbnails";

vi.mock("../canvas/context2d", async () => {
  const { fakeContext2d: fake } = await import("../../sticker-board/timelapse/testCanvas");
  return { context2d: fake };
});

const DENSITY = 2;
/** A wide stroke's box on a sheet, device px. */
const BOX: Rect = { x: 120, y: 200, w: 160, h: 90 };

/** A sheet whose ink fills `BOX`, so a copy of it can be read back. */
function inkedSheet() {
  const sheet = document.createElement("canvas");
  sheet.width = 400;
  sheet.height = 600;
  const ink = new ImageData(BOX.w, BOX.h);
  ink.data.fill(255);
  fakeContext2d(sheet).putImageData(ink, BOX.x, BOX.y);
  return sheet;
}

const draw = (target: HTMLCanvasElement, canvas: HTMLCanvasElement | null) =>
  drawThumbnail(target, canvas && { canvas, box: BOX }, CHIP_WIDTH, CHIP_HEIGHT, DENSITY);

const inkOn = (target: HTMLCanvasElement) =>
  contextOf(target)?.image.data.some((value, i) => i % 4 === 3 && value > 0);

describe("drawThumbnail", () => {
  it("draws only the ink's box, scaled to fit inside the inset and centered across", () => {
    const target = document.createElement("canvas");
    draw(target, inkedSheet());
    const draws = contextOf(target)?.calls.filter(([name]) => name === "drawImage") ?? [];
    expect(draws).toHaveLength(1);
    const [[, , ...args]] = draws;
    const [sx, sy, sw, sh, dx, dy, dw, dh] = args.map(Number);
    expect([sx, sy, sw, sh]).toEqual([BOX.x, BOX.y, BOX.w, BOX.h]);

    const inset = THUMB_INSET * DENSITY;
    const room = { w: CHIP_WIDTH * DENSITY - 2 * inset, h: CHIP_HEIGHT * DENSITY - 2 * inset };
    expect(dx).toBeGreaterThanOrEqual(inset);
    expect(dy).toBeGreaterThanOrEqual(inset);
    expect(dx + dw).toBeLessThanOrEqual(inset + room.w);
    expect(dy + dh).toBeLessThanOrEqual(inset + room.h);
    expect(Math.max(dw / room.w, dh / room.h)).toBeCloseTo(1);
    expect(dw / dh).toBeCloseTo(BOX.w / BOX.h);
    expect(dx + dw / 2).toBeCloseTo((CHIP_WIDTH * DENSITY) / 2);
  });

  it("clears what it drew before, so a layer with no ink leaves its chip blank", () => {
    const target = document.createElement("canvas");
    draw(target, inkedSheet());
    expect(inkOn(target)).toBe(true);
    draw(target, null);
    expect(inkOn(target)).toBe(false);
  });
});
