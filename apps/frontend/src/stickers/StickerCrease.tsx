import { useLayoutEffect, useRef } from "react";
import { CREASE_LIGHT } from "./crease";
import { lightUp } from "./light";
import type { Crease } from "./StickerFigure";
import "./sticker-crease.css";

/**
 * A sticker's crease where it lies over other stickers' edges: an image of it lit from each side,
 * blended by where the one light is, so its lit and shaded sides follow the light without a new bake.
 */
export function StickerCrease({ crease }: { crease: Crease }) {
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
      {Object.entries(crease).map(([side, url]) => (
        <i key={side} data-side={side} style={{ "--crease": `url("${url}")` }} />
      ))}
    </span>
  );
}
