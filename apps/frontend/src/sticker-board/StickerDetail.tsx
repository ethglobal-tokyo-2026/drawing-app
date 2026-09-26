import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StickerDetail as StickerDetailResponse } from "@drawing-app/api/client";
import { useApiQuery } from "../api/useApiQuery";
import { toPerson, toSticker, type PersonView, type StickerView } from "../api/views";
import { errorReason } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { EnsNameLink } from "../identity/EnsNameLink";
import { CaretLeft, CaretRight, GiveIcon, GratitudeIcon, StickerBoardIcon } from "../icons";
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
import { useDetailLift, type LiftView } from "./detailLift";
import { useSwipePaging } from "./detailPaging";
import { TimelapseButton, TimelapseFailure } from "./timelapse/TimelapseButton";
import { TimelapseLayer } from "./timelapse/TimelapseLayer";
import { useTimelapse } from "./timelapse/useTimelapse";
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

/** The --ease-out curve, spelled out: Web Animations can't read CSS variables. */
const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";

/** The ground fades in, the strip slides in from the left, then the fine print and Give rise. */
function enterAround(detail: HTMLElement): Animation[] {
  const fill = "both";
  const animations = [
    detail.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 180, easing: EASE_OUT, fill }),
  ];
  const enter = (part: Element, from: string, duration: number, delay: number) =>
    animations.push(
      part.animate(
        [
          { transform: from, opacity: 0 },
          { transform: "none", opacity: 1 },
        ],
        { duration, delay, easing: EASE_OUT, fill },
      ),
    );
  const strip = detail.querySelector(".sticker-detail__strip");
  if (strip) enter(strip, "translateX(-12px)", 200, 40);
  for (const part of detail.querySelectorAll(".sticker-detail__meta, .sticker-detail__acts"))
    enter(part, "translateY(8px)", 160, 120);
  return animations;
}

/** The detail covers the board, so a sticker's spot needs no ghost while it's lifted. */
const DETAIL: LiftView = {
  figureOf: (detail) => detail.querySelector<HTMLElement>(".sticker-detail__slide .sticker-figure"),
  enter: enterAround,
};

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
  const figure = useRef<HTMLSpanElement>(null);

  const lift = useDetailLift({
    root,
    shownId: sticker?.id,
    originOf: (id) => {
      const el = originOf?.(id);
      const s = stickers.find((x) => x.id === id);
      if (!el || !s) return null;
      // A sticker given away, or on its way, lifts out of its given sticker silhouette.
      return { el, turn: s.placement.r, given: !s.held || s.openGift?.status === "sent" };
    },
    into: DETAIL,
    reduced,
    onClose,
  });
  const hasTimelapse = loaded?.hasTimelapse === true;
  const timelapse = useTimelapse({ sticker, hasTimelapse, figure, reduced });
  // The timelapse's layer goes first: the lift clones the figure and flies it back to the board.
  const close = () => {
    timelapse.stop();
    lift();
  };
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

  const {
    slide,
    page: go,
    stage,
  } = useSwipePaging({
    index,
    count: stickers.length,
    reduced,
    onPage: (next) => {
      const target = stickers[next];
      if (target) setShownId(target.id);
    },
  });

  // The shown sticker's thumb scrolls to the strip's middle.
  useLayoutEffect(() => {
    const nav = strip.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && current)
      nav.scrollTop = Math.max(
        0,
        current.offsetTop - nav.clientHeight / 2 + current.offsetHeight / 2,
      );
  }, [shownId]);

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
            <div className="sticker-detail__stage" {...stage}>
              <div ref={slide} className="sticker-detail__slide">
                <StickerFigure
                  ref={figure}
                  key={sticker.id}
                  urls={sticker.urls}
                  width={sticker.width}
                  height={sticker.height}
                  foil={byOther ? "detail" : undefined}
                  nsfw={sticker.nsfw}
                  no={sticker.no}
                />
                <TimelapseLayer timelapse={timelapse} />
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
              {sticker.ensName && (
                <p className="sticker-detail__ens">
                  <EnsNameLink name={sticker.ensName} />
                </p>
              )}
              <p className="fine sticker-detail__fine-print">
                {byOther ? (
                  // The chip's handle keeps its own case in the fine print's capitals.
                  <span className="handle">
                    <ArtistChip artist={sticker.artist} />
                  </span>
                ) : (
                  <span className="sticker-detail__by">
                    <Trans
                      i18nKey={($) => $.stickerBoard.detail.by}
                      components={{
                        artist: <span className="handle">{handleOf(sticker.artist)}</span>,
                      }}
                    />
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
                <TimelapseButton timelapse={timelapse} />
              </p>
              {/* The Transfer Trail says it too, once it's in. */}
              {mode === "given" && sticker.givenTo && trail.length === 0 && (
                <p className="fine sticker-detail__fine-print">
                  <Trans
                    i18nKey={($) => $.stickerBoard.detail.youGaveIt}
                    values={{ day: formatMonthDay(sticker.givenTo.receivedAt) }}
                    components={{
                      receiver: (
                        <span className="handle">{handleOf(sticker.givenTo.receiver)}</span>
                      ),
                    }}
                  />
                </p>
              )}
            </section>
            <TimelapseFailure timelapse={timelapse} />

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
                    icon={<GratitudeIcon />}
                    onClick={() => onSendGratitude(owed.gift, owed.sticker, owed.giver)}
                  >
                    {t(($) => $.stickerBoard.detail.sendGratitude)}
                  </Key>
                  {onGive && (
                    <LabelButton
                      size="sm"
                      icon={<GiveIcon size={18} />}
                      onClick={() => onGive(sticker)}
                    >
                      {t(($) => $.stickerBoard.detail.give)}
                    </LabelButton>
                  )}
                </div>
              ) : (
                onGive && (
                  <div className="sticker-detail__acts">
                    <Key tone="aqua" icon={<GiveIcon />} onClick={() => onGive(sticker)}>
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
