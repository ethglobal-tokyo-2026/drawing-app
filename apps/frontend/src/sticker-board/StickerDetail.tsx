import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { StickerDetail as StickerDetailResponse } from "@drawing-app/api/client";
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { useApiQuery } from "../api/useApiQuery";
import { toPerson, toSticker, type PersonView, type StickerView } from "../api/views";
import { isGratitudeWaiting, onGratitudeLeftOutbox } from "../gratitude/gratitudeOutbox";
import {
  forgetGratitudeRefusal,
  refusalError,
  useGratitudeRefusals,
  type GratitudeRefusal,
} from "../gratitude/gratitudeRefusals";
import { refusalNote } from "../gratitude/refusalNote";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { CaretLeft, CaretRight, GiveIcon, GratitudeIcon, StickerBoardIcon } from "../icons";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatMonthDay, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { KyotoSeikaTag } from "../kyoto-seika/KyotoSeikaTag";
import { ArtistChip } from "../stickers/ArtistChip";
import { useMyNsfwOptIn, veiledFor, withoutNsfwDrawings } from "../stickers/nsfw";
import { StickerFigure } from "../stickers/StickerFigure";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { handleOf, onItsWay, type BoardStickerView } from "./boardSticker";
import { useDetailLift, type LiftView } from "./detailLift";
import { useSwipePaging } from "./detailPaging";
import { forget as forgetKeptBoard } from "./lastBoard";
import { myStickerBoardChanged } from "./useMyStickerBoard";
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

/**
 * The gift you owe gratitude for: the sticker's newest gift to you, while that has no gratitude. A
 * combo still on its way to the server counts as sent: another would only be refused.
 */
function owedGratitude({ sticker, owner, transferTrail }: StickerDetailResponse) {
  const toYou = transferTrail.find((entry) => entry.receiver.id === owner.id);
  return toYou && toYou.gratitude === null && !isGratitudeWaiting(owner.id, toYou.giftId)
    ? { gift: { id: toYou.giftId }, sticker: toSticker(sticker), giver: toPerson(toYou.giver) }
    : null;
}

/** Marking a sticker 18+: its confirm up, the mark on its way, or why it didn't take. */
type Marking =
  | { stickerId: string; step: "asking" | "sending" }
  | { stickerId: string; step: "failed"; error: ApiError };

/** What a sticker marked 18+ here shows: its images for you now, and the mark. */
type MarkedView = Pick<StickerView, "urls" | "nsfw">;

/** The newest gift on the trail whose gratitude the server refused, and who gave it. */
function refusedGratitude(
  { transferTrail }: StickerDetailResponse,
  refusals: readonly GratitudeRefusal[],
) {
  for (const { giftId, giver } of transferTrail) {
    const refusal = refusals.find((r) => r.giftId === giftId);
    if (refusal) return { refusal, giver: toPerson(giver) };
  }
  return null;
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
  const api = useApi();
  const reduced = useReducedMotion();
  const optedIn = useMyNsfwOptIn();
  useLight();
  const [shownId, setShownId] = useState(startId);
  const index = Math.max(
    0,
    stickers.findIndex((s) => s.id === shownId),
  );
  // Each sticker marked 18+ here, as the server shows it to you, until the board's reload lists it marked.
  const [marked, setMarked] = useState<ReadonlyMap<string, MarkedView>>(() => new Map());
  const withMark = (s: BoardStickerView): BoardStickerView => {
    const answer = marked.get(s.id);
    return answer && !s.nsfw ? { ...s, urls: answer.urls, nsfw: answer.nsfw } : s;
  };
  const listed: BoardStickerView | undefined = stickers[index];
  const sticker = listed && withMark(listed);
  const last = stickers.length - 1;
  const [marking, setMarking] = useState<Marking | null>(null);
  // What the status line at the foot says about a mark that landed, under that sticker only.
  const [markedSaid, setMarkedSaid] = useState<{ stickerId: string; words: string } | null>(null);
  // Gratitude kept on this phone that the server has since recorded or refused: counted, whatever
  // the read of the detail is doing, so a read that went out before one left can be told apart.
  const [combosLeft, setCombosLeft] = useState(0);
  useEffect(() => onGratitudeLeftOutbox(() => setCombosLeft((n) => n + 1)), []);
  // Its Transfer Trail, and whether you owe gratitude for a sticker you hold, come with its detail.
  const shownStickerId = sticker?.id ?? null;
  const detail = useApiQuery(`sticker-detail:${shownStickerId ?? "none"}`, async (api) => {
    const combosLeftBefore = combosLeft;
    const stickerDetail = shownStickerId ? await api.stickerDetail(shownStickerId) : null;
    return { stickerDetail, combosLeftBefore };
  });
  const read = detail.state === "ready" ? detail.data : null;
  const loaded = read?.stickerDetail ?? null;
  const readAgain = detail.state === "ready" ? detail.refresh : null;
  // A read that went out before a combo left can't say whether gratitude is owed: Send gratitude
  // waits for the trail to be read again, and again if another combo leaves before that lands.
  const predatesCombo = read !== null && read.combosLeftBefore !== combosLeft;
  useEffect(() => {
    if (predatesCombo) readAgain?.();
  }, [read, predatesCombo, readAgain]);
  const trail = useMemo(() => (loaded ? toTrailRows(loaded.transferTrail) : []), [loaded]);
  const owed =
    mode === "yours" && onSendGratitude && sticker && !onItsWay(sticker) && loaded && !predatesCombo
      ? owedGratitude(loaded)
      : null;
  // Why the server refused gratitude this phone sent, which may have come once its receipt was gone.
  const youId = mode === "yours" ? (loaded?.owner.id ?? null) : null;
  const gratitudeRefusals = useGratitudeRefusals(youId);
  const refused = youId && loaded ? refusedGratitude(loaded, gratitudeRefusals) : null;

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
      // A given sticker fades in out of its spot in the sticker tray, which stays.
      return { el, turn: s.placement.r, given: !s.held || s.openGift?.status === "sent" };
    },
    into: DETAIL,
    reduced,
    onClose,
  });
  // A sticker veiled for you plays no timelapse, which shows its drawing: the server says so, and a
  // mark landing here says so at once.
  const hasTimelapse =
    loaded?.hasTimelapse === true && !(sticker !== undefined && veiledFor(sticker, optedIn));
  const kyotoSeika = Boolean(loaded?.sticker.kyotoSeikaSubjects);
  const timelapse = useTimelapse({ sticker, hasTimelapse, figure, reduced, kyotoSeika });
  // The timelapse's layer goes first: the lift clones the figure and flies it back to the board.
  const close = () => {
    timelapse.stop();
    lift();
  };

  // Mark 18+: only the Original Artist can, once. Its confirm opens on Cancel, so Enter alone never
  // marks, and closing it with nothing marked puts focus back on Mark 18+.
  const markId = useId();
  const markButton = useRef<HTMLButtonElement>(null);
  const cancelMark = useRef<HTMLButtonElement>(null);
  const canMark = Boolean(ownerId && sticker && sticker.artist.id === ownerId && !sticker.nsfw);
  const mark = marking && marking.stickerId === sticker?.id ? marking : null;
  const asking = mark !== null;
  const backToMark = useRef(false);
  useEffect(() => {
    if (asking) cancelMark.current?.focus({ preventScroll: true });
    else if (backToMark.current) markButton.current?.focus({ preventScroll: true });
    backToMark.current = false;
  }, [asking]);
  const stopAsking = () => {
    backToMark.current = true;
    setMarking(null);
  };
  // Only the mark that's still this sticker's: another may have been asked for since.
  const settleMark = (stickerId: string, next: Marking | null) =>
    setMarking((m) => (m?.stickerId === stickerId ? next : m));
  /** A sticker the server already has marked, as it shows it to you; unread, marked as listed. */
  const readBackMarked = async (target: BoardStickerView): Promise<MarkedView> => {
    try {
      return toSticker((await api.stickerDetail(target.id)).sticker);
    } catch (error) {
      console.error(
        `Sticker ${target.id} is marked 18+, but couldn't be read back`,
        apiError(error),
      );
      // Without the opt-in, its drawing goes until the board's reload brings its veiled image.
      const listedMarked = { urls: target.urls, nsfw: true };
      return optedIn ? listedMarked : withoutNsfwDrawings([listedMarked])[0];
    }
  };
  const markNsfw = async (target: BoardStickerView) => {
    setMarking({ stickerId: target.id, step: "sending" });
    let answer: MarkedView;
    try {
      const { sticker: markedSticker, cdnPurged } = await api.markStickerNsfw(target.id);
      answer = toSticker(markedSticker);
      if (!cdnPurged)
        console.warn(`Sticker ${target.id} is marked 18+, but the CDN's copies weren't cleared`);
    } catch (error) {
      const failure = apiError(error);
      if (failure.code !== "already_nsfw") {
        console.error(`Sticker ${target.id} wasn't marked 18+`, failure);
        settleMark(target.id, { stickerId: target.id, step: "failed", error: failure });
        return;
      }
      // The mark is in: an earlier answer was lost on its way, or another window marked it first.
      console.warn(`Sticker ${target.id} was already marked 18+`, failure);
      answer = await readBackMarked(target);
    }
    // The board kept on this phone, and the board's answers, show it unmarked.
    forgetKeptBoard();
    myStickerBoardChanged();
    timelapse.stop();
    setMarked((m) => new Map(m).set(target.id, answer));
    settleMark(target.id, null);
    // Without the opt-in your own sticker goes blurred too: the line says what shows it.
    const no = formatNo(target.no);
    setMarkedSaid({
      stickerId: target.id,
      words: optedIn
        ? t(($) => $.stickerBoard.detail.markNsfw.done, { no })
        : t(($) => $.stickerBoard.detail.markNsfw.doneBlurred, { no }),
    });
    // Mark 18+ goes with its confirm; the dialog holds the keys that page and close.
    root.current?.focus({ preventScroll: true });
  };

  useBackToClose(true, close);
  useFocusTrap(root, {
    // Escape steps back out of Mark 18+'s confirm first, unless the mark is on its way.
    onEscape: () => {
      if (marking?.step === "sending") return;
      if (marking) stopAsking();
      else close();
    },
    returnFocus,
  });

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
      setMarking((m) => (m?.step === "sending" ? m : null));
    },
  });

  // A page turn can take the focused control with it, as Timelapse waits for the next sticker's
  // detail; the dialog then takes focus, since it holds the keys that page, wrap Tab and close.
  const turned = useRef(shownId);
  useLayoutEffect(() => {
    if (turned.current === shownId) return;
    turned.current = shownId;
    const dialog = root.current;
    if (dialog && !dialog.contains(document.activeElement)) dialog.focus({ preventScroll: true });
  }, [shownId]);

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
          <span>{t(($) => $.ui.backToBoard)}</span>
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
            <img src={withMark(s).urls.png} alt="" draggable={false} />
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
                  kyotoSeika={sticker.kyotoSeikaSubjects !== null}
                  veiled={veiledFor(sticker, optedIn)}
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
              {/* Its own line, so a long handle wraps rather than being cut short. */}
              {byOther && (
                <p className="sticker-detail__artist">
                  <ArtistChip artist={sticker.artist} wrap />
                </p>
              )}
              <p className="fine sticker-detail__fine-print">
                {!byOther && (
                  <>
                    <span className="sticker-detail__by">
                      <Trans
                        i18nKey={($) => $.stickerBoard.detail.by}
                        components={{
                          artist: <span className="handle">{handleOf(sticker.artist)}</span>,
                        }}
                      />
                    </span>{" "}
                  </>
                )}
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
              {sticker.kyotoSeikaSubjects && (
                <KyotoSeikaTag subjects={sticker.kyotoSeikaSubjects} />
              )}
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

            {/* Where the key would be: without the check, the call to send gratitude can't show. */}
            {detail.state === "failed" && (
              <ErrorLine
                className="sticker-detail__check-failed"
                detail={errorDetail(detail.error)}
                // It goes as it retries, so focus moves to the dialog, which holds its keys.
                onRetry={() => {
                  root.current?.focus({ preventScroll: true });
                  detail.retry();
                }}
              >
                {t(($) => $.stickerBoard.detail.checkFailed, {
                  reason: errorMessage(detail.error),
                })}
              </ErrorLine>
            )}

            {youId && refused && (
              <ErrorLine
                className="sticker-detail__gratitude-refused"
                detail={errorDetail(refusalError(refused.refusal))}
                action={{
                  label: t(($) => $.stickerBoard.detail.dismiss),
                  onClick: () => forgetGratitudeRefusal(youId, refused.refusal.giftId),
                }}
              >
                {refusalNote(t, refusalError(refused.refusal), handleOf(refused.giver)).text}
              </ErrorLine>
            )}

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
            {trail.length > 0 && ownerId && (
              // Mounted once its rows are in, so the open row is picked from them.
              <TransferTrail
                key={sticker.id}
                rows={trail}
                viewerId={ownerId}
                artist={sticker.artist}
              />
            )}

            {/* At the very foot, quiet until asked: only its confirm carries the tomato. */}
            {canMark &&
              (mark ? (
                <div
                  className="sticker-detail__mark-ask"
                  role="group"
                  aria-labelledby={`${markId}-title`}
                  aria-describedby={`${markId}-lines`}
                  aria-busy={mark.step === "sending"}
                >
                  <p className="sticker-detail__mark-title" id={`${markId}-title`}>
                    {t(($) => $.stickerBoard.detail.markNsfw.title, { no: formatNo(sticker.no) })}
                  </p>
                  <div className="sticker-detail__mark-lines" id={`${markId}-lines`}>
                    <p>{t(($) => $.stickerBoard.detail.markNsfw.does)}</p>
                    <p className="sticker-detail__mark-undo">
                      {t(($) => $.stickerBoard.detail.markNsfw.cantUndo)}
                    </p>
                    <p>{t(($) => $.stickerBoard.detail.markNsfw.copies)}</p>
                  </div>
                  <div className="sticker-detail__mark-actions">
                    <QuietLink
                      ref={cancelMark}
                      aria-disabled={mark.step === "sending"}
                      onClick={() => {
                        if (mark.step !== "sending") stopAsking();
                      }}
                    >
                      {t(($) => $.stickerBoard.detail.markNsfw.cancel)}
                    </QuietLink>
                    <LabelButton
                      tone="tomato"
                      size="sm"
                      aria-busy={mark.step === "sending"}
                      aria-disabled={mark.step === "sending"}
                      onClick={() => {
                        if (mark.step !== "sending") void markNsfw(sticker);
                      }}
                    >
                      {mark.step === "sending"
                        ? t(($) => $.stickerBoard.detail.markNsfw.sending)
                        : t(($) => $.stickerBoard.detail.markNsfw.confirm)}
                    </LabelButton>
                  </div>
                  {mark.step === "failed" && (
                    <ErrorLine
                      className="sticker-detail__mark-failed"
                      detail={errorDetail(mark.error)}
                    >
                      {t(($) => $.stickerBoard.detail.markNsfw.failed, {
                        reason: errorMessage(mark.error),
                      })}
                    </ErrorLine>
                  )}
                </div>
              ) : (
                <div className="sticker-detail__mark">
                  <QuietLink
                    ref={markButton}
                    onClick={() => setMarking({ stickerId: sticker.id, step: "asking" })}
                  >
                    {t(($) => $.stickerBoard.detail.markNsfw.open)}
                  </QuietLink>
                </div>
              ))}
            <p className="sticker-detail__marked" role="status">
              {markedSaid?.stickerId === sticker.id ? markedSaid.words : ""}
            </p>
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
