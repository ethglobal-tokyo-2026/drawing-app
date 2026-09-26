/** The color sheet's swatches, in rows of ten: inks, paper and skin; warms; pinks, purples and blues. */
export const SWATCHES = [
  { hex: "#1C1824", name: "Ink" },
  { hex: "#4A4453", name: "Charcoal" },
  { hex: "#6E6878", name: "Graphite" },
  { hex: "#A39E93", name: "Stone" },
  { hex: "#D9D4CB", name: "Sand" },
  { hex: "#FFFFFF", name: "White" },
  { hex: "#FFF1D6", name: "Cream" },
  { hex: "#FFE0C7", name: "Peach" },
  { hex: "#E8B48C", name: "Tan" },
  { hex: "#9A6444", name: "Brown" },
  { hex: "#FFD93B", name: "Yellow" },
  { hex: "#FFB547", name: "Amber" },
  { hex: "#F7A541", name: "Apricot" },
  { hex: "#FF7A45", name: "Orange" },
  { hex: "#FF5A36", name: "Tomato" },
  { hex: "#E8484F", name: "Red" },
  { hex: "#B8472E", name: "Brick" },
  { hex: "#7A4A2E", name: "Chestnut" },
  { hex: "#C58A4A", name: "Caramel" },
  { hex: "#4A2F25", name: "Cocoa" },
  { hex: "#FFB8C9", name: "Blush" },
  { hex: "#FF9E9E", name: "Salmon" },
  { hex: "#FF4F9A", name: "Pink" },
  { hex: "#CDBEFF", name: "Lilac" },
  { hex: "#9B7BFF", name: "Grape" },
  { hex: "#3B3F8F", name: "Navy" },
  { hex: "#2F6BFF", name: "Blue" },
  { hex: "#7CC6FF", name: "Sky" },
  { hex: "#38D3DC", name: "Aqua" },
  { hex: "#BDEFF2", name: "Ice" },
] as const;

/** A swatch's name, or the hex of a color mixed on the pad. */
export const colorName = (hex: string) => SWATCHES.find((s) => s.hex === hex)?.name ?? hex;

export const FIRST_COLOR = "#1C1824";

/** The Recent row a first session starts with. */
export const FIRST_RECENT = ["#1C1824", "#FF5A36", "#FFB547", "#3B3F8F", "#7CC6FF", "#FFB8C9"];

/** The Recent row holds this many colors. */
const RECENT_MAX = 8;

/** The Recent row after a finished brush stroke in `color`: newest first, no repeats. */
export function withRecent(recent: string[], color: string): string[] {
  if (recent[0] === color) return recent;
  return [color, ...recent.filter((c) => c !== color)].slice(0, RECENT_MAX);
}
