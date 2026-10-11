import { z } from "zod";
import { MAX_LAYERS } from "./schema/limits.ts";

/** The maximum uncompressed recording size for both uploads and database conversion. */
export const MAX_TIMELAPSE_JSON_BYTES = 16 * 1024 * 1024;

/** A stroke's points: x, y and width in tenths of a unit, plus ms, each a change from the one before. */
const strokePoints = z
  .array(z.number())
  .refine((points) => points.length % 4 === 0, "expected 4 numbers per point");

/** The original sheet, cut position and device-pixel density shared by every version. */
const frame = {
  ink: z.tuple([z.number().positive(), z.number().positive()]),
  place: z.tuple([z.number(), z.number(), z.number().positive(), z.number().positive()]),
  density: z.number().positive(),
};

/**
 * A timelapse from before timelapses recorded layers, all on one: what a page loaded before then
 * still uploads, and sealing converts to v4.
 */
const timelapseV1Schema = z.object({
  v: z.literal(1),
  ...frame,
  ops: z.array(
    z.union([
      z.tuple([z.enum(["brush", "eraser"]), z.string(), z.number(), strokePoints]),
      z.tuple([
        z.literal("fill"),
        z.string(),
        z.number(),
        z.number(),
        z.number(),
        z.number().nonnegative(),
      ]),
      // A fill sealed before fills recorded their gap: it closed none.
      z.tuple([z.literal("fill"), z.string(), z.number(), z.number(), z.number()]),
    ]),
  ),
});

const layerId = z.number().int().min(1);
const at = z.number().int().nonnegative();
/** Every step whose tuple is unchanged between layered recording versions. */
const otherSteps = [
  z.tuple([z.enum(["brush", "eraser"]), layerId, z.string(), z.number(), strokePoints]),
  z.tuple([z.literal("clear"), layerId, z.number()]),
  z.tuple([z.literal("add"), layerId, z.number(), at]),
  z.tuple([z.literal("delete"), layerId, z.number()]),
  z.tuple([z.literal("move"), layerId, z.number(), at]),
  z.tuple([z.literal("opacity"), layerId, z.number(), z.number().int().min(0).max(100)]),
  z.tuple([z.literal("lock"), layerId, z.number(), z.boolean()]),
  z.tuple([z.literal("clip"), layerId, z.number(), z.boolean()]),
] as const;
/** Fill's tool, layer, color, time, seed coordinates and maximum closed gap. */
const fillValues = [
  z.literal("fill"),
  layerId,
  z.string(),
  z.number(),
  z.number(),
  z.number(),
  z.number().nonnegative(),
] as const;
const timelapseV2Schema = z.object({
  ...frame,
  v: z.literal(2),
  layers: z
    .array(z.tuple([layerId, z.number().int().min(0).max(100), z.boolean(), z.boolean()]))
    .min(1)
    .max(MAX_LAYERS),
  ops: z.array(z.union([z.tuple(fillValues), ...otherSteps])),
});
/** Current recordings require an explicit reference on every Fill. */
export const timelapseV3Schema = timelapseV2Schema.extend({
  v: z.literal(3),
  ops: z.array(z.union([z.tuple([...fillValues, z.enum(["layer", "visible"])]), ...otherSteps])),
});

export type TimelapseV3 = z.infer<typeof timelapseV3Schema>;
const mergeStep = z.tuple([z.literal("merge"), layerId, z.number(), layerId]);
const timelapseV4Shape = timelapseV3Schema.extend({
  v: z.literal(4),
  ops: z.array(
    z.union([z.tuple([...fillValues, z.enum(["layer", "visible"])]), ...otherSteps, mergeStep]),
  ),
});

/** Checks the layer sequence a v4 player must replay, including Merge's clipping dependency. */
function replayableV4(value: z.infer<typeof timelapseV4Shape>, context: z.RefinementCtx): void {
  const layers = value.layers.map(([id, , , clipped]) => ({ id, clipped }));
  const unique = new Set(layers.map(({ id }) => id));
  const invalid = (index: number, reason: string) =>
    context.addIssue({ code: "custom", path: ["ops", index], message: reason });
  if (unique.size !== layers.length) {
    context.addIssue({ code: "custom", path: ["layers"], message: "duplicate starting layer id" });
    return;
  }
  let nextId = Math.max(...unique) + 1;
  for (const [index, step] of value.ops.entries()) {
    const [tool, id] = step;
    const at = layers.findIndex((layer) => layer.id === id);
    if (tool === "add") {
      if (at >= 0 || id < nextId || layers.length >= MAX_LAYERS || step[3] > layers.length) {
        invalid(index, "layer add cannot be replayed");
        return;
      }
      layers.splice(step[3], 0, { id, clipped: false });
      nextId = id + 1;
      continue;
    }
    if (at < 0) {
      invalid(index, `layer ${id} does not exist`);
      return;
    }
    switch (tool) {
      case "delete":
        if (layers.length === 1) {
          invalid(index, "cannot delete the last layer");
          return;
        }
        layers.splice(at, 1);
        break;
      case "move": {
        if (step[3] >= layers.length) {
          invalid(index, "layer move destination is out of range");
          return;
        }
        const [moved] = layers.splice(at, 1);
        layers.splice(step[3], 0, moved);
        break;
      }
      case "clip":
        layers[at].clipped = step[3];
        break;
      case "merge":
        if (at === 0 || layers[at - 1].id !== step[3]) {
          invalid(index, "Merge destination must be the immediate lower layer");
          return;
        }
        if (layers[at + 1]?.clipped) {
          invalid(index, "a clipped layer above still depends on the Merge source");
          return;
        }
        layers[at - 1].clipped = false;
        layers.splice(at, 1);
        break;
    }
  }
}

/** Current recording format: v3's meanings plus one durable Merge step. */
export const timelapseV4Schema = timelapseV4Shape.superRefine(replayableV4);
export type TimelapseV4 = z.infer<typeof timelapseV4Schema>;
export const uploadedTimelapseSchema = z.discriminatedUnion("v", [
  timelapseV1Schema,
  timelapseV2Schema,
  timelapseV3Schema,
  timelapseV4Schema,
]);

/** Validates historical uploads and stored recordings, assigning historical fills visible reference. */
export function normalizeTimelapse(value: unknown): TimelapseV4 {
  const parsed = uploadedTimelapseSchema.parse(value);
  if (parsed.v === 4) return parsed;
  const layers = parsed.v === 1 ? [[1, 100, false, false]] : parsed.layers;
  const ops = parsed.ops.map((op) => {
    if (parsed.v === 1) {
      const [tool, ...values] = op;
      if (tool === "fill") return [tool, 1, ...values.slice(0, 4), values[4] ?? 0, "visible"];
      return [tool, 1, ...values];
    }
    return parsed.v === 2 && op[0] === "fill" ? [...op, "visible"] : op;
  });
  return timelapseV4Schema.parse({ ...parsed, v: 4, layers, ops });
}
