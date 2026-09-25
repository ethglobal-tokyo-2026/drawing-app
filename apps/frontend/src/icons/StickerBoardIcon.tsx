import square from "@phosphor-icons/core/bold/square-bold.svg?raw";
import sticker from "@phosphor-icons/core/bold/sticker-bold.svg?raw";
import { useId } from "react";
import type { IconProps } from "./IconSvg";
import { parseSvg } from "./parseSvg";

/** The sticker board: Phosphor's sticker at 64%, turned -12° and clipped inside Phosphor's square. */
export function StickerBoardIcon({ size = 22 }: IconProps) {
  const clip = useId();
  return (
    <svg viewBox="0 0 256 256" width={size} height={size} fill="currentColor" aria-hidden>
      <defs>
        <clipPath id={clip}>
          <rect x="52" y="52" width="152" height="152" />
        </clipPath>
      </defs>
      <g dangerouslySetInnerHTML={{ __html: parseSvg(square).body }} />
      <g clipPath={`url(#${clip})`}>
        <g
          transform="rotate(-12 128 128) translate(128 128) scale(0.64) translate(-128 -128)"
          dangerouslySetInnerHTML={{ __html: parseSvg(sticker).body }}
        />
      </g>
    </svg>
  );
}
