import { nameInitial } from "./nameInitial";
import { revealOnLoad } from "./reveal";
import "./photo-sticker.css";

interface Props {
  /** The LINE picture. Without one, the name's first letter stands in. */
  src?: string;
  name: string;
  size: number;
}

/** A LINE picture stuck on like a purikura sticker: round, white-rimmed, tilted by the one hand. */
export function PhotoSticker({ src, name, size }: Props) {
  const style = { "--size": `${size}px` };
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
      {nameInitial(name)}
    </span>
  );
}
