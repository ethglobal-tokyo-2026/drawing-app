import "./sticker-foil.css";

/** Where a foil sticker shows, which sets how wide its band is. */
export type FoilSize = "board" | "detail" | "sheet";

interface Props {
  size: FoilSize;
  /** The sticker's No., which staggers its bands' flow so neighbors never shimmer in step. */
  no: number;
}

/**
 * Holo foil round a sticker someone other than the board's owner drew: its silhouette, which the
 * container sets as `--m`, dilated into a band just past the white edge, with bands of light
 * flowing along it and a glint that sweeps across when the phone tilts. It goes under the image.
 */
export function StickerFoil({ size, no }: Props) {
  return (
    <span
      className={`sticker-foil sticker-foil--${size}`}
      style={{ "--foil-i": no }}
      aria-hidden="true"
    >
      <span className="sticker-foil__band">
        <i className="sticker-foil__sheen" />
        <i className="sticker-foil__glint" />
      </span>
    </span>
  );
}
