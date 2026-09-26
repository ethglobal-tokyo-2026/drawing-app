import { useId } from "react";

// Phosphor "square" with Phosphor "sticker" set at 64%, turned -12° over its top-right corner: two
// published paths (MIT, @phosphor-icons/core 2.1.1) placed by transform, unedited, with a mask of the
// sticker's own path cutting the gap between them. Bold and fill only.
const STICKER_MASK =
  "M168,32H88A56.06,56.06,0,0,0,32,88v80a56.06,56.06,0,0,0,56,56h48a8.07,8.07,0,0,0,2.53-.41c26.23-8.75,76.31-58.83,85.06-85.06A8.07,8.07,0,0,0,224,136V88A56.06,56.06,0,0,0,168,32ZM136,207.42V176a40,40,0,0,1,40-40h31.42C198.16,157.55,157.55,198.16,136,207.42Z";
const SQUARE =
  "M208,28H48A20,20,0,0,0,28,48V208a20,20,0,0,0,20,20H208a20,20,0,0,0,20-20V48A20,20,0,0,0,208,28Zm-4,176H52V52H204Z";
const STICKER = {
  bold: "M168,28H88A60.07,60.07,0,0,0,28,88v80a60.07,60.07,0,0,0,60,60h48a11.9,11.9,0,0,0,3.79-.62c27.63-9.21,78.38-60,87.59-87.59A11.9,11.9,0,0,0,228,136V88A60.07,60.07,0,0,0,168,28ZM52,168V88A36,36,0,0,1,88,52h80a36,36,0,0,1,36,36v36H184a60.07,60.07,0,0,0-60,60v20H88A36,36,0,0,1,52,168Zm96,27.63V184a36,36,0,0,1,36-36h11.63C184,164.11,164.11,184,148,195.63Z",
  fill: "M168,32H88A56.06,56.06,0,0,0,32,88v80a56.06,56.06,0,0,0,56,56h48a8.07,8.07,0,0,0,2.53-.41c26.23-8.75,76.31-58.83,85.06-85.06A8.07,8.07,0,0,0,224,136V88A56.06,56.06,0,0,0,168,32ZM136,207.42V176a40,40,0,0,1,40-40h31.42C198.16,157.55,157.55,198.16,136,207.42Z",
};
const PLACE_STICKER = "translate(160 98) rotate(-12) scale(.64) translate(-128 -128)";

interface Props {
  size?: number;
  weight?: "bold" | "fill";
}

export function StickerBoardIcon({ size = 20, weight = "bold" }: Props) {
  // Each copy on the page needs its own mask id.
  const maskId = useId();
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      fill="currentColor"
      width={size}
      height={size}
      aria-hidden
      focusable="false"
    >
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="256" height="256">
          <rect width="256" height="256" fill="#fff" />
          <g transform={PLACE_STICKER}>
            <path
              d={STICKER_MASK}
              fill="#000"
              stroke="#000"
              strokeWidth="44"
              strokeLinejoin="round"
            />
          </g>
        </mask>
      </defs>
      <g mask={`url(#${maskId})`}>
        <path d={SQUARE} />
      </g>
      <g transform={PLACE_STICKER}>
        <path d={STICKER[weight]} />
      </g>
    </svg>
  );
}
