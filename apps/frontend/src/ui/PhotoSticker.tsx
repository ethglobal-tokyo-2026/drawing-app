import { revealOnLoad } from "./reveal";
import "./photo-sticker.css";

interface Props {
  /** The LINE picture. Without one, the name's first letter stands in. */
  src?: string;
  name: string;
  size: number;
}

// LINE names often start with an emoji; a grapheme keeps flags and joined emoji whole.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/** A LINE picture stuck on like a purikura sticker: round, white-rimmed, tilted by the one hand. */
export function PhotoSticker({ src, name, size }: Props) {
  const style = { "--size": `${size}px` };
  const [first] = graphemes.segment(name.trim());
  return src ? (
    <img
      ref={revealOnLoad}
      className="photo-sticker reveal-img"
      src={src}
      alt=""
      draggable={false}
      style={style}
    />
  ) : (
    <span className="photo-sticker photo-sticker-letter" aria-hidden style={style}>
      {first?.segment.toUpperCase()}
    </span>
  );
}
