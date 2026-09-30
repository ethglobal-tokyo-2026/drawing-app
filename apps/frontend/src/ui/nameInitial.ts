// LINE names often start with an emoji; a grapheme keeps flags and joined emoji whole.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** A name's first letter as a photo sticker without a picture shows it. */
export function nameInitial(name: string): string {
  const [first] = graphemes.segment(name.trim());
  return first?.segment.toUpperCase() ?? "";
}
