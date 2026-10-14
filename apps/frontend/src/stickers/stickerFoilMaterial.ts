import { srgbToLinear, type FoilSize, type FoilStyle } from "./foilMaterial";
export interface StickerFoilMaterial {
  style: FoilStyle;
  size: FoilSize;
  /** Baked outer mask in the print's source frame; Kyoto Seika always grows the cut. */
  mask?: string;
  /** Optional authored palette in sRGB. Otherwise read the existing design tokens on admission. */
  palette?: readonly (readonly [number, number, number])[];
}
type Rgb = readonly [number, number, number];
type FoilColors = { palette: readonly Rgb[]; tint: number[]; ink: number[] };
// The design tokens are fixed for the page's life, so each style reads them, and recalculates
// style, once rather than on every foil a board acquires.
const colorsByStyle = new Map<string, FoilColors>();
export function stickerFoilColors(element: HTMLElement, material: StickerFoilMaterial) {
  const key = JSON.stringify([material.style, material.palette ?? null]);
  const cached = colorsByStyle.get(key);
  if (cached) return cached;
  const probe = document.createElement("span");
  element.append(probe);
  const read = (name: string): Rgb => {
    probe.style.color = `var(--${name})`;
    const rgb = getComputedStyle(probe).color.match(/[\d.]+/g);
    if (!rgb || rgb.length < 3) throw new Error(`Sticker foil color ${name} is unavailable`);
    return [Number(rgb[0]) / 255, Number(rgb[1]) / 255, Number(rgb[2]) / 255];
  };
  try {
    const names =
      material.style === "pink"
        ? ["rose", "blush", "pearl", "candy", "orchid", "magenta"]
        : ["pink", "peach", "lemon", "aqua", "sky", "lilac"];
    const palette = material.palette ?? names.map((name) => read(`foil-${name}`));
    // Pink foil reflects candy pink, the middle of its palette and of the 18+ mark.
    const tint =
      material.style === "pink"
        ? read("foil-candy")
        : material.style === "gold"
          ? read("foil-gold")
          : material.style === "roseGold"
            ? read("foil-rose-gold")
            : [1, 1, 1];
    const colors = {
      palette,
      tint: tint.map(srgbToLinear),
      ink: read("ink").map(srgbToLinear),
    };
    colorsByStyle.set(key, colors);
    return colors;
  } finally {
    probe.remove();
  }
}
