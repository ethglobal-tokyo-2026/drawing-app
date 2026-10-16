import { glslFloat as f } from "./glsl";

type Rgb = readonly [number, number, number];

/**
 * The tone of paper and metal: Khronos PBR Neutral's highlight compression, from `start` rather than
 * its 0.76, so paper white keeps its level; `desaturation` is PBR Neutral's own. No black offset, so
 * ink keeps its depth. A screen can't show the ceiling light's reflection, and this keeps the artists'
 * hues where ACES or AgX would move them.
 */
export const TONE = { start: 0.88, desaturation: 0.15 } as const;

const reach = 1 - TONE.start;

/** The display's level for a linear peak above the start: it rolls toward 1 and never reaches it. */
const compressedPeak = (peak: number) => 1 - (reach * reach) / (peak + reach - TONE.start);

/**
 * A linear color's displayed linear color: identity up to the start; above it, the peak channel rolls
 * toward white, every channel scaled with it so the hue holds, and the energy it sheds washes the color
 * toward white.
 */
export function highlightCompress([r, g, b]: Rgb): Rgb {
  const peak = Math.max(r, g, b);
  if (peak <= TONE.start) return [r, g, b];
  const shown = compressedPeak(peak);
  const toWhite = 1 - 1 / (TONE.desaturation * (peak - shown) + 1);
  const channel = (c: number) => (c * shown) / peak + (shown - (c * shown) / peak) * toWhite;
  return [channel(r), channel(g), channel(b)];
}

/**
 * highlightCompress without the wash toward white: the peak rolls off the same way and the other
 * channels keep their share of it, so a bright color keeps its saturation, as foil's diffraction
 * orders do.
 */
export function highlightCompressKeepingHue([r, g, b]: Rgb): Rgb {
  const peak = Math.max(r, g, b);
  if (peak <= TONE.start) return [r, g, b];
  const scale = compressedPeak(peak) / peak;
  return [r * scale, g * scale, b * scale];
}

/** highlightCompress and highlightCompressKeepingHue in GLSL, from the same constants. */
export const toneFragment = `
float highlightPeak(float peak){return 1.-${f(reach * reach)}/(peak-${f(TONE.start - reach)});}
vec3 highlightCompressKeepingHue(vec3 c){
 float peak=max(c.r,max(c.g,c.b));
 return peak<=${f(TONE.start)}?c:c*(highlightPeak(peak)/peak);
}
vec3 highlightCompress(vec3 c){
 float peak=max(c.r,max(c.g,c.b));
 if(peak<=${f(TONE.start)})return c;
 float shown=highlightPeak(peak);
 return mix(c*(shown/peak),vec3(shown),1.-1./(${f(TONE.desaturation)}*(peak-shown)+1.));
}
`;
