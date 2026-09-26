import { CaretLeft, CaretRight, Gift, Heart } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import type { StickerDetail as StickerDetailResponse } from "@drawing-app/api/client";
import { useApiQuery } from "../api/useApiQuery";
import { toPerson, toSticker, type PersonView, type StickerView } from "../api/views";
import { errorReason } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatMonthDay, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { ArtistChip } from "../stickers/ArtistChip";
import { StickerFigure } from "../stickers/StickerFigure";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { handleOf, onItsWay, type BoardStickerView } from "./boardSticker";
import { useDetailLift } from "./detailLift";
import { swipeLock, swipeTo } from "./detailPaging";
import { TransferTrail } from "./TransferTrail";
import { toTrailRows } from "./trailRows";
import "./sticker-detail.css";

interface Props {
  /** The stickers it pages through, in order. */
  stickers: readonly BoardStickerView[];
  /** The sticker it opens at. */
  startId: string;
  /** Your stickers, or the ones you gave, which it only shows. */
  mode: "yours" | "given";
  onClose: () => void;
  /** Give, where LINE's picker can send the sticker; without it there's no key. */
  onGive?: (sticker: BoardStickerView) => void;
  /** Gratitude for a received sticker; without it the detail doesn't check whether any is owed. */
  onSendGratitude?: (gift: { id: string }, sticker: StickerView, giver: PersonView) => void;
  /** Where focus goes once it closes, when that isn't back to what opened it. */
  returnFocus?: () => HTMLElement | null;
  /** Where a sticker sits on the board, which it lifts off from and sticks back onto. */
  originOf?: (id: string) => HTMLElement | null;
  /**
   * The board's owner, who's looking: a sticker someone else drew wears foil and names its Original
   * Artist, and the Transfer Trail reads the owner as "you".
   */
  ownerId?: string;
}

interface Swipe {
  pointerId: number;
  x: number;
  y: number;
  dx: number;
  lock: ReturnType<typeof swipeLock>;
}

/**
 * The sticker's .eth name, as the prototype shapes it: `{name}.{artist}.sketch.eth`. A stand-in
 * built from its number and artist until the chain gives stickers their names.
 */
function placeholderEnsName(sticker: BoardStickerView): string {
  const label = (v: string) =>
    v
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "someone";
  const artist = label(sticker.artist.handle ?? sticker.artist.name);
  return `sticker-${String(sticker.no).padStart(4, "0")}.${artist}.sketch.eth`;
}

/** The --ease-out curve, spelled out: Web Animations can't read CSS variables. */
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** The gift you owe gratitude for: the sticker's newest gift to you, while that has no gratitude. */
function owedGratitude({ sticker, owner, transferTrail }: StickerDetailResponse) {
  const toYou = transferTrail.find((entry) => entry.receiver.id === owner.id);
  return toYou && toYou.gratitude === null
    ? { gift: { id: toYou.giftId }, sticker: toSticker(sticker), giver: toPerson(toYou.giver) }
    : null;
}

/**
 * One sticker large on the liner, a strip of the rest down the left edge, its fine print and Give.
 * Swipes on the sticker, the strip, the pager and the arrow keys page between them.
 */
export function StickerDetail({
  stickers,
  startId,
  mode,
  onClose,
  onGive,
  onSendGratitude,
  returnFocus,
  originOf,
  ownerId,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  useLight();
  const [shownId, setShownId] = useState(startId);
  const index = Math.max(
    0,
    stickers.findIndex((s) => s.id === shownId),
  );
  const sticker: BoardStickerView | undefined = stickers[index];
  const last = stickers.length - 1;
  // Its Transfer Trail, and whether you owe gratitude for a sticker you hold, come with its detail.
  const shownStickerId = sticker?.id ?? null;
  const detail = useApiQuery(`sticker-detail:${shownStickerId ?? "none"}`, (api) =>
    shownStickerId ? api.stickerDetail(shownStickerId) : Promise.resolve(null),
  );
  const loaded = detail.state === "ready" ? detail.data : null;
  const trail = useMemo(() => (loaded ? toTrailRows(loaded.transferTrail) : []), [loaded]);
  const owed =
    mode === "yours" && onSendGratitude && sticker && !onItsWay(sticker) && loaded
      ? owedGratitude(loaded)
      : null;

  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLElement>(null);
  const slide = useRef<HTMLDivElement>(null);
  const swipe = useRef<Swipe | null>(null);
  /** The side the next sticker enters from: 1 from the right, -1 from the left. */
  const enterFrom = useRef(0);

  const close = useDetailLift({
    root,
    sticker,
    originOf,
    // A sticker given away, or on its way, lifts out of its given sticker silhouette.
    given: sticker ? !sticker.held || sticker.openGift?.status === "sent" : mode === "given",
    reduced,
    onClose,
  });
  useBackToClose(true, close);
  useFocusTrap(root, { onEscape: close, returnFocus });

  // LINE's header shows the page title.
  const no = sticker?.no;
  useEffect(() => {
    if (no === undefined) return;
    const was = document.title;
    document.title = formatNo(no);
    return () => {
      document.title = was;
    };
  }, [no]);

  const go = (next: number) => {
    const target = stickers[next];
    if (!target || next === index) return;
    enterFrom.current = Math.sign(next - index);
    setShownId(target.id);
  };

  // The shown sticker's thumb scrolls to the strip's middle, and the sticker enters from its side.
  useLayoutEffect(() => {
    const nav = strip.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && current)
      nav.scrollTop = Math.max(
        0,
        current.offsetTop - nav.clientHeight / 2 + current.offsetHeight / 2,
      );

    const side = enterFrom.current;
    enterFrom.current = 0;
    if (!side || reduced) return;
    slide.current?.animate(
      [
        { transform: `translateX(${side * 60}px) rotate(${side * 2}deg)`, opacity: 0 },
        { transform: "none", opacity: 1 },
      ],
      { duration: 260, easing: EASE_OUT },
    );
  }, [shownId, reduced]);

  // A second finger doesn't restart a swipe. The same pointer pressing again means its last press
  // was let go off the stage, where a mouse isn't captured, so that one is over.
  const startSwipe = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button > 0 || (swipe.current && swipe.current.pointerId !== e.pointerId)) return;
    swipe.current = { pointerId: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, lock: null };
  };

  const followSwipe = (e: PointerEvent<HTMLDivElement>) => {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const dx = e.clientX - s.x;
    if (!s.lock) {
      s.lock = swipeLock({ dx, dy: e.clientY - s.y });
      if (s.lock === "swipe") e.currentTarget.setPointerCapture(e.pointerId);
    }
    if (s.lock !== "swipe") return;
    s.dx = dx;
    if (!reduced && slide.current)
      slide.current.style.transform = `translateX(${dx * 0.7}px) rotate(${dx * 0.02}deg)`;
  };

  // A cancelled swipe springs back rather than paging: the browser or the system took the touch.
  const endSwipe = (e: PointerEvent<HTMLDivElement>, pages: boolean) => {
    const s = swipe.current;
    if (!s || e.pointerId !== s.pointerId) return;
    swipe.current = null;
    const el = slide.current;
    if (s.lock !== "swipe" || !el) return;
    const followed = el.style.transform;
    el.style.transform = "";
    const next = pages ? swipeTo({ dx: s.dx, index, count: stickers.length }) : index;
    if (next !== index) go(next);
    else if (followed && !reduced)
      el.animate([{ transform: followed }, { transform: "none" }], {
        duration: 220,
        easing: EASE_OUT,
      });
  };

  const byOther = Boolean(ownerId && sticker && sticker.artist.id !== ownerId);
  const page = (
    <div
      ref={root}
      className="sticker-detail"
      role="dialog"
      aria-modal="true"
      aria-label={sticker ? formatNo(sticker.no) : t(($) => $.stickerBoard.detail.label)}
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.altKey || e.ctrlKey || e.metaKey) return;
        if (e.key === "ArrowRight") go(index + 1);
        else if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      <header className="sticker-detail__top">
        <button type="button" className="sticker-detail__back" onClick={close}>
          <StickerBoardIcon size={18} />
          <span>{t(($) => $.stickerBoard.detail.back)}</span>
        </button>
      </header>

      <nav
        ref={strip}
        className="sticker-detail__strip"
        aria-label={
          mode === "given"
            ? t(($) => $.stickerBoard.detail.stickersYouGave)
            : t(($) => $.stickerBoard.detail.yourStickers)
        }
      >
        {stickers.map((s, i) => (
          <button
            key={s.id}
            type="button"
            className="sticker-detail__thumb"
            aria-label={formatNo(s.no)}
            aria-current={i === index ? "true" : undefined}
            onClick={() => go(i)}
          >
            <img src={s.urls.png} alt="" draggable={false} />
          </button>
        ))}
      </nav>

      <div className="sticker-detail__main">
        {sticker ? (
          <>
            <div
              className="sticker-detail__stage"
              onPointerDown={startSwipe}
              onPointerMove={followSwipe}
              onPointerUp={(e) => endSwipe(e, true)}
              onPointerCancel={(e) => endSwipe(e, false)}
            >
              <div ref={slide} className="sticker-detail__slide">
                <StickerFigure
                  key={sticker.id}
                  urls={sticker.urls}
                  width={sticker.width}
                  height={sticker.height}
                  foil={byOther ? "detail" : undefined}
                  no={sticker.no}
                />
              </div>
            </div>

            {/* aria-disabled rather than disabled, so a key press at either end keeps its focus. */}
            <div className="sticker-detail__pager">
              <button
                type="button"
                aria-label={t(($) => $.stickerBoard.detail.previous)}
                aria-disabled={index === 0}
                onClick={() => go(index - 1)}
              >
                <CaretLeft size={20} aria-hidden />
              </button>
              {/* Paging announces which sticker it landed on, not only where in the list. */}
              <span className="sticker-detail__count" aria-live="polite">
                <span aria-hidden="true">
                  {t(($) => $.stickerBoard.detail.count, {
                    position: index + 1,
                    setSize: stickers.length,
                  })}
                </span>
                <span className="visually-hidden">
                  {t(($) => $.stickerBoard.detail.countSpoken, {
                    no: formatNo(sticker.no),
                    position: index + 1,
                    setSize: stickers.length,
                  })}
                </span>
              </span>
              <button
                type="button"
                aria-label={t(($) => $.stickerBoard.detail.next)}
                aria-disabled={index === last}
                onClick={() => go(index + 1)}
              >
                <CaretRight size={20} aria-hidden />
              </button>
            </div>

            <section className="sticker-detail__meta">
              <h2 className="title-label sticker-detail__title">
                <Trans
                  i18nKey={($) => $.stickerBoard.detail.title}
                  components={{
                    no: <span className="sticker-detail__no">{formatNo(sticker.no)}</span>,
                  }}
                />
              </h2>
              <p className="sticker-detail__ens">{placeholderEnsName(sticker)}</p>
              <p className="fine sticker-detail__fine-print">
                {byOther ? (
                  <ArtistChip artist={sticker.artist} />
                ) : (
                  <span className="sticker-detail__by">
                    {t(($) => $.stickerBoard.detail.by, { artist: handleOf(sticker.artist) })}
                  </span>
                )}{" "}
                <span>
                  <Trans
                    i18nKey={($) => $.stickerBoard.detail.drawnIn}
                    components={{ duration: <Duration seconds={sticker.timeUsed} /> }}
                  />
                </span>{" "}
                <span>
                  {t(($) => $.stickerBoard.detail.sealedOn, { day: formatDay(sticker.createdAt) })}
                </span>
              </p>
              {/* The Transfer Trail says it too, once it's in. */}
              {mode === "given" && sticker.givenTo && trail.length === 0 && (
                <p className="fine sticker-detail__fine-print">
                  {t(($) => $.stickerBoard.detail.youGaveIt, {
                    receiver: handleOf(sticker.givenTo.receiver),
                    day: formatMonthDay(sticker.givenTo.receivedAt),
                  })}
                </p>
              )}
            </section>

            {mode === "yours" &&
              (onItsWay(sticker) ? (
                <div className="sticker-detail__acts">
                  {/* Sent, it waits for its friend: nothing to give until it comes back. */}
                  <p className="sticker-detail__on-its-way">
                    <span className="sticker-detail__sleeve" aria-hidden="true">
                      <img src={sticker.urls.png} alt="" draggable={false} />
                    </span>
                    <span>
                      {sticker.openGift?.to
                        ? t(($) => $.stickerBoard.detail.onItsWayTo, {
                            receiver: formatHandle(sticker.openGift.to),
                          })
                        : t(($) => $.stickerBoard.detail.onItsWay)}
                    </span>
                  </p>
                </div>
              ) : owed && onSendGratitude ? (
                // Gratitude comes first; Give stays within reach as label stock.
                <div className="sticker-detail__acts sticker-detail__acts--stack">
                  <Key
                    tone="pink"
                    icon={<Heart weight="fill" aria-hidden />}
                    onClick={() => onSendGratitude(owed.gift, owed.sticker, owed.giver)}
                  >
                    {t(($) => $.stickerBoard.detail.sendGratitude)}
                  </Key>
                  {onGive && (
                    <LabelButton
                      size="sm"
                      icon={<Gift size={18} aria-hidden />}
                      onClick={() => onGive(sticker)}
                    >
                      {t(($) => $.stickerBoard.detail.give)}
                    </LabelButton>
                  )}
                </div>
              ) : (
                onGive && (
                  <div className="sticker-detail__acts">
                    <Key tone="aqua" icon={<Gift aria-hidden />} onClick={() => onGive(sticker)}>
                      {t(($) => $.stickerBoard.detail.give)}
                    </Key>
                  </div>
                )
              ))}
            {detail.state === "failed" && (
              <p className="fine sticker-detail__check-failed" role="alert">
                {t(($) => $.stickerBoard.detail.checkFailed, {
                  reason: errorReason(detail.error),
                })}{" "}
                <QuietLink onClick={detail.retry}>{t(($) => $.stickerBoard.tryAgain)}</QuietLink>
              </p>
            )}
            {trail.length > 0 && ownerId && (
              // Mounted once its rows are in, so the open row is picked from them.
              <TransferTrail
                key={sticker.id}
                rows={trail}
                viewerId={ownerId}
                artist={sticker.artist}
              />
            )}
          </>
        ) : (
          <p className="sticker-detail__none">{t(($) => $.stickerBoard.detail.none)}</p>
        )}
      </div>
    </div>
  );
  // Over the whole phone, tabs included, as the Giving flow is.
  const phone = document.querySelector<HTMLElement>(".phone");
  return phone ? createPortal(page, phone) : page;
}
