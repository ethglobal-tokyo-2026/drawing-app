import { KYOTO_SEIKA_TIME_USED_S, stickers, ticketUses } from "@drawing-app/db";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { MAX_STICKER_IMAGE_SIDE } from "./imageSides.ts";
import { kyotoSeikaSubjectsSchema } from "./kyotoSeikaSubjects.ts";
import { MAX_TIMELAPSE_BYTES } from "./timelapseLimit.ts";

// A generous bound, not measured: makeSticker caps the sticker and its flat sheet well below it.
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
/** The sharp copy is larger: room for its raw pixels at its largest, never reached as a PNG. */
const MAX_SHARP_IMAGE_BYTES = 16 * 1024 * 1024;
const MAX_OUTLINE_LENGTH = 200_000;
/** A drawn side, in sheet units: the sheet's long side with the cut's band past it is well under it. */
const MAX_DRAWN_SIDE = 4096;
/** The whole multipart body. */
export const MAX_SEAL_BYTES = 32 * 1024 * 1024;

/** An SVG path of M, L and Z commands and numbers, as makeSticker writes the cut line. */
const OUTLINE_PATH = /^M[-\d. LZ]*Z$/;

const stickerColumns = createInsertSchema(stickers, {
  // The longest clock; the seal holds each sticker to its own ticket's.
  timeUsed: (schema) => schema.min(0).max(KYOTO_SEIKA_TIME_USED_S),
  width: (schema) => schema.min(1).max(MAX_STICKER_IMAGE_SIDE),
  height: (schema) => schema.min(1).max(MAX_STICKER_IMAGE_SIDE),
  drawnWidth: (schema) => schema.positive().max(MAX_DRAWN_SIDE),
  drawnHeight: (schema) => schema.positive().max(MAX_DRAWN_SIDE),
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

/** A form field of a decimal number, checked as the real column it fills. */
const decimal = (column: z.ZodType<number, number>) =>
  z
    .string()
    .regex(/^\d+(\.\d+)?$/, "expected a decimal number")
    .transform((text) => Number(text))
    .pipe(column);

/** A form field holding JSON, checked against `schema`. */
const jsonField = <Schema extends z.ZodType>(schema: Schema) =>
  z
    .string()
    .transform((text, ctx) => {
      try {
        const value: unknown = JSON.parse(text);
        return value;
      } catch {
        ctx.addIssue({ code: "custom", message: "expected JSON" });
        return z.NEVER;
      }
    })
    .pipe(schema);

const png = z.file().mime("image/png").max(MAX_IMAGE_BYTES);

/**
 * POST /api/stickers's multipart parts. The timelapse is optional, and stored as sent. Parts it doesn't
 * name are dropped, not refused, so a page open since an older build still seals.
 */
export const sealForm = z.object({
  ticketUseId: digits(createSelectSchema(ticketUses).shape.id.min(1)),
  timeUsed: digits(stickerColumns.timeUsed),
  width: digits(stickerColumns.width),
  height: digits(stickerColumns.height),
  /** The image's size on the sheet it was drawn on, in sheet units: what sizes it on a sticker board. */
  drawnWidth: decimal(stickerColumns.drawnWidth),
  drawnHeight: decimal(stickerColumns.drawnHeight),
  outline: stickerColumns.outline,
  png,
  /** The sticker again, larger, from ink that holds more than `png`. */
  sharp: z.file().mime("image/png").max(MAX_SHARP_IMAGE_BYTES).optional(),
  mask: png,
  flat: png,
  timelapse: z.file().max(MAX_TIMELAPSE_BYTES).optional(),
  /** An NSFW sticker: whoever seals it may mark it 18+, opted in or not. */
  nsfw: z
    .enum(["true", "false"])
    .default("false")
    .transform((text) => text === "true"),
  /**
   * The subject pair, as JSON: required on a ticket spent in Kyoto Seika Manga Expression Practice
   * Mode, refused on any other.
   */
  kyotoSeikaSubjects: jsonField(kyotoSeikaSubjectsSchema).optional(),
});
export type SealForm = z.infer<typeof sealForm>;
