import { MAX_TIMELAPSE_BYTES, type TimelapseV2 } from "@drawing-app/api/client";
import { storedFromV1 } from "@drawing-app/api/testing/timelapses";
import { describe, expect, it, vi } from "vitest";
import { seededRandom } from "../../ui/seededRandom";
import { FILL_GAP } from "../canvas/fill";
import type { Op, Step } from "../canvas/ops";
import { FIRST_LAYERS, type LayerState } from "../layers/layerState";
import { decodeTimelapse, encodeTimelapse, gzipTimelapse } from "./timelapse";

const stroke: Op = {
  tool: "brush",
  layer: 1,
  color: "#ff0000",
  T: 1200,
  pts: [10, 20, 4, 0, 10.5, 21.25, 4, 16],
};
const eraser: Op = { tool: "eraser", layer: 1, color: "#ffffff", T: 5000, pts: [3, 4, 12, 0] };
const fill: Op = {
  tool: "fill",
  layer: 1,
  color: "#00ff00",
  T: 9000.4,
  x: 30.26,
  y: 40,
  gap: FILL_GAP,
};

/** A sheet backed at density 2: the sticker's place is in the ink canvas's device pixels. */
const DENSITY = 2;
const input = {
  steps: [stroke, eraser, fill],
  start: FIRST_LAYERS,
  frame: { w: 400, h: 600, density: DENSITY },
  place: { x: 100, y: 200, w: 300, h: 400 },
};

const gunzip = async (blob: Blob): Promise<unknown> =>
  JSON.parse(await new Response(blob.stream().pipeThrough(new DecompressionStream("gzip"))).text());

describe("the timelapse", () => {
  it("puts the sheet and the sticker's place in sheet units, the ops' own space", () => {
    const timelapse = encodeTimelapse(input);
    expect(timelapse.ink).toEqual([input.frame.w, input.frame.h]);
    expect(timelapse.place).toEqual([100 / DENSITY, 200 / DENSITY, 300 / DENSITY, 400 / DENSITY]);
  });

  it("keeps every op in the order drawn, with its tool, layer, color and time", () => {
    const { ops } = encodeTimelapse(input);
    expect(ops.map((op) => op.slice(0, 4))).toEqual([
      ["brush", 1, "#ff0000", 1200],
      ["eraser", 1, "#ffffff", 5000],
      ["fill", 1, "#00ff00", 9000],
    ]);
  });

  it("writes stroke points in tenths of a pixel, each a change from the point before", () => {
    const [first] = encodeTimelapse(input).ops;
    if (first?.[0] !== "brush") throw new Error("expected the stroke first");
    // (10, 20) at width 4 and 0 ms, then (10.5, 21.25) at width 4 and 16 ms.
    expect(first[4]).toEqual([100, 200, 40, 0, 5, 13, 0, 16]);
  });

  it.each([1, 2, 2.625, 3])(
    "stores each fill's tap where it seeds the pixel it seeded, at a density of %s",
    (density) => {
      // At density 3, 10.334 seeded pixel 31, which 10.33 would miss.
      const taps = [10.334, 30.26, 40, 99.999];
      const steps = taps.map((x): Op => ({
        tool: "fill",
        layer: 1,
        color: "#00ff00",
        T: 0,
        x,
        y: x,
        gap: 0,
      }));
      const frame = { ...input.frame, density };
      const decoded = decodeTimelapse(encodeTimelapse({ ...input, steps, frame })).steps;
      const seeded = (n: number) => Math.floor(n * density);
      expect(decoded.map((op) => (op.tool === "fill" ? [seeded(op.x), seeded(op.y)] : []))).toEqual(
        taps.map((x) => [seeded(x), seeded(x)]),
      );
    },
  );

  it("decodes back to the drawing screen's steps, in sheet units", () => {
    const decoded = decodeTimelapse(encodeTimelapse(input));
    expect(decoded.ink).toEqual({ width: input.frame.w, height: input.frame.h });
    expect(decoded.place).toEqual({
      x: 100 / DENSITY,
      y: 200 / DENSITY,
      w: 300 / DENSITY,
      h: 400 / DENSITY,
    });
    // The density it was drawn at, so fills flood as they did.
    expect(decoded.density).toBe(DENSITY);
    expect(decoded.layers).toEqual(FIRST_LAYERS);
    // Stroke points come back to the tenth (21.25 is 21.3), times to the ms, and fill taps as the
    // middle of the pixel they seeded at DENSITY.
    expect(decoded.steps).toEqual([
      {
        tool: "brush",
        layer: 1,
        color: "#ff0000",
        T: 1200,
        pts: [10, 20, 4, 0, 10.5, 21.3, 4, 16],
      },
      { tool: "eraser", layer: 1, color: "#ffffff", T: 5000, pts: [3, 4, 12, 0] },
      { tool: "fill", layer: 1, color: "#00ff00", T: 9000, x: 30.25, y: 40.25, gap: FILL_GAP },
    ]);
  });

  it("decodes the layers it starts on and every change to them, with marks on each layer", () => {
    // Before the timelapse starts, layer 2 was added, dimmed, locked and clipped.
    const start: LayerState = {
      layers: [
        { id: 1, opacity: 100, locked: false, clipped: false },
        { id: 2, opacity: 40, locked: true, clipped: true },
      ],
      nextId: 3,
    };
    // Marks at tenths, whole ms and fill taps mid-pixel, which come back as they went.
    const steps: Step[] = [
      { tool: "brush", layer: 2, color: "#ff0000", T: 100, pts: [10, 20, 4, 0, 10.5, 21.3, 4, 16] },
      { tool: "add", layer: 3, at: 2, T: 200 },
      { tool: "fill", layer: 3, color: "#00ff00", T: 300, x: 30.25, y: 40.25, gap: FILL_GAP },
      { tool: "opacity", layer: 3, opacity: 75, T: 400 },
      { tool: "lock", layer: 1, on: true, T: 500 },
      { tool: "clip", layer: 2, on: false, T: 600 },
      { tool: "move", layer: 3, to: 0, T: 700 },
      { tool: "eraser", layer: 1, color: "#ffffff", T: 800, pts: [3, 4, 12, 0] },
      { tool: "clear", layer: 1, T: 900 },
      { tool: "delete", layer: 2, T: 1000 },
    ];
    const decoded = decodeTimelapse(encodeTimelapse({ ...input, steps, start }));
    // nextId included: the add of layer 3 replays only from a start that hasn't used 3.
    expect(decoded.layers).toEqual(start);
    expect(decoded.steps).toEqual(steps);
  });

  it("decodes a timelapse sealed before layers to the marks the v1 decoder read, all on the first layer", () => {
    const v1 = {
      v: 1,
      ink: [400, 600],
      place: [50, 100, 150, 200],
      density: DENSITY,
      ops: [
        ["brush", "#ff0000", 1200, [100, 200, 40, 0, 5, 13, 0, 16]],
        // Sealed before fills recorded their gap: it closed none.
        ["fill", "#00ff00", 9000, 30.25, 40.25],
        ["fill", "#0000ff", 9500, 30.25, 40.25, FILL_GAP],
      ],
    };
    const decoded = decodeTimelapse(storedFromV1(v1));
    expect(decoded.layers).toEqual(FIRST_LAYERS);
    expect(decoded.steps).toEqual([
      {
        tool: "brush",
        layer: 1,
        color: "#ff0000",
        T: 1200,
        pts: [10, 20, 4, 0, 10.5, 21.3, 4, 16],
      },
      { tool: "fill", layer: 1, color: "#00ff00", T: 9000, x: 30.25, y: 40.25, gap: 0 },
      { tool: "fill", layer: 1, color: "#0000ff", T: 9500, x: 30.25, y: 40.25, gap: FILL_GAP },
    ]);
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
    const random = seededRandom(1);
    const huge: TimelapseV2 = {
      ...encodeTimelapse(input),
      // Random colors don't compress, so this stays over the limit once gzipped.
      ops: Array.from({ length: MAX_TIMELAPSE_BYTES / 8 }, () => [
        "fill",
        1,
        random().toString(36),
        0,
        0,
        0,
        0,
      ]),
    };
    expect(await gzipTimelapse(huge, report)).toBeNull();
    expect(report).toHaveBeenCalledWith(expect.stringContaining("over the server's limit"));
  });
});
