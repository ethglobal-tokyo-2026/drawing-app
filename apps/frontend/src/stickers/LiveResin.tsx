import { useLayoutEffect, useRef } from "react";
import { lightUp } from "./light";
import "./live-resin.css";

/**
 * Live resin over a sticker, shaped by the silhouette its container sets as `--m`: a thin laminate's
 * slim specular along the edges facing the light, a reflection shifted by its height over other
 * stickers, and a sheen that sweeps.
 */
export function LiveResin({ height }: { height?: string }) {
  const resin = useRef<HTMLSpanElement>(null);
  // Shown after the light last moved, it starts where the light is, like every resin already shown.
  useLayoutEffect(() => {
    if (resin.current) lightUp(resin.current);
  }, [height]);
  return (
    <span
      ref={resin}
      className={`live-resin${height ? " live-resin--raised" : ""}`}
      style={height ? { "--height": `url("${height}")` } : undefined}
      aria-hidden="true"
    >
      <i className="live-resin__plane">
        <b />
      </i>
      {height && (
        <i className="live-resin__height">
          <b />
        </i>
      )}
      <i className="live-resin__spec">
        <b />
      </i>
      <i className="live-resin__sheen">
        <b />
      </i>
    </span>
  );
}
