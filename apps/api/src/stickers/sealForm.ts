import { MAX_TIME_USED_S, stickers, ticketUses } from "@drawing-app/db";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { MAX_TIMELAPSE_BYTES } from "./timelapseLimit.ts";

// Generous bounds, not measured: makeSticker caps the sticker and its flat sheet well below them.
const MAX_IMAGE_SIDE = 4096;
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const MAX_OUTLINE_LENGTH = 200_000;
/** The whole multipart body. */
export const MAX_SEAL_BYTES = 32 * 1024 * 1024;

/** An SVG path of M, L and Z commands and numbers, as makeSticker writes the cut line. */
const OUTLINE_PATH = /^M[-\d. LZ]*Z$/;

const stickerColumns = createInsertSchema(stickers, {
  timeUsed: (schema) => schema.min(0).max(MAX_TIME_USED_S),
  width: (schema) => schema.min(1).max(MAX_IMAGE_SIDE),
  height: (schema) => schema.min(1).max(MAX_IMAGE_SIDE),
  outline: (schema) =>
    schema.max(MAX_OUTLINE_LENGTH).regex(OUTLINE_PATH, "expected an SVG path of M, L and Z"),
}).shape;

/** A form field of decimal digits, checked as the integer column it fills. */
const digits = (column: z.ZodType<number, number>) =>
  z
    .string()
    .regex(/^\d+$/, "expected decimal digits")
    .transform((text) => Number(text))
    .pipe(column);

const png = z.file().mime("image/png").max(MAX_IMAGE_BYTES);

/** POST /api/stickers's multipart parts. The timelapse is optional, and stored as sent. */
export const sealForm = z.object({
  ticketUseId: digits(createSelectSchema(ticketUses).shape.id.min(1)),
  timeUsed: digits(stickerColumns.timeUsed),
  width: digits(stickerColumns.width),
  height: digits(stickerColumns.height),
  outline: stickerColumns.outline,
  png,
  mask: png,
  spec: png,
  rim: png,
  flat: png,
  timelapse: z.file().max(MAX_TIMELAPSE_BYTES).optional(),
  /** An NSFW sticker, which only an adult can seal. */
  nsfw: z
    .enum(["true", "false"])
    .default("false")
    .transform((text) => text === "true"),
});
export type SealForm = z.infer<typeof sealForm>;
