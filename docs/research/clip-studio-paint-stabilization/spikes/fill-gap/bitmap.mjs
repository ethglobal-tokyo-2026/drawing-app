import { deflateSync, inflateSync } from "node:zlib";

export function packMask(mask, width, height) {
  if (mask.length !== width * height) throw new Error("Mask dimensions differ from its pixels");
  const strideBytes = Math.ceil(width / 8);
  const bytes = Buffer.alloc(strideBytes * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) bytes[y * strideBytes + (x >> 3)] |= 0x80 >> (x & 7);
    }
  }
  return {
    width,
    height,
    strideBytes,
    encoding: "zlib-base64",
    msbFirst: true,
    data: deflateSync(bytes, { level: 9 }).toString("base64"),
  };
}

export function decodeBitmap(bitmap) {
  if (bitmap.state && bitmap.state !== "present")
    throw new Error(`Bitmap state is ${bitmap.state}`);
  if (bitmap.complete === false || bitmap.errors?.length)
    throw new Error("Bitmap capture is incomplete");
  const { width, height, strideBytes } = bitmap.header ?? bitmap;
  if (
    ![width, height, strideBytes].every(Number.isInteger) ||
    width <= 0 ||
    height <= 0 ||
    strideBytes < Math.ceil(width / 8)
  )
    throw new Error("Invalid bitmap dimensions or stride");
  let bytes;
  if (bitmap.dataHex !== undefined) {
    if (!/^(?:[0-9a-fA-F]{2})*$/.test(bitmap.dataHex))
      throw new Error("Invalid hexadecimal bitmap bytes");
    bytes = Buffer.from(bitmap.dataHex, "hex");
  } else if (bitmap.encoding === "zlib-base64" && bitmap.msbFirst === true) {
    bytes = inflateSync(Buffer.from(bitmap.data, "base64"));
  } else throw new Error("Unsupported bitmap encoding");
  if (bytes.length !== strideBytes * height)
    throw new Error("Bitmap byte count differs from dimensions");
  const mask = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      mask[y * width + x] = Number(Boolean(bytes[y * strideBytes + (x >> 3)] & (0x80 >> (x & 7))));
    }
  }
  return { width, height, mask };
}

export function reprojectBitmap(bitmap, width, height, documentOffset) {
  if (documentOffset?.length !== 2 || !documentOffset.every(Number.isInteger)) {
    throw new Error("Document coordinate offset must contain two integers");
  }
  const decoded = decodeBitmap(bitmap);
  const mask = new Uint8Array(width * height);
  let selectedOutsideDocument = 0;
  for (let y = 0; y < decoded.height; y++) {
    for (let x = 0; x < decoded.width; x++) {
      if (!decoded.mask[y * decoded.width + x]) continue;
      const dx = x + documentOffset[0],
        dy = y + documentOffset[1];
      if (dx < 0 || dy < 0 || dx >= width || dy >= height) selectedOutsideDocument++;
      else mask[dy * width + dx] = 1;
    }
  }
  return {
    mask,
    selectedOutsideDocument,
    bitmapWidth: decoded.width,
    bitmapHeight: decoded.height,
  };
}

export function summarize(mask, width, height, probes = {}) {
  let count = 0,
    left = width,
    top = height,
    right = -1,
    bottom = -1;
  const touches = new Set();
  for (let p = 0; p < mask.length; p++) {
    if (!mask[p]) continue;
    const x = p % width,
      y = Math.floor(p / width);
    count++;
    left = Math.min(left, x);
    top = Math.min(top, y);
    right = Math.max(right, x);
    bottom = Math.max(bottom, y);
    if (x === 0) touches.add("left");
    if (x === width - 1) touches.add("right");
    if (y === 0) touches.add("top");
    if (y === height - 1) touches.add("bottom");
  }
  return {
    selectedPixels: count,
    boundsExclusive: count ? [left, top, right + 1, bottom + 1] : null,
    touches: [...touches].sort(),
    probes: Object.fromEntries(
      Object.entries(probes).map(([name, [x, y]]) => [
        name,
        { x, y, selected: Boolean(mask[y * width + x]) },
      ]),
    ),
  };
}

function crc32(bytes) {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function encodePng(width, height, rgba) {
  if (rgba.length !== width * height * 4) throw new Error("PNG RGBA dimensions differ");
  function chunk(kind, data) {
    const body = Buffer.concat([Buffer.from(kind), data]);
    const head = Buffer.alloc(4),
      tail = Buffer.alloc(4);
    head.writeUInt32BE(data.length);
    tail.writeUInt32BE(crc32(body));
    return Buffer.concat([head, body, tail]);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(width, 0);
  header.writeUInt32BE(height, 4);
  header[8] = 8;
  header[9] = 6;
  const rows = Buffer.alloc(height * (width * 4 + 1));
  for (let y = 0; y < height; y++)
    rows.set(rgba.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
