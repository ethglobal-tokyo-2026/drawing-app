import { useLayoutEffect, useRef } from "react";
import { CREASE_LIGHT } from "./crease";
import { lightUp } from "./light";
import type { Crease } from "./StickerFigure";
import "./sticker-crease.css";

const cssUrl = (url: string) => ({ "--crease": `url("${url}")` });

/**
 * A sticker's crease where it lies over other stickers' edges: its base, the shoulder and foot that show
 * under any light, and over it an image of its rise lit from each side, blended by where the one light
 * is, so its lit and shaded sides follow the light without a new bake.
 */
export function StickerCrease({ crease: { base, ...sides } }: { crease: Crease }) {
  const el = useRef<HTMLSpanElement>(null);
  // Shown after the light last moved, it starts where the light is, like every crease already shown.
  useLayoutEffect(() => {
    if (el.current) lightUp(el.current);
  }, []);
  return (
    <span
      ref={el}
      className="sticker-crease"
      style={{ "--crease-ux": CREASE_LIGHT[0], "--crease-uy": CREASE_LIGHT[1] }}
      aria-hidden="true"
    >
      <i style={cssUrl(base)} />
      {Object.entries(sides).map(([side, url]) => (
        <i key={side} data-side={side} style={cssUrl(url)} />
      ))}
    </span>
  );
}
