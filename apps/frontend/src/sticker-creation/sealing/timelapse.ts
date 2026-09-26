import { MAX_TIMELAPSE_BYTES } from "@drawing-app/api/client";
import { STRIDE, type Op } from "../canvas/ops";
import type { Rect } from "./stickerLayers";

/**
 * How a sticker was drawn, uploaded with it at seal: `TimelapseV1` in the REST API's contract.
 * Lengths are sheet pixels, the ops' own space, whatever the screen's density.
 */
export interface TimelapseV1 {
  v: 1;
  /** The sheet the ops were drawn on. */
  ink: [width: number, height: number];
  /** Where the sticker image sits on the sheet. */
  place: [x: number, y: number, width: number, height: number];
  /**
   * In the order drawn, each with its ms into the session. A stroke's points are x, y and width in
   * tenths of a pixel, plus ms, each a change from the point before.
   */
  ops: Array<
    | [tool: "brush" | "eraser", color: string, startMs: number, points: number[]]
    | [tool: "fill", color: string, atMs: number, x: number, y: number]
  >;
}

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
    ops: ops.map((op) =>
      op.tool === "fill"
        ? ["fill", op.color, Math.round(op.T), toTenth(op.x), toTenth(op.y)]
        : [op.tool, op.color, Math.round(op.T), pointChanges(op.pts)],
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
