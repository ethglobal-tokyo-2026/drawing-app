import type { Person, Sticker } from "@drawing-app/api/client";
import { useMyNsfwOptIn, veiledFor } from "../stickers/nsfw";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMe } from "../api/meContext";
import { toPerson, toSticker } from "../api/views";
import { Trans, useTranslation } from "../i18n/react";
import { CaretLeft, CaretRight, StickerBoardIcon } from "../icons";
import { useDetailLift, type LiftOrigin, type LiftView } from "../sticker-board/detailLift";
import { useSwipePaging } from "../sticker-board/detailPaging";
import { ArtistChip } from "../stickers/ArtistChip";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { StickerFigure } from "../stickers/StickerFigure";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { EASE_OUT, EASE_PEEL, clamp } from "../ui/easing";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import "../ui/sheet.css";
import "./lifted-sticker.css";

interface Props {
  /**
   * The pile's stickers in the order paging takes them, newest first, each with who it was given to
   * if anyone. At least one.
   */
  stickers: readonly { sticker: Sticker; givenTo?: Person | null }[];
  /** The one lifted. */
  index: number;
  /** Paging lifts another. */
  onIndexChange: (index: number) => void;
  /** Called once it's back on the pile. */
  onClose: () => void;
  /** Opens the artist's sticker board; the pile unmounts the sheet as it does. */
  onGoToBoard: (artist: Person) => void;
  /**
   * Where a sticker sits in the pile, laid out at its size before its turn: what it lifts off and
   * sticks back onto, and its turn there. Focus goes back to the button holding it. Without one, the
   * sheet rises and falls with the sticker in it.
   */
  originOf?: (id: string) => LiftOrigin | null;
}

/**
 * The scrim comes up and the sheet rises under the sticker as it flies in, both landing with it, then
 * the artist, fine print and ways out rise in.
 */
function enterSheet(view: HTMLElement): Animation[] {
  const fill = "both";
  const animations: Animation[] = [];
  const scrim = view.querySelector(".lifted-sticker__scrim");
  const sheet = view.querySelector(".lifted-sticker__sheet");
  if (scrim)
    animations.push(
      scrim.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 240, easing: EASE_OUT, fill }),
    );
  if (sheet)
    animations.push(
      sheet.animate([{ transform: "translateY(104%)" }, { transform: "none" }], {
        duration: 280,
        easing: EASE_PEEL,
        fill,
      }),
    );
  for (const part of view.querySelectorAll(".lifted-sticker__rise"))
    animations.push(
      part.animate(
        [
          { transform: "translateY(8px)", opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration: 160, delay: 120, easing: EASE_OUT, fill },
      ),
    );
  return animations;
}

/** The pile stays in sight behind the scrim, so the sticker's spot keeps a faint ghost of it. */
const SHEET: LiftView = {
  figureOf: (view) => view.querySelector<HTMLElement>(".lifted-sticker__slide .sticker-figure"),
  enter: enterSheet,
  ghost: 0.18,
};

/** Who drew it, or who was given it: the handle, or the LINE name until there's one. */
const nameOf = (person: Person) =>
  person.handle === null ? toPerson(person).name : formatHandle(person.handle);

/**
 * A sticker lifted off Explore's pile into a sheet: large, with live resin under the one light, its
 * artist, its fine print and the way to their sticker board. A sideways swipe, the arrows or the arrow
 * keys lift the next or previous one; Put back, the scrim, the perforation, Escape and LINE's Back
 * fly it back onto its spot.
 */
export function LiftedSticker({
  stickers,
  index,
  onIndexChange,
  onClose,
  onGoToBoard,
  originOf,
}: Props) {
  const { t } = useTranslation();
  const me = useMe();
  const reduced = useReducedMotion();
  const optedIn = useMyNsfwOptIn();
  useLight();
  const root = useRef<HTMLDivElement>(null);
  const count = stickers.length;
  const shown = clamp(index, 0, count - 1);
  const entry = stickers[shown];

  const close = useDetailLift({
    root,
    shownId: entry?.sticker.id,
    originOf: (id) => originOf?.(id) ?? null,
    into: SHEET,
    reduced,
    onClose,
  });
  useBackToClose(true, close);
  useFocusTrap(root, {
    onEscape: close,
    // Back to the sticker it lands on, which paging may have changed.
    returnFocus: () =>
      (entry && originOf?.(entry.sticker.id)?.el.closest<HTMLElement>("button")) ?? null,
  });
  const { slide, page, stage } = useSwipePaging({
    index: shown,
    count,
    reduced,
    onPage: onIndexChange,
  });
  // Resolved once, so the sheet never moves between the page and the phone, which would remount it.
  const [phone] = useState(() => document.querySelector<HTMLElement>(".phone"));
  if (!entry) return null;

  const sticker = toSticker(entry.sticker);
  const artist = entry.sticker.artist;
  const no = formatNo(sticker.no);
  const label = t(($) => $.explore.lifted.label, { no, artist: nameOf(artist) });
  const caption = { no, day: formatDay(sticker.sealedAt) };
  const duration = <Duration seconds={sticker.timeUsed} />;

  const sheet = (
    <div
      ref={root}
      className="lifted-sticker"
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "ArrowRight") page(shown + 1);
        else if (e.key === "ArrowLeft") page(shown - 1);
      }}
    >
      <div className="lifted-sticker__scrim" aria-hidden="true" onClick={close} />
      <div className="lifted-sticker__sheet">
        <button
          type="button"
          className="perf"
          aria-label={t(($) => $.ui.sheet.close, { label })}
          onClick={close}
        />
        <div className="lifted-sticker__stage" {...stage}>
          <div ref={slide} className="lifted-sticker__slide">
            <StickerFigure
              key={sticker.id}
              urls={sticker.urls}
              width={sticker.width}
              height={sticker.height}
              nsfw={sticker.nsfw}
              veiled={veiledFor(sticker, optedIn)}
              no={sticker.no}
            />
          </div>
          {/* aria-disabled rather than disabled, so a press at either end keeps its focus. */}
          {count > 1 && (
            <>
              <button
                type="button"
                className="lifted-sticker__turn lifted-sticker__turn--previous"
                aria-label={t(($) => $.explore.lifted.previous)}
                aria-disabled={shown === 0}
                onClick={() => page(shown - 1)}
              >
                <CaretLeft size={20} weight="bold" aria-hidden />
              </button>
              <button
                type="button"
                className="lifted-sticker__turn lifted-sticker__turn--next"
                aria-label={t(($) => $.explore.lifted.next)}
                aria-disabled={shown === count - 1}
                onClick={() => page(shown + 1)}
              >
                <CaretRight size={20} weight="bold" aria-hidden />
              </button>
            </>
          )}
        </div>
        {/* Paging says which sticker it landed on. */}
        <p className="visually-hidden" aria-live="polite">
          {t(($) => $.explore.lifted.shown, {
            no,
            artist: nameOf(artist),
            position: shown + 1,
            setSize: count,
          })}
        </p>

        <div className="lifted-sticker__about lifted-sticker__rise">
          <ArtistChip artist={toPerson(artist)} plain />
          <p className="fine lifted-sticker__fine keep-phrases">
            {entry.givenTo ? (
              <Trans
                i18nKey={($) => $.explore.lifted.captionGiven}
                values={caption}
                components={{
                  duration,
                  receiver: <span className="handle">{nameOf(entry.givenTo)}</span>,
                }}
              />
            ) : (
              <Trans
                i18nKey={($) => $.explore.lifted.caption}
                values={caption}
                components={{ duration }}
              />
            )}
          </p>
        </div>

        <div className="lifted-sticker__acts lifted-sticker__rise">
          <LabelButton icon={<StickerBoardIcon size={18} />} onClick={() => onGoToBoard(artist)}>
            {artist.id === me.id
              ? t(($) => $.ui.backToBoard)
              : t(($) => $.explore.lifted.goToBoard, { artist: nameOf(artist) })}
          </LabelButton>
          <QuietLink onClick={close}>{t(($) => $.explore.lifted.putBack)}</QuietLink>
        </div>
      </div>
    </div>
  );
  // Over the whole phone, tabs included, as the board's sticker detail is.
  return phone ? createPortal(sheet, phone) : sheet;
}
