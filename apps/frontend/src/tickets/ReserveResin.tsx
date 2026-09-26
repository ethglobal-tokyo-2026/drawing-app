import { StarFour } from "@phosphor-icons/react";
import { useId } from "react";
import "./ReserveResin.css";

/**
 * The stickers' resin, baked onto a reserve ticket's face: a highlight from the one top-left light over the top
 * third, a rim of light just inside the top edge, and the print pooling darker at the foot. It's baked, so it reads
 * at every size, with or without the live light. Draw it over the paper and under the edge and the print, in the
 * face's own `w` × `h` units, with `shape` the ticket's silhouette and `edge` its Ink outline's width.
 */
export function ResinCoat({
  shape,
  w,
  h,
  edge,
}: {
  shape: string;
  w: number;
  h: number;
  edge: number;
}) {
  const id = useId();
  // The rim is 1px on small tickets and 1.6px on the largest.
  const rim = Math.min(1.6, Math.max(1, h / 56));
  return (
    <g className="resin-coat">
      <defs>
        <clipPath id={`${id}-clip`}>
          <path d={shape} />
        </clipPath>
        <linearGradient id={`${id}-light`} x1="0" y1="0" x2="0.28" y2="1">
          <stop offset="0" className="resin-coat__light" stopOpacity="0.62" />
          <stop offset="0.34" className="resin-coat__light" stopOpacity="0.12" />
          <stop offset="0.37" className="resin-coat__light" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${id}-pool`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0.8" className="resin-coat__pool" stopOpacity="0" />
          <stop offset="1" className="resin-coat__pool" stopOpacity="0.45" />
        </linearGradient>
        {/* The rim catches the light along the top edge, brightest toward the top-left, and is gone by the notches. */}
        <linearGradient id={`${id}-reach`} x1="0" y1="0" x2="0.35" y2="1">
          <stop offset="0" stopColor="#fff" />
          <stop offset="0.4" stopColor="#000" />
        </linearGradient>
        <mask id={`${id}-rim`}>
          <rect width={w} height={h} fill={`url(#${id}-reach)`} />
        </mask>
      </defs>
      <g clipPath={`url(#${id}-clip)`}>
        <rect width={w} height={h} fill={`url(#${id}-pool)`} />
        <rect width={w} height={h} fill={`url(#${id}-light)`} />
        {/* The silhouette's own line, dropped to just under the Ink edge: `rim` of it shows inside. */}
        <g mask={`url(#${id}-rim)`}>
          <path
            className="resin-coat__rim"
            d={shape}
            strokeWidth={rim * 2}
            transform={`translate(0 ${edge / 2})`}
          />
        </g>
      </g>
    </g>
  );
}

/**
 * The reserve ticket's star: Phosphor's four-point star (fill), white with an Ink edge, stuck over the face at
 * (`x`, `y`), its center. With `pop` it pops in once, on the peel curve, as the ticket first shows; it never loops.
 */
export function ReserveStar({
  x,
  y,
  size,
  pop = false,
}: {
  x: number;
  y: number;
  size: number;
  pop?: boolean;
}) {
  return (
    <g className="reserve-star" transform={`translate(${x} ${y})`}>
      <g className={`reserve-star__body${pop ? " is-popping" : ""}`}>
        <StarFour
          weight="fill"
          size={size}
          x={-size / 2}
          y={-size / 2}
          aria-hidden
          focusable="false"
        />
      </g>
    </g>
  );
}
