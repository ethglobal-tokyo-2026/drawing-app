import { MAX_TIMELAPSE_BYTES, type TimelapseV1 } from "@drawing-app/api/client";
import { STRIDE, type Op } from "../canvas/ops";
import type { SheetFrame } from "../canvas/sheetFrame";
import type { Rect } from "./stickerLayers";

interface TimelapseInput {
  ops: readonly Op[];
  /** The sheet the ops were drawn on: its size in units and its ink's density. */
  frame: SheetFrame;
  /** Where makeSticker cut the sticker from, in the ink canvas's device pixels. */
  place: Rect;
}

const tenths = (n: number) => Math.round(n * 10);
/** A length to the tenth of a pixel, as JSON keeps it short. */
const toTenth = (n: number) => tenths(n) / 10;
/**
 * A fill's tap as the middle of the device pixel it seeded, to the hundredth of a sheet unit: the
 * tap itself, rounded, could land in the pixel beside it.
 */
const seededPixel = (n: number, density: number) =>
  Math.round(((Math.floor(n * density) + 0.5) / density) * 100) / 100;
/** A density to the thousandth, as phones report ones like 2.625. */
const toThousandth = (n: number) => Math.round(n * 1000) / 1000;

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

export function encodeTimelapse({ ops, frame, place }: TimelapseInput): TimelapseV1 {
  const { density } = frame;
  const sheet = (n: number) => toTenth(n / density);
  return {
    v: 1,
    ink: [toTenth(frame.w), toTenth(frame.h)],
    place: [sheet(place.x), sheet(place.y), sheet(place.w), sheet(place.h)],
    density: toThousandth(density),
    ops: ops.map((op) =>
      op.tool === "fill"
        ? [
            "fill",
            op.color,
            Math.round(op.T),
            seededPixel(op.x, density),
            seededPixel(op.y, density),
          ]
        : [op.tool, op.color, Math.round(op.T), pointChanges(op.pts)],
    ),
  };
}

/** A timelapse as the drawing screen's own ops again, in sheet units. */
export interface DecodedTimelapse {
  ink: { width: number; height: number };
  place: Rect;
  /** Device pixels per sheet unit where it was drawn; null before densities were recorded. */
  density: number | null;
  ops: Op[];
}

/** A stroke's points from their changes, tenths back to pixels. */
function pointsFrom(changes: readonly number[]): number[] {
  const pts: number[] = [];
  const running = [0, 0, 0, 0];
  for (let i = 0; i + STRIDE <= changes.length; i += STRIDE) {
    for (let k = 0; k < STRIDE; k++) running[k] += changes[i + k] ?? 0;
    pts.push(running[0] / 10, running[1] / 10, running[2] / 10, running[3]);
  }
  return pts;
}

export function decodeTimelapse(timelapse: TimelapseV1): DecodedTimelapse {
  const [x, y, w, h] = timelapse.place;
  return {
    ink: { width: timelapse.ink[0], height: timelapse.ink[1] },
    place: { x, y, w, h },
    density: timelapse.density ?? null,
    ops: timelapse.ops.map((op): Op =>
      op[0] === "fill"
        ? { tool: "fill", color: op[1], T: op[2], x: op[3], y: op[4] }
        : { tool: op[0], color: op[1], T: op[2], pts: pointsFrom(op[3]) },
    ),
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
  timelapse: TimelapseV1,
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
