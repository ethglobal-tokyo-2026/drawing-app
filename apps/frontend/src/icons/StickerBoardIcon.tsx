import { House } from "@phosphor-icons/react";

interface Props {
  size?: number;
  weight?: "bold" | "fill";
}

/** Your sticker board, on the My board tab and every "go to the board" action. */
export function StickerBoardIcon({ size = 20, weight = "bold" }: Props) {
  return <House size={size} weight={weight} aria-hidden focusable="false" />;
}
