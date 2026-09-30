import { MAX_TIMELAPSE_BYTES, type TimelapseV1 } from "@drawing-app/api/client";
import { describe, expect, it, vi } from "vitest";
import type { Op } from "../canvas/ops";
import { decodeTimelapse, encodeTimelapse, gzipTimelapse } from "./timelapse";

const stroke: Op = {
  tool: "brush",
  color: "#ff0000",
  T: 1200,
  pts: [10, 20, 4, 0, 10.5, 21.25, 4, 16],
};
const eraser: Op = { tool: "eraser", color: "#ffffff", T: 5000, pts: [3, 4, 12, 0] };
const fill: Op = { tool: "fill", color: "#00ff00", T: 9000.4, x: 30.26, y: 40 };

/** The sheet at twice the density: the ink canvas and the sticker's place are in device pixels. */
const DENSITY = 2;
const input = {
  ops: [stroke, eraser, fill],
  ink: { width: 800, height: 1200 },
  place: { x: 100, y: 200, w: 300, h: 400 },
  density: DENSITY,
};

const gunzip = async (blob: Blob): Promise<unknown> =>
  JSON.parse(await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text());

describe("the timelapse", () => {
  it("puts the sheet and the sticker's place in sheet pixels, the ops' own space", () => {
    const timelapse = encodeTimelapse(input);
    expect(timelapse.v).toBe(1);
    expect(timelapse.ink).toEqual([800 / DENSITY, 1200 / DENSITY]);
    expect(timelapse.place).toEqual([100 / DENSITY, 200 / DENSITY, 300 / DENSITY, 400 / DENSITY]);
  });

  it("keeps every op in the order drawn, with its tool, color and time", () => {
    const { ops } = encodeTimelapse(input);
    expect(ops.map((op) => op.slice(0, 3))).toEqual([
      ["brush", "#ff0000", 1200],
      ["eraser", "#ffffff", 5000],
      ["fill", "#00ff00", 9000],
    ]);
  });

  it("writes stroke points in tenths of a pixel, each a change from the point before", () => {
    const [first] = encodeTimelapse(input).ops;
    // (10, 20) at width 4 and 0 ms, then (10.5, 21.25) at width 4 and 16 ms.
    expect(first?.[3]).toEqual([100, 200, 40, 0, 5, 13, 0, 16]);
  });

  it.each([1, 2, 2.625, 3])(
    "stores each fill's tap where it seeds the pixel it seeded, at a density of %s",
    (density) => {
      // At density 3, 10.334 seeded pixel 31, which 10.33 would miss.
      const taps = [10.334, 30.26, 40, 99.999];
      const ops = taps.map((x): Op => ({ tool: "fill", color: "#00ff00", T: 0, x, y: x }));
      const decoded = decodeTimelapse(encodeTimelapse({ ...input, ops, density })).ops;
      const seeded = (n: number) => Math.floor(n * density);
      expect(decoded.map((op) => (op.tool === "fill" ? [seeded(op.x), seeded(op.y)] : []))).toEqual(
        taps.map((x) => [seeded(x), seeded(x)]),
      );
    },
  );

  it("records the density the sticker was drawn at, so fills can flood as they did", () => {
    expect(encodeTimelapse(input).density).toBe(DENSITY);
  });

  it("decodes back to the drawing screen's ops, in sheet pixels", () => {
    const decoded = decodeTimelapse(encodeTimelapse(input));
    expect(decoded.ink).toEqual({ width: 800 / DENSITY, height: 1200 / DENSITY });
    expect(decoded.place).toEqual({
      x: 100 / DENSITY,
      y: 200 / DENSITY,
      w: 300 / DENSITY,
      h: 400 / DENSITY,
    });
    expect(decoded.density).toBe(DENSITY);
    // Stroke points come back to the tenth (21.25 is 21.3), times to the ms, and fill taps as the
    // middle of the pixel they seeded at DENSITY.
    expect(decoded.ops).toEqual([
      { tool: "brush", color: "#ff0000", T: 1200, pts: [10, 20, 4, 0, 10.5, 21.3, 4, 16] },
      { tool: "eraser", color: "#ffffff", T: 5000, pts: [3, 4, 12, 0] },
      { tool: "fill", color: "#00ff00", T: 9000, x: 30.25, y: 40.25 },
    ]);
  });

  it("decodes a timelapse from before densities were recorded", () => {
    const { density: _dropped, ...older } = encodeTimelapse(input);
    expect(decodeTimelapse(older).density).toBeNull();
  });

  it("gzips it for the upload, and reads back the same", async () => {
    const timelapse = encodeTimelapse(input);
    const blob = await gzipTimelapse(timelapse);
    if (!blob) throw new Error("expected a gzipped timelapse");
    expect(await gunzip(blob)).toEqual(timelapse);
  });

  it("gzips it where the browser can't compress, so the sticker still seals with it", async () => {
    vi.stubGlobal("CompressionStream", undefined);
    const timelapse = encodeTimelapse(input);
    const blob = await gzipTimelapse(timelapse).finally(() => vi.unstubAllGlobals());
    if (!blob) throw new Error("expected a gzipped timelapse");
    expect(await gunzip(blob)).toEqual(timelapse);
  });

  it("goes without one over the server's limit, and says so", async () => {
    const report = vi.fn();
    const huge: TimelapseV1 = {
      ...encodeTimelapse(input),
      // Random colors don't compress, so this stays over the limit once gzipped.
      ops: Array.from({ length: MAX_TIMELAPSE_BYTES / 8 }, () => [
        "fill",
        Math.random().toString(36),
        0,
        0,
        0,
      ]),
    };
    expect(await gzipTimelapse(huge, report)).toBeNull();
    expect(report).toHaveBeenCalledWith(expect.stringContaining("over the server's limit"));
  });
});
