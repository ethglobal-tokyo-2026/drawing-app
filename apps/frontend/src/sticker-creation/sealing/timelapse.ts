import { MAX_TIMELAPSE_BYTES, type TimelapseV1 } from "@drawing-app/api/client";
import { STRIDE, type Op } from "../canvas/ops";
import type { Rect } from "./stickerLayers";

interface TimelapseInput {
  ops: readonly Op[];
  /** The ink canvas, in device pixels. */
  ink: { width: number; height: number };
  /** Where makeSticker cut the sticker from, in device pixels. */
  place: Rect;
  /** Device pixels per sheet pixel. */
  density: number;
}

const tenths = (n: number) => Math.round(n * 10);
/** A length to the tenth of a pixel, as JSON keeps it short. */
const toTenth = (n: number) => tenths(n) / 10;
/** A fill's tap to the hundredth of a pixel, so it seeds the pixel it seeded. */
const toHundredth = (n: number) => Math.round(n * 100) / 100;
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

export function encodeTimelapse({ ops, ink, place, density }: TimelapseInput): TimelapseV1 {
  const sheet = (n: number) => toTenth(n / density);
  return {
    v: 1,
    ink: [sheet(ink.width), sheet(ink.height)],
    place: [sheet(place.x), sheet(place.y), sheet(place.w), sheet(place.h)],
    density: toThousandth(density),
    ops: ops.map((op) =>
      op.tool === "fill"
        ? ["fill", op.color, Math.round(op.T), toHundredth(op.x), toHundredth(op.y)]
        : [op.tool, op.color, Math.round(op.T), pointChanges(op.pts)],
    ),
  };
}

/** A timelapse as the drawing screen's own ops again, in sheet pixels. */
export interface DecodedTimelapse {
  ink: { width: number; height: number };
  place: Rect;
  /** Device pixels per sheet pixel where it was drawn; null before densities were recorded. */
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

/**
 * The timelapse gzipped for POST /api/stickers, or null when it's over the server's limit: the
 * sticker then seals without one, rather than not at all.
 */
export async function gzipTimelapse(
  timelapse: TimelapseV1,
  report: (message: string) => void = console.error,
): Promise<Blob | null> {
  const gzipped = new Blob([JSON.stringify(timelapse)])
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const blob = await new Response(gzipped).blob();
  if (blob.size <= MAX_TIMELAPSE_BYTES) return blob;
  report(
    `The timelapse is ${blob.size} bytes gzipped, over the server's limit of ${MAX_TIMELAPSE_BYTES}, so the sticker seals without it`,
  );
  return null;
}
