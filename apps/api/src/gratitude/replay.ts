import { gunzipSync, gzipSync } from "node:zlib";
import { z } from "zod";
import { SHAKE_REVERSAL, STROKE_SAMPLE, TOUCH } from "./replayHits.ts";

/** The longest a combo runs: ReplayV1's durationMs ceiling. */
export const MAX_COMBO_MS = 8000;
/** Positions run from 0 to STAGE_UNITS across the stage, whatever its size in px. */
export const STAGE_UNITS = 10_000;

const replayEndReasons = ["empty", "cap", "hidden", "closed"] as const;

type SeriesValue = (typeof TOUCH | typeof STROKE_SAMPLE | typeof SHAKE_REVERSAL)[number];

/** A flat series of integers, a whole number of groups long. */
const seriesSchema = (layout: readonly SeriesValue[]) =>
  z
    .array(z.int())
    .refine(
      (values) => values.length % layout.length === 0,
      `not a whole number of [${layout.join(", ")}] groups`,
    );

interface Running {
  ms: number;
  x: number;
  y: number;
}

/** Why one value of a series is out of bounds, given the running sums through it, or null. */
function problemWith(name: SeriesValue, value: number, running: Running): string | null {
  switch (name) {
    case "ms":
      return value < 0 ? `a negative ms step, ${value}` : null;
    case "x":
    case "y":
      return running[name] < 0 || running[name] > STAGE_UNITS
        ? `${name} runs to ${running[name]}, off the stage's 0 to ${STAGE_UNITS}`
        : null;
    case "counted":
      return value === 0 || value === 1 ? null : `counted is ${value}, not 0 or 1`;
    case "direction":
      return value === 1 || value === -1 ? null : `a shake's direction is ${value}, not 1 or -1`;
  }
}

/** A series walked in order: the ms it spans, or its first value out of bounds. */
type Walked = { problem: null; ms: number } | { problem: string; at: number };

function walkSeries(values: readonly number[], layout: readonly SeriesValue[]): Walked {
  const running: Running = { ms: 0, x: 0, y: 0 };
  for (const [at, value] of values.entries()) {
    const name = layout[at % layout.length];
    if (name === "ms" || name === "x" || name === "y") running[name] += value;
    const problem = problemWith(name, value, running);
    if (problem !== null) return { problem, at };
  }
  return { problem: null, ms: running.ms };
}

/**
 * A gratitude combo, as played. Positions are 0 to STAGE_UNITS of the stage, and each ms, x and y is
 * the change from the one before, so the bounds hold for the running sums. Each stroke's sums start
 * over.
 */
export const replayV1Schema = z
  .object({
    v: z.literal(1),
    /** Seeds the pop-in lines and particles. */
    seed: z.uint32(),
    /** The receiver's setting. */
    intensity: z.number().min(0).max(1),
    /** Width and height, px. */
    stage: z.tuple([z.int().positive(), z.int().positive()]),
    durationMs: z.int().min(0).max(MAX_COMBO_MS),
    endReason: z.enum(replayEndReasons),
    /** The hit where a tap combo committed to stroke or shake; null for a tap combo. */
    switchedAtHit: z.int().min(0).nullable(),
    /** Every touch, flat: [ms since the touch before, x, y, counted (0 | 1)]. */
    hits: seriesSchema(TOUCH),
    /** One per stroke, flat: [ms since the sample before, x, y], at about 30 Hz. */
    strokes: z.array(seriesSchema(STROKE_SAMPLE)),
    /** Every reversal, flat: [ms since the reversal before, direction (1 | -1)]. */
    shakes: seriesSchema(SHAKE_REVERSAL),
    /** Per stroke, the indexes of its samples that ended a fast pass. */
    strokePasses: z.array(z.array(z.int().min(0))),
  })
  .superRefine((replay, ctx) => {
    const report = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: "custom", path, message });
    const touches = walkSeries(replay.hits, TOUCH);
    if (touches.problem !== null) {
      report(["hits", touches.at], touches.problem);
    } else if (touches.ms > replay.durationMs) {
      report(["hits"], `the touches run ${touches.ms} ms, past durationMs ${replay.durationMs}`);
    }
    for (const [stroke, samples] of replay.strokes.entries()) {
      const walked = walkSeries(samples, STROKE_SAMPLE);
      if (walked.problem !== null) report(["strokes", stroke, walked.at], walked.problem);
    }
    const shakes = walkSeries(replay.shakes, SHAKE_REVERSAL);
    if (shakes.problem !== null) report(["shakes", shakes.at], shakes.problem);
    const lists = replay.strokePasses.length;
    if (lists !== replay.strokes.length) {
      report(["strokePasses"], `${lists} lists of passes for ${replay.strokes.length} strokes`);
    }
    for (const [stroke, passes] of replay.strokePasses.entries()) {
      const samples = (replay.strokes[stroke]?.length ?? 0) / STROKE_SAMPLE.length;
      for (const [at, index] of passes.entries()) {
        if (index >= samples || (at > 0 && index <= passes[at - 1])) {
          report(
            ["strokePasses", stroke, at],
            `sample ${index} isn't a later sample of stroke ${stroke}`,
          );
        }
      }
    }
  });
export type ReplayV1 = z.infer<typeof replayV1Schema>;

/** A replay as the gratitude table stores it: gzipped JSON. */
export const gzipReplay = (replay: ReplayV1) => gzipSync(JSON.stringify(replay));

/** A stored replay, read back. One that doesn't parse is a server fault, so this throws. */
export function gunzipReplay(stored: Uint8Array): ReplayV1 {
  const json: unknown = JSON.parse(gunzipSync(stored).toString("utf8"));
  return replayV1Schema.parse(json);
}
