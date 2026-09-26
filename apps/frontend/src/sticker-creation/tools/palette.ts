import { i18next } from "../../i18n/i18n";

/**
 * The color sheet's swatches, in rows of ten: inks, paper and skin; warms; pinks, purples and blues.
 * Each `name` is its key in the catalog's swatch names.
 */
export const SWATCHES = [
  { hex: "#1C1824", name: "ink" },
  { hex: "#4A4453", name: "charcoal" },
  { hex: "#6E6878", name: "graphite" },
  { hex: "#A39E93", name: "stone" },
  { hex: "#D9D4CB", name: "sand" },
  { hex: "#FFFFFF", name: "white" },
  { hex: "#FFF1D6", name: "cream" },
  { hex: "#FFE0C7", name: "peach" },
  { hex: "#E8B48C", name: "tan" },
  { hex: "#9A6444", name: "brown" },
  { hex: "#FFD93B", name: "yellow" },
  { hex: "#FFB547", name: "amber" },
  { hex: "#F7A541", name: "apricot" },
  { hex: "#FF7A45", name: "orange" },
  { hex: "#FF5A36", name: "tomato" },
  { hex: "#E8484F", name: "red" },
  { hex: "#B8472E", name: "brick" },
  { hex: "#7A4A2E", name: "chestnut" },
  { hex: "#C58A4A", name: "caramel" },
  { hex: "#4A2F25", name: "cocoa" },
  { hex: "#FFB8C9", name: "blush" },
  { hex: "#FF9E9E", name: "salmon" },
  { hex: "#FF4F9A", name: "pink" },
  { hex: "#CDBEFF", name: "lilac" },
  { hex: "#9B7BFF", name: "grape" },
  { hex: "#3B3F8F", name: "navy" },
  { hex: "#2F6BFF", name: "blue" },
  { hex: "#7CC6FF", name: "sky" },
  { hex: "#38D3DC", name: "aqua" },
  { hex: "#BDEFF2", name: "ice" },
] as const;

/** A swatch's name in the app's language, or the hex of a color mixed on the pad. */
export function colorName(hex: string): string {
  const swatch = SWATCHES.find((s) => s.hex === hex);
  return swatch ? i18next.t(($) => $.stickerCreation.colorSheet.swatchNames[swatch.name]) : hex;
}

/** Navy, not Ink: every tool icon is Ink, so an Ink brush would read as one more icon on the color tile. */
export const FIRST_COLOR = "#3B3F8F";

/** The Recent row a first session starts with. */
export const FIRST_RECENT = ["#3B3F8F", "#1C1824", "#FF5A36", "#FFB547", "#7CC6FF", "#FFB8C9"];

/** The Recent row holds this many colors. */
const RECENT_MAX = 8;

/** The Recent row after a finished brush stroke in `color`: newest first, no repeats. */
export function withRecent(recent: string[], color: string): string[] {
  if (recent[0] === color) return recent;
  return [color, ...recent.filter((c) => c !== color)].slice(0, RECENT_MAX);
}
