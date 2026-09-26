import { ArrowRight } from "../icons";
import { useLayoutEffect, useRef } from "react";
import { useTranslation } from "../i18n/react";
import { formatHandle, formatMonthDay, formatNo } from "../stickers/format";
import { handleOf, type BoardSticker, type GivenTo } from "./boardSticker";
import { keepOnBoard, stickerBox, type Field } from "./placement";

/** Who has it now: its receiver, or, sent in the app, the artist it was sent to. */
type Where =
  | { givenTo: GivenTo }
  | {
      sentAt: number;
      /** The artist it was given to in the app; without one it went through LINE's picker. */
      to?: string;
    };

type Props = Where & {
  sticker: BoardSticker;
  /** Its silhouette. */
  mask: string;
  field: Field;
  boardWidth: number;
  /** Opens the sticker's detail, among the stickers you gave. */
  onOpen: () => void;
};

/**
 * Where a given sticker sat: its silhouette, hatched, captioned with where it went. LINE's picker
 * never says who was picked, so a sticker nobody has received yet went to "a friend".
 */
export function GivenStickerSilhouette({
  sticker,
  mask,
  field,
  boardWidth,
  onOpen,
  ...where
}: Props) {
  const { t } = useTranslation();
  const [recipient, day] =
    "givenTo" in where
      ? [handleOf(where.givenTo.receiver), where.givenTo.receivedAt]
      : [where.to ? formatHandle(where.to) : null, where.sentAt];
  const given = { no: formatNo(sticker.no), day: formatMonthDay(day) };
  const label = recipient
    ? t(($) => $.stickerBoard.givenStickerSilhouette.label, { ...given, recipient })
    : t(($) => $.stickerBoard.givenStickerSilhouette.labelToAFriend, given);
  const to = recipient ?? t(($) => $.stickerBoard.givenStickerSilhouette.aFriend);
  const caption = useRef<HTMLSpanElement>(null);
  const box = stickerBox(field, boardWidth, sticker.placement, sticker);

  // A silhouette near the board's edge keeps its whole caption on the board.
  useLayoutEffect(() => {
    const el = caption.current;
    if (!el) return;
    const nudge = keepOnBoard(box.x, el.offsetWidth / 2, boardWidth);
    el.style.setProperty("--nudge", `${nudge.toFixed(1)}px`);
  }, [box.x, boardWidth, sticker.no, to]);

  return (
    <button
      type="button"
      className="given-sticker-silhouette"
      data-sticker-id={sticker.id}
      aria-label={label}
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
        {/* A handle keeps its own case in the capitals; "a friend" takes them. */}
        {recipient ? <span className="handle">{recipient}</span> : to}
      </span>
    </button>
  );
}
