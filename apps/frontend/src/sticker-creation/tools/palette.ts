import { i18next } from "../../i18n/i18n";

/**
 * The color sheet's swatches, in rows of ten: inks, paper and skin; warms; pinks, purples and blues;
 * deep colors from orange round to plum.
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
  { hex: "#D96A00", name: "pumpkin" },
  { hex: "#B07F00", name: "ochre" },
  { hex: "#4E9A1C", name: "leaf" },
  { hex: "#0E9A6E", name: "green" },
  { hex: "#1B6E47", name: "forest" },
  { hex: "#00868B", name: "teal" },
  { hex: "#1478C8", name: "cerulean" },
  { hex: "#6C3AC4", name: "violet" },
  { hex: "#B4299A", name: "magenta" },
  { hex: "#9C2067", name: "plum" },
] as const;

/** A swatch's name in the app's language, or the hex of a color mixed on the pad. */
export function colorName(hex: string): string {
  const swatch = SWATCHES.find((s) => s.hex === hex);
  return swatch ? i18next.t(($) => $.stickerCreation.colorSheet.swatchNames[swatch.name]) : hex;
}

/** A new drawing starts in a random one of these, so drawings don't all come out in the same color. */
export const STARTING_COLORS = [
  // No Ink: every tool icon is Ink, so an Ink brush would read as one more icon on the color tile.
  "#E8484F", // Red
  "#B8472E", // Brick
  "#D96A00", // Pumpkin
  "#7A4A2E", // Chestnut
  "#B07F00", // Ochre
  "#4E9A1C", // Leaf
  "#0E9A6E", // Green
  "#1B6E47", // Forest
  "#00868B", // Teal
  "#1478C8", // Cerulean
  "#2F6BFF", // Blue
  "#3B3F8F", // Navy
  "#9B7BFF", // Grape
  "#6C3AC4", // Violet
  "#B4299A", // Magenta
  "#9C2067", // Plum
  "#FF4F9A", // Pink
] as const;

/** Every starting color shows as a thin line on the white sheet: its contrast with white is at least this. */
export const MIN_STARTING_CONTRAST = 3;
/** No two starting colors are closer than this in OKLab, so each one looks different from the rest. */
export const MIN_STARTING_DISTANCE = 0.08;

/**
 * A new drawing's color, at random from the starting colors but none in `avoid`: the last drawing's
 * starting color and the color in hand, so two drawings in a row never start alike.
 */
export function startingColor(avoid: readonly string[] = [], random = Math.random): string {
  const choices = STARTING_COLORS.filter((hex) => !avoid.includes(hex));
  return choices[Math.floor(random() * choices.length)];
}

/** The Recent row a first session starts with. */
export const FIRST_RECENT = ["#3B3F8F", "#1C1824", "#FF5A36", "#FFB547", "#7CC6FF", "#FFB8C9"];

/** The Recent row holds this many colors. */
const RECENT_MAX = 8;

/** The Recent row after a finished brush stroke in `color`: newest first, no repeats. */
export function withRecent(recent: string[], color: string): string[] {
  if (recent[0] === color) return recent;
  return [color, ...recent.filter((c) => c !== color)].slice(0, RECENT_MAX);
}
