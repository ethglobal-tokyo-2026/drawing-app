import type { Op } from "../canvas/ops";
import type { SealedSticker } from "./makeSticker";

export interface TimelapseV1 {
  v: 1;
  ink: [width: number, height: number];
  place: [x: number, y: number, width: number, height: number];
  ops: Array<
    | [tool: "brush" | "eraser", color: string, startMs: number, points: number[]]
    | [tool: "fill", color: string, atMs: number, x: number, y: number]
  >;
}

const tenth = (value: number) => Math.round(value * 10);

/** Encodes stroke points as compact deltas while keeping fills directly seekable. */
export function makeTimelapse(
  sticker: Pick<SealedSticker, "inkWidth" | "inkHeight" | "place">,
  ops: readonly Op[],
): TimelapseV1 {
  return {
    v: 1,
    ink: [sticker.inkWidth, sticker.inkHeight],
    place: [sticker.place.x, sticker.place.y, sticker.place.w, sticker.place.h],
    ops: ops.map((op) => {
      if (op.tool === "fill") {
        return ["fill", op.color, Math.round(op.T), tenth(op.x), tenth(op.y)];
      }
      const points: number[] = [];
      let previousX = 0;
      let previousY = 0;
      let previousWidth = 0;
      let previousTime = 0;
      for (let i = 0; i < op.pts.length; i += 4) {
        const x = tenth(op.pts[i] ?? 0);
        const y = tenth(op.pts[i + 1] ?? 0);
        const width = tenth(op.pts[i + 2] ?? 0);
        const time = Math.round(op.pts[i + 3] ?? 0);
        points.push(x - previousX, y - previousY, width - previousWidth, time - previousTime);
        previousX = x;
        previousY = y;
        previousWidth = width;
        previousTime = time;
      }
      return [op.tool, op.color, Math.round(op.T), points];
    }),
  };
}

/** POST /api/stickers stores this exact gzip stream for the later drawing replay. */
export async function gzipTimelapse(timelapse: TimelapseV1): Promise<Blob> {
  const stream = new Blob([JSON.stringify(timelapse)], { type: "application/json" })
    .stream()
    .pipeThrough(new CompressionStream("gzip"));
  const compressed = await new Response(stream).blob();
  return compressed.slice(0, compressed.size, "application/gzip");
}
