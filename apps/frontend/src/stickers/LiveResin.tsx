import { useLayoutEffect, useRef } from "react";
import { lightUp } from "./light";
import "./live-resin.css";

/**
 * Live resin over a sticker, shaped by the silhouette its container sets as `--m`: a lens, a
 * specular and a rim light, shaped by its highlight masks (`--mt`, `--mb`), and a sheen that sweeps.
 */
export function LiveResin() {
  const resin = useRef<HTMLSpanElement>(null);
  // Shown after the light last moved, it starts where the light is, like every resin already shown.
  useLayoutEffect(() => {
    if (resin.current) lightUp(resin.current);
  }, []);
  return (
    <span ref={resin} className="live-resin" aria-hidden="true">
      <i className="live-resin__lens">
        <b />
      </i>
      <i className="live-resin__spec">
        <b />
      </i>
      <i className="live-resin__rim">
        <b />
      </i>
      <i className="live-resin__sheen">
        <b />
      </i>
    </span>
  );
}
