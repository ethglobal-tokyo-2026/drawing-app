import { encodeQR } from "@paulmillr/qr";

/** The modules of `value`'s QR code, row by row, true where dark, with no quiet zone. */
export function qrModules(value: string): boolean[][] {
  return encodeQR(value, "raw", { ecc: "medium", border: 0 });
}
