const parsed = new Map<string, { viewBox: string; body: string }>();

/** Splits a published SVG file into its viewBox and inner markup, so it renders inline in currentColor. */
export function parseSvg(svg: string) {
  let hit = parsed.get(svg);
  if (!hit) {
    const match = /<svg([^>]*)>([\s\S]*)<\/svg>/.exec(svg);
    if (!match) throw new Error("Icon source is not an SVG document");
    const viewBox = /viewBox="([^"]+)"/.exec(match[1])?.[1];
    if (!viewBox) throw new Error("Icon SVG has no viewBox");
    hit = { viewBox, body: match[2] };
    parsed.set(svg, hit);
  }
  return hit;
}
