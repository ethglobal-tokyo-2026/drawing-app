import { MAX_TIME_USED_S } from "@drawing-app/db";
import { crc32, deflateSync, gzipSync } from "node:zlib";
import type { z } from "zod";
import type { sealForm } from "./sealForm.ts";
import type { TimelapseV1 } from "./timelapse.ts";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const IHDR_BYTES = 13;
const BIT_DEPTH = 8;
const COLOR_TYPE_RGBA = 6;
/** Where IHDR's bit depth and color type sit, after the width and height. */
const IHDR_BIT_DEPTH_AT = 8;
const IHDR_COLOR_TYPE_AT = 9;
const UINT32_BYTES = 4;
const RGBA_BYTES = 4;

/** A PNG chunk: its data's length, its type, the data, and the CRC of the type and data. */
function chunk(type: string, data: Uint8Array): Buffer {
  const typeAndData = Buffer.concat([Buffer.from(type, "latin1"), data]);
  const length = Buffer.alloc(UINT32_BYTES);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(UINT32_BYTES);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
}

/**
 * A clear `width` × `height` PNG (8-bit RGBA), whole, since the disk image store decodes it to make
 * its WebP files. `comment` adds a tEXt chunk, for two PNGs of one size with different bytes.
 */
export function testPng(width: number, height: number, comment?: string): Uint8Array<ArrayBuffer> {
  const ihdr = Buffer.alloc(IHDR_BYTES);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, UINT32_BYTES);
  ihdr.writeUInt8(BIT_DEPTH, IHDR_BIT_DEPTH_AT);
  ihdr.writeUInt8(COLOR_TYPE_RGBA, IHDR_COLOR_TYPE_AT);
  const text = comment === undefined ? [] : [chunk("tEXt", Buffer.from(`Comment\0${comment}`))];
  // Each row is its filter byte (0, none), then four zero bytes a pixel.
  const pixels = deflateSync(Buffer.alloc((1 + width * RGBA_BYTES) * height));
  return new Uint8Array(
    Buffer.concat([
      Buffer.from(PNG_SIGNATURE),
      chunk("IHDR", ihdr),
      ...text,
      chunk("IDAT", pixels),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
}

/** The test sticker's size. */
export const STICKER_SIZE = { width: 320, height: 240 };
/** The test sticker's sharp copy: larger on both sides. */
export const SHARP_SIZE = { width: 800, height: 600 };
/** Its size on the sheet, in sheet units: the timelapse's place, at two image px per unit. */
export const STICKER_DRAWN_SIZE = { width: 160, height: 120.5 };
/** The live resin's band-sized masks, and the flat sheet: neither is the sticker's size. */
const BAND_SIZE = { width: 352, height: 272 };
const SHEET_SIZE = { width: 1100, height: 800 };

/** The five images a seal uploads. Each part's bytes differ, so a mix-up shows. */
export const sealImages = () => ({
  png: testPng(STICKER_SIZE.width, STICKER_SIZE.height),
  mask: testPng(STICKER_SIZE.width, STICKER_SIZE.height, "mask"),
  spec: testPng(BAND_SIZE.width, BAND_SIZE.height, "spec"),
  rim: testPng(BAND_SIZE.width, BAND_SIZE.height, "rim"),
  flat: testPng(SHEET_SIZE.width, SHEET_SIZE.height, "flat"),
});

/** The test sticker's sharp copy. */
export const sharpImage = () => testPng(SHARP_SIZE.width, SHARP_SIZE.height, "sharp");

/** How the tests' sticker was drawn: one brush stroke of two points, then two fills. */
export const TEST_TIMELAPSE: TimelapseV1 = {
  v: 1,
  ink: [SHEET_SIZE.width, SHEET_SIZE.height],
  place: [10, 20, STICKER_DRAWN_SIZE.width, STICKER_DRAWN_SIZE.height],
  density: 2,
  ops: [
    ["brush", "#ff3366", 0, [100, 200, 60, 0, 50, 25, 0, 16]],
    // Sealed before fills recorded their gap, as stored timelapses may be.
    ["fill", "#33aaff", 1500, 40.5, 60],
    ["fill", "#ffcc00", 2100, 80.5, 30, 2],
  ],
};

/** A gzipped timelapse, which sealing stores as sent. */
export const testTimelapse = () => new Uint8Array(gzipSync(JSON.stringify(TEST_TIMELAPSE)));

export const pngFile = (bytes: Uint8Array<ArrayBuffer>, name: string) =>
  new File([bytes], `${name}.png`, { type: "image/png" });

/** The seal's multipart parts, by name; undefined leaves a part out. */
export type SealParts = Partial<Record<keyof z.input<typeof sealForm>, string | File>>;

/** A seal that passes every check, on ticket use `ticketUseId`: the form the typed client uploads. */
export function sealUpload(ticketUseId: number) {
  const images = sealImages();
  return {
    ticketUseId: String(ticketUseId),
    timeUsed: String(MAX_TIME_USED_S),
    width: String(STICKER_SIZE.width),
    height: String(STICKER_SIZE.height),
    drawnWidth: String(STICKER_DRAWN_SIZE.width),
    drawnHeight: String(STICKER_DRAWN_SIZE.height),
    outline: "M0 0L1 0L1 1Z",
    png: pngFile(images.png, "png"),
    sharp: pngFile(sharpImage(), "sharp"),
    mask: pngFile(images.mask, "mask"),
    spec: pngFile(images.spec, "spec"),
    rim: pngFile(images.rim, "rim"),
    flat: pngFile(images.flat, "flat"),
    timelapse: new File([testTimelapse()], "timelapse.json.gz", { type: "application/gzip" }),
    nsfw: "false",
  } satisfies z.input<typeof sealForm>;
}

/** A seal that passes every check, on ticket use `ticketUseId`, with `overrides` over it. */
export const sealParts = (ticketUseId: number, overrides: Partial<SealParts> = {}): SealParts => ({
  ...sealUpload(ticketUseId),
  ...overrides,
});

export function sealFormData(parts: SealParts): FormData {
  const form = new FormData();
  for (const [name, value] of Object.entries(parts)) {
    if (value !== undefined) form.append(name, value);
  }
  return form;
}
