/** A v4 UUID. crypto.randomUUID is missing on plain-http origins, such as the dev server on a LAN address. */
export function newIdempotencyKey(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Byte 6 carries the version, 4, and byte 8 the RFC 4122 variant.
  const hex = Array.from(crypto.getRandomValues(new Uint8Array(16)), (b, i) =>
    i === 6 ? (b & 0x0f) | 0x40 : i === 8 ? (b & 0x3f) | 0x80 : b,
  )
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
