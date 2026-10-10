import { MAX_TIMELAPSE_BYTES, type TimelapseV2 } from "@drawing-app/api/client";
import { STRIDE, type Step } from "../canvas/ops";
import { fromTenths, tenths, toTenth, toThousandth, type SheetFrame } from "../canvas/sheetFrame";
import type { Layer, LayerState } from "../layers/layerState";
import type { Rect } from "./stickerPasses";

interface TimelapseInput {
  /** Every step from where the timelapse starts, marks and changes to the layers, in order. */
  steps: readonly Step[];
  /** The layers where it starts. */
  start: LayerState;
  /** The sheet the steps were drawn on: its size in units and its ink's density. */
  frame: SheetFrame;
  /** Where makeSticker cut the sticker from, in the ink canvas's device pixels. */
  place: Rect;
}

type TimelapseStep = TimelapseV2["ops"][number];

/**
 * A fill's tap as the middle of the device pixel it seeded, to the hundredth of a sheet unit: the
 * tap itself, rounded, could land in the pixel beside it.
 */
const seededPixel = (n: number, density: number) =>
  Math.round(((Math.floor(n * density) + 0.5) / density) * 100) / 100;

/** A stroke's points as changes from the point before; the first is from zero. */
function pointChanges(pts: readonly number[]): number[] {
  const changes: number[] = [];
  let last = [0, 0, 0, 0];
  for (let i = 0; i + STRIDE <= pts.length; i += STRIDE) {
    const [x = 0, y = 0, width = 0, ms = 0] = pts.slice(i, i + STRIDE);
    const point = [tenths(x), tenths(y), tenths(width), Math.round(ms)];
    changes.push(...point.map((value, k) => value - (last[k] ?? 0)));
    last = point;
  }
  return changes;
}

/** A length on the ink canvas in sheet units, to the tenth, as the timelapse and the drawn size keep it. */
const inUnits = (n: number, density: number) => toTenth(n / density);

/**
 * The sticker image's size on the sheet, in units, from where it was cut: its drawn size, which sizes
 * it on a sticker board. The same as its timelapse's `place`, and recorded without one.
 */
export const drawnSizeOf = (place: Rect, density: number) => ({
  drawnWidth: inUnits(place.w, density),
  drawnHeight: inUnits(place.h, density),
});

/** A step as the timelapse records it: its tool, its layer and its time, then what it did. */
function encodeStep(step: Step, density: number): TimelapseStep {
  const T = Math.round(step.T);
  switch (step.tool) {
    case "brush":
    case "eraser":
      return [step.tool, step.layer, step.color, T, pointChanges(step.pts)];
    case "fill": {
      const [x, y] = [seededPixel(step.x, density), seededPixel(step.y, density)];
      return ["fill", step.layer, step.color, T, x, y, step.gap];
    }
    case "clear":
      return ["clear", step.layer, T];
    case "add":
      return ["add", step.layer, T, step.at];
    case "delete":
      return ["delete", step.layer, T];
    case "move":
      return ["move", step.layer, T, step.to];
    case "opacity":
      return ["opacity", step.layer, T, step.opacity];
    case "lock":
      return ["lock", step.layer, T, step.on];
    case "clip":
      return ["clip", step.layer, T, step.on];
  }
}

export function encodeTimelapse({ steps, start, frame, place }: TimelapseInput): TimelapseV2 {
  const { density } = frame;
  const sheet = (n: number) => inUnits(n, density);
  return {
    v: 2,
    ink: [toTenth(frame.w), toTenth(frame.h)],
    place: [sheet(place.x), sheet(place.y), sheet(place.w), sheet(place.h)],
    density: toThousandth(density),
    layers: start.layers.map((layer) => [layer.id, layer.opacity, layer.locked, layer.clipped]),
    ops: steps.map((step) => encodeStep(step, density)),
  };
}

/** A timelapse as the drawing screen's own steps again, in sheet units. */
export interface DecodedTimelapse {
  ink: { width: number; height: number };
  place: Rect;
  /** Device pixels per sheet unit where it was drawn. */
  density: number;
  /** The layers where it starts. */
  layers: LayerState;
  /** Every step from there, in order. */
  steps: Step[];
}

/** A stroke's points from their changes, tenths back to pixels. */
function pointsFrom(changes: readonly number[]): number[] {
  const pts: number[] = [];
  const running = [0, 0, 0, 0];
  for (let i = 0; i + STRIDE <= changes.length; i += STRIDE) {
    for (let k = 0; k < STRIDE; k++) running[k] += changes[i + k] ?? 0;
    pts.push(fromTenths(running[0]), fromTenths(running[1]), fromTenths(running[2]), running[3]);
  }
  return pts;
}

/** A recorded step as the drawing screen's own, in sheet units. */
function decodeStep(step: TimelapseStep): Step {
  switch (step[0]) {
    case "brush":
    case "eraser": {
      const [tool, layer, color, T, changes] = step;
      return { tool, layer, color, T, pts: pointsFrom(changes) };
    }
    case "fill": {
      const [tool, layer, color, T, x, y, gap] = step;
      return { tool, layer, color, T, x, y, gap };
    }
    case "clear":
      return { tool: "clear", layer: step[1], T: step[2] };
    case "add":
      return { tool: "add", layer: step[1], T: step[2], at: step[3] };
    case "delete":
      return { tool: "delete", layer: step[1], T: step[2] };
    case "move":
      return { tool: "move", layer: step[1], T: step[2], to: step[3] };
    case "opacity":
      return { tool: "opacity", layer: step[1], T: step[2], opacity: step[3] };
    case "lock":
      return { tool: "lock", layer: step[1], T: step[2], on: step[3] };
    case "clip":
      return { tool: "clip", layer: step[1], T: step[2], on: step[3] };
  }
}

export function decodeTimelapse(timelapse: TimelapseV2): DecodedTimelapse {
  const [x, y, w, h] = timelapse.place;
  const layers = timelapse.layers.map(([id, opacity, locked, clipped]): Layer => ({
    id,
    opacity,
    locked,
    clipped,
  }));
  return {
    ink: { width: timelapse.ink[0], height: timelapse.ink[1] },
    place: { x, y, w, h },
    density: timelapse.density,
    // Past the start's own numbers only: the steps add the higher ones, and applyLayerStep refuses an
    // add numbered below nextId.
    layers: { layers, nextId: Math.max(...layers.map((layer) => layer.id)) + 1 },
    steps: timelapse.ops.map(decodeStep),
  };
}

/** CRC-32 as gzip's trailer carries it, one table entry per byte value. */
const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) crc = (CRC_TABLE[(crc ^ byte) & 0xff] ?? 0) ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

/** The most bytes one stored deflate block holds. */
const STORED_BLOCK_BYTES = 0xffff;
const GZIP_HEADER = [0x1f, 0x8b, 8, 0, 0, 0, 0, 0, 0, 0xff];

/**
 * `data` as gzip that stores it uncompressed, for browsers without CompressionStream (iOS before
 * 16.4): the server reads it as any other gzip.
 */
function storedGzip(data: Uint8Array): Blob {
  const parts: Uint8Array[] = [Uint8Array.from(GZIP_HEADER)];
  let at = 0;
  do {
    const block = data.subarray(at, at + STORED_BLOCK_BYTES);
    at += block.length;
    const head = new Uint8Array(5);
    const view = new DataView(head.buffer);
    head[0] = at >= data.length ? 1 : 0;
    view.setUint16(1, block.length, true);
    view.setUint16(3, ~block.length & 0xffff, true);
    parts.push(head, block);
  } while (at < data.length);
  const trailer = new Uint8Array(8);
  const view = new DataView(trailer.buffer);
  view.setUint32(0, crc32(data), true);
  view.setUint32(4, data.length >>> 0, true);
  parts.push(trailer);
  return new Blob(parts.map((part) => part.slice()));
}

/**
 * The timelapse gzipped for POST /api/stickers, or null when it's over the server's limit: the
 * sticker then seals without one, rather than not at all.
 */
export async function gzipTimelapse(
  timelapse: TimelapseV2,
  report: (message: string) => void = console.error,
): Promise<Blob | null> {
  const json = JSON.stringify(timelapse);
  const blob =
    typeof CompressionStream === "function"
      ? await new Response(
          new Blob([json]).stream().pipeThrough(new CompressionStream("gzip")),
        ).blob()
      : storedGzip(new TextEncoder().encode(json));
  if (blob.size <= MAX_TIMELAPSE_BYTES) return blob;
  report(
    `The timelapse is ${blob.size} bytes gzipped, over the server's limit of ${MAX_TIMELAPSE_BYTES}, so the sticker seals without it`,
  );
  return null;
}
