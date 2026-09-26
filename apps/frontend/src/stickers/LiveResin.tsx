import "./live-resin.css";

interface Props {
  /**
   * Whether the container sets the resin's highlight masks (`--mt`, `--mb`). Without them the
   * specular and the rim light would fill the sticker's box, so they're left out.
   */
  highlights: boolean;
}

/**
 * Live resin over a sticker, shaped by the silhouette its container sets as `--m`: a lens, a
 * specular, a rim light, and a sheen that sweeps.
 */
export function LiveResin({ highlights }: Props) {
  return (
    <span className="live-resin" aria-hidden="true">
      <i className="live-resin__lens">
        <b />
      </i>
      {highlights && (
        <>
          <i className="live-resin__spec">
            <b />
          </i>
          <i className="live-resin__rim">
            <b />
          </i>
        </>
      )}
      <i className="live-resin__sheen">
        <b />
      </i>
    </span>
  );
}
