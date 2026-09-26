import { ArrowRight } from "@phosphor-icons/react";
import { useLayoutEffect, useRef } from "react";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import type { BoardSticker } from "./boardSticker";
import { keepOnBoard, stickerBox, type Field } from "./placement";

interface Props {
  sticker: BoardSticker;
  /** Its silhouette. */
  mask: string;
  sentAt: number;
  /** The artist it was given to in the app; without one it went through LINE's picker. */
  to?: string;
  field: Field;
  boardWidth: number;
  /** Opens the sticker's detail, among the stickers you gave. */
  onOpen: () => void;
}

/**
 * Where a given sticker sat: its silhouette, hatched, captioned with where it went. LINE's picker
 * never says who was picked, so without an in-app recipient it went to "a friend".
 */
export function GivenStickerSilhouette({
  sticker,
  mask,
  sentAt,
  to,
  field,
  boardWidth,
  onOpen,
}: Props) {
  const recipient = to ? formatHandle(to) : "a friend";
  const caption = useRef<HTMLSpanElement>(null);
  const box = stickerBox(field, boardWidth, sticker.placement, sticker);

  // A silhouette near the board's edge keeps its whole caption on the board.
  useLayoutEffect(() => {
    const el = caption.current;
    if (!el) return;
    const nudge = keepOnBoard(box.x, el.offsetWidth / 2, boardWidth);
    el.style.setProperty("--nudge", `${nudge.toFixed(1)}px`);
  }, [box.x, boardWidth, sticker.no, recipient]);

  return (
    <button
      type="button"
      className="given-sticker-silhouette"
      data-sticker-id={sticker.id}
      aria-label={`${formatNo(sticker.no)}, given to ${recipient} on ${formatDay(sentAt)}. Open it`}
      onClick={onOpen}
      style={{
        width: box.w,
        height: box.h,
        transform: box.transform,
        "--m": `url("${mask}")`,
        "--r": `${sticker.placement.r}deg`,
      }}
    >
      <span className="given-sticker-silhouette__art" aria-hidden="true" />
      <span ref={caption} className="fine given-sticker-silhouette__caption" aria-hidden="true">
        {formatNo(sticker.no)}
        <ArrowRight size={12} />
        {recipient}
      </span>
    </button>
  );
}
