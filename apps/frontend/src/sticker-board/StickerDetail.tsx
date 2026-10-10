import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { StickerDetail as StickerDetailResponse } from "@drawing-app/api/client";
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { toPerson, toSticker, type PersonView, type StickerView } from "../api/views";
import { dismissTakeOut, onTakenOut, takeOutFromDetail, useTakeOut } from "../giving/takeOuts";
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
import {
  ArrowUUpLeft,
  CaretLeft,
  CaretRight,
  GiveIcon,
  GratitudeIcon,
  PaperPlaneTilt,
  StickerBoardIcon,
} from "../icons";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatMonthDay, formatNo, handleOf } from "../stickers/format";
import { useLight } from "../stickers/light";
import { spokenPair } from "../kyoto-seika/spokenSubject";
import { SubjectThought } from "../kyoto-seika/SubjectThought";
import { DETAIL_TOWARD } from "../kyoto-seika/thoughtLayout";
import { ArtistChip } from "../stickers/ArtistChip";
import { useMyNsfwOptIn, veiledFor, withoutNsfwDrawings } from "../stickers/nsfw";
import { StickerFigure } from "../stickers/StickerFigure";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { PhonePortal } from "../ui/PhonePortal";
import { QuietLink } from "../ui/QuietLink";
import { Skeleton } from "../ui/Skeleton";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { BoardStickerView } from "./boardSticker";
import { useDetailLift, type LiftView } from "./detailLift";
import { useSwipePaging } from "./detailPaging";
import { forgetKeptBoard } from "./lastBoard";
import { combosLeftNow, useStickerDetail } from "./stickerDetailQuery";
import { myStickerBoardChanged } from "./useMyStickerBoard";
import { TimelapseButton, TimelapseFailure } from "./timelapse/TimelapseButton";
import { TimelapseOverlay } from "./timelapse/TimelapseOverlay";
import { useTimelapse } from "./timelapse/useTimelapse";
import { TransferTrail, TransferTrailSkeleton } from "./TransferTrail";
import { toTrailRows } from "./trailRows";
import { dotSpot } from "./tray/stickerShape";
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
  for (const part of detail.querySelectorAll(
    ".sticker-detail__meta, .sticker-detail__in-flight, .sticker-detail__acts",
  ))
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

/** Marking a sticker 18+, or taking the mark off: its confirm up, on its way, or why it didn't take. */
type Marking =
  | { stickerId: string; step: "asking" | "sending" }
  | { stickerId: string; step: "failed"; error: ApiError };

/** What a sticker marked 18+ here, or unmarked, shows: its images for you now, and the mark. */
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
  // The shown sticker as last listed, and where: one a reload drops from the list, as when a friend
  // receives it, stays in view among the rest until the person pages or closes.
  const [lastListed, setLastListed] = useState<{ sticker: BoardStickerView; at: number } | null>(
    null,
  );
  const listedAt = stickers.findIndex((s) => s.id === shownId);
  const listedNow = stickers[listedAt];
  if (listedNow && (lastListed?.sticker !== listedNow || lastListed.at !== listedAt))
    setLastListed({ sticker: listedNow, at: listedAt });
  const gone = listedAt < 0 && lastListed?.sticker.id === shownId ? lastListed : null;
  const list = gone ? stickers.toSpliced(gone.at, 0, gone.sticker) : stickers;
  const index = Math.max(
    0,
    list.findIndex((s) => s.id === shownId),
  );
  // Each sticker marked 18+ or unmarked here, as the server shows it to you, until the board's reload
  // lists it so.
  const [marked, setMarked] = useState<ReadonlyMap<string, MarkedView>>(() => new Map());
  const withMark = (s: BoardStickerView): BoardStickerView => {
    const answer = marked.get(s.id);
    return answer && answer.nsfw !== s.nsfw ? { ...s, urls: answer.urls, nsfw: answer.nsfw } : s;
  };
  const listed: BoardStickerView | undefined = list[index];
  const sticker = listed && withMark(listed);
  const last = list.length - 1;
  // Each sticker's mark in the making, so one on its way or failed stays with its sticker as it pages.
  const [marks, setMarks] = useState<ReadonlyMap<string, Marking>>(() => new Map());
  // What the status line at the foot says about a mark that landed, under that sticker only.
  const [markedSaid, setMarkedSaid] = useState<{ stickerId: string; words: string } | null>(null);
  // A gift in flight: the stickers whose take-out landed, until the board's reload drops their
  // gift; the sticker whose Take it out confirm is up; and what the status line says once one lands,
  // and whether it landed on the sticker shown.
  const [takenOut, setTakenOut] = useState<ReadonlySet<string>>(() => new Set());
  const [takeOutAsk, setTakeOutAsk] = useState<string | null>(null);
  const [takenOutSaid, setTakenOutSaid] = useState<{
    stickerId: string;
    words: string;
    shown: boolean;
  } | null>(null);
  const takeOut = useTakeOut(sticker?.id ?? null);
  const openGift = sticker && !takenOut.has(sticker.id) ? sticker.openGift : null;
  const sent = openGift?.status === "sent";
  const giftDot =
    mode === "yours" && sticker && openGift
      ? { status: openGift.status, spot: dotSpot(sticker) }
      : null;
  // Gratitude kept on this phone that the server has since recorded or refused: counted, whatever
  // the read of the detail is doing, so a read that went out before one left can be told apart.
  const combosLeft = useSyncExternalStore(onGratitudeLeftOutbox, combosLeftNow);
  // Its Transfer Trail, and whether you owe gratitude for a sticker you hold, come with its detail,
  // often read ahead by the board.
  const shownStickerId = sticker?.id ?? null;
  const detail = useStickerDetail(sticker ?? null);
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
    mode === "yours" && onSendGratitude && sticker && !sent && loaded && !predatesCombo
      ? owedGratitude(loaded)
      : null;
  // Why the server refused gratitude this phone sent, which may have come once its receipt was gone.
  const youId = mode === "yours" ? (loaded?.owner.id ?? null) : null;
  const gratitudeRefusals = useGratitudeRefusals(youId);
  const refused = youId && loaded ? refusedGratitude(loaded, gratitudeRefusals) : null;
  // Until the read lands, the board's outline of the trail holds its place, and a gift to you with no
  // gratitude yet lays out Send gratitude's, so nothing under the fine print moves as it lands.
  const reading = detail.state === "loading" && sticker !== undefined;
  const trailHeld = reading && ownerId !== undefined && sticker.trail.timesGiven > 0;
  const mayOweGratitude =
    reading &&
    mode === "yours" &&
    onSendGratitude !== undefined &&
    !sent &&
    sticker.trail.timesGiven > 0 &&
    !sticker.trail.newestHasGratitude;
  // The trail that lands where its skeleton was rises into its place.
  const [heldTrailOf, setHeldTrailOf] = useState<string | null>(null);
  if (trailHeld && heldTrailOf !== sticker.id) setHeldTrailOf(sticker.id);

  const root = useRef<HTMLDivElement>(null);
  const strip = useRef<HTMLElement>(null);
  const figure = useRef<HTMLSpanElement>(null);

  const lift = useDetailLift({
    root,
    shownId: sticker?.id,
    originOf: (id) => {
      const el = originOf?.(id);
      const s = list.find((x) => x.id === id);
      if (!el || !s) return null;
      // A given sticker, or one in a gift, fades in out of its spot in the sticker tray, which stays.
      return { el, turn: s.placement.r, given: !s.held || s.openGift !== null };
    },
    into: DETAIL,
    reduced,
    onClose,
  });
  // From the board's listing, so Timelapse shows as the detail opens. A sticker veiled for you plays
  // no timelapse, which shows its drawing: the board says so, and a mark landing here says so at once.
  const veiled = sticker !== undefined && veiledFor(sticker, optedIn);
  const hasTimelapse = sticker !== undefined && sticker.hasTimelapse && !veiled;
  const kyotoSeika = sticker !== undefined && sticker.kyotoSeikaSubjects !== null;
  const timelapse = useTimelapse({ sticker, hasTimelapse, figure, reduced, kyotoSeika });
  // The timelapse's overlay goes first: the lift clones the figure and flies it back to the board.
  const close = () => {
    timelapse.stop();
    lift();
  };

  // Mark 18+, or Remove 18+ once it's marked: only the Original Artist can. Each confirm opens on
  // Cancel, so Enter alone never changes the mark, and closing it with nothing changed puts focus
  // back on its button.
  const markId = useId();
  const markButton = useRef<HTMLButtonElement>(null);
  const cancelMark = useRef<HTMLButtonElement>(null);
  const markActions = useRef<HTMLDivElement>(null);
  const canChangeMark = Boolean(ownerId && sticker && sticker.artist.id === ownerId);
  const mark = (sticker && marks.get(sticker.id)) ?? null;
  const asking = mark !== null;
  const backToMark = useRef(false);
  useEffect(() => {
    if (asking) cancelMark.current?.focus({ preventScroll: true });
    else if (backToMark.current) markButton.current?.focus({ preventScroll: true });
    backToMark.current = false;
  }, [asking]);
  // On a short phone the confirm opens past the fold, so its buttons come up into view.
  useEffect(() => {
    if (asking)
      markActions.current?.scrollIntoView({
        block: "nearest",
        behavior: reduced ? "auto" : "smooth",
      });
  }, [asking, reduced]);
  const settleMark = (stickerId: string, next: Marking | null) =>
    setMarks((m) => {
      const marks = new Map(m);
      if (next) marks.set(stickerId, next);
      else marks.delete(stickerId);
      return marks;
    });
  const stopAsking = () => {
    backToMark.current = true;
    if (sticker) settleMark(sticker.id, null);
  };
  // A mark can land after a page turn, on a sticker no longer shown: the one shown keeps its
  // timelapse and focus.
  const shownNow = useRef(shownStickerId);
  useLayoutEffect(() => {
    shownNow.current = shownStickerId;
  });
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
  /** A mark that landed either way: shown as the server answered, with the status line saying so. */
  const markChanged = (target: BoardStickerView, answer: MarkedView, words: string) => {
    // The board kept on this phone, and the board's answers, show the mark as it was.
    forgetKeptBoard();
    myStickerBoardChanged();
    setMarked((m) => new Map(m).set(target.id, answer));
    settleMark(target.id, null);
    setMarkedSaid({ stickerId: target.id, words });
    // Its button goes with its confirm; the dialog holds the keys that page and close.
    if (shownNow.current === target.id) root.current?.focus({ preventScroll: true });
  };
  const markNsfw = async (target: BoardStickerView) => {
    settleMark(target.id, { stickerId: target.id, step: "sending" });
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
    if (shownNow.current === target.id) timelapse.stop();
    // Without the opt-in your own sticker goes blurred too: the line says what shows it.
    const no = formatNo(target.no);
    markChanged(
      target,
      answer,
      optedIn
        ? t(($) => $.stickerBoard.detail.markNsfw.done, { no })
        : t(($) => $.stickerBoard.detail.markNsfw.doneBlurred, { no }),
    );
  };
  // One without the mark answers as it is, so a removal another window made first lands here too.
  const unmarkNsfw = async (target: BoardStickerView) => {
    settleMark(target.id, { stickerId: target.id, step: "sending" });
    let answer: MarkedView;
    try {
      answer = toSticker((await api.unmarkStickerNsfw(target.id)).sticker);
    } catch (error) {
      const failure = apiError(error);
      console.error(`Sticker ${target.id}'s 18+ mark wasn't taken off`, failure);
      settleMark(target.id, { stickerId: target.id, step: "failed", error: failure });
      return;
    }
    const no = formatNo(target.no);
    markChanged(
      target,
      answer,
      t(($) => $.stickerBoard.detail.unmarkNsfw.done, { no }),
    );
  };
  const changeMark = (target: BoardStickerView) =>
    void (target.nsfw ? unmarkNsfw(target) : markNsfw(target));

  // Take it out: a gift still in the bag comes out at once; a sent one asks first, in place, its
  // confirm opening on Cancel as Mark 18+'s does. The take-out goes on if the detail closes.
  const takeOutLink = useRef<HTMLButtonElement>(null);
  const cancelTakeOut = useRef<HTMLButtonElement>(null);
  const askingTakeOut = takeOutAsk === sticker?.id && sent && takeOut?.step !== "takingOut";
  const backToTakeOut = useRef(false);
  useEffect(() => {
    if (askingTakeOut) cancelTakeOut.current?.focus({ preventScroll: true });
    else if (backToTakeOut.current) takeOutLink.current?.focus({ preventScroll: true });
    backToTakeOut.current = false;
  }, [askingTakeOut]);
  const stopAskingTakeOut = () => {
    backToTakeOut.current = true;
    setTakeOutAsk(null);
  };
  const startTakeOut = (stickerId: string, giftId: string) => {
    if (!ownerId) return;
    if (askingTakeOut) backToTakeOut.current = true;
    setTakeOutAsk(null);
    takeOutFromDetail({ api, userId: ownerId }, stickerId, giftId);
  };
  // One landed, from this detail or from one closed since: Give is back, and the status line says
  // where the sticker went.
  const tookOut = useEffectEvent((id: string) => {
    const s = list.find((x) => x.id === id);
    if (!s) return;
    setTakenOut((ids) => new Set(ids).add(id));
    const no = formatNo(s.no);
    setTakenOutSaid({
      stickerId: id,
      words: s.placement.on
        ? t(($) => $.stickerBoard.detail.takeOut.backOnBoard, { no })
        : t(($) => $.stickerBoard.tray.status.returned, { no }),
      shown: id === shownStickerId,
    });
  });
  useEffect(() => onTakenOut((id) => tookOut(id)), []);
  // Take it out goes with the gift shown, so focus goes to the key back in its place. Decided as it
  // lands: paging back to that sticker later moves no focus.
  useLayoutEffect(() => {
    if (!takenOutSaid?.shown) return;
    const dialog = root.current;
    const key = dialog?.querySelector<HTMLElement>(".sticker-detail__acts .key");
    if (key) key.focus({ preventScroll: true });
    else if (dialog && !dialog.contains(document.activeElement))
      dialog.focus({ preventScroll: true });
  }, [takenOutSaid]);

  useBackToClose(true, close);
  useFocusTrap(root, {
    // Escape steps back out of a confirm first: Take it out's, then Mark 18+'s, unless the mark is
    // on its way.
    onEscape: () => {
      if (askingTakeOut) stopAskingTakeOut();
      else if (mark?.step === "sending") return;
      else if (mark) stopAsking();
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
    count: list.length,
    reduced,
    onPage: (next) => {
      const target = list[next];
      if (target) setShownId(target.id);
      // A confirm left open goes; a mark on its way, or its failure, stays with its sticker.
      setMarks((m) => new Map([...m].filter(([, made]) => made.step !== "asking")));
      setTakeOutAsk(null);
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

  // What the column holds from under the sticker's stage down to Give, or to its last line before the
  // trail, which an upright large screen leaves room for under the sticker (sticker-detail.css).
  // Measured by layout alone, so the column's entrance doesn't count.
  const hasSticker = sticker !== undefined;
  useLayoutEffect(() => {
    const detail = root.current;
    const column = detail?.querySelector(".sticker-detail__column");
    if (!detail || !column) return;
    const observer = new ResizeObserver(() => {
      const stage = detail.querySelector<HTMLElement>(".sticker-detail__stage");
      const ends = column.querySelectorAll<HTMLElement>(
        ".sticker-detail__meta, .sticker-detail__in-flight, .sticker-detail__acts",
      );
      const end = ends[ends.length - 1];
      if (!stage || !end) return;
      const fold = end.offsetTop + end.offsetHeight - (stage.offsetTop + stage.offsetHeight);
      detail.style.setProperty("--column-fold", `${Math.ceil(fold)}px`);
    });
    observer.observe(column);
    return () => observer.disconnect();
  }, [hasSticker]);

  // The shown sticker's thumb scrolls to the strip's middle, again when its place in the list moves,
  // as a sticker taken out of its gift goes back among the rest.
  useLayoutEffect(() => {
    const nav = strip.current;
    const current = nav?.querySelector<HTMLElement>('[aria-current="true"]');
    if (nav && current)
      nav.scrollTop = Math.max(
        0,
        current.offsetTop - nav.clientHeight / 2 + current.offsetHeight / 2,
      );
  }, [shownId, index]);

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
        {list.map((s, i) => (
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

      {/* The sticker's shape, which the column beside it reads to line up with its top edge. */}
      <div
        className="sticker-detail__main"
        style={sticker ? { "--ar": (sticker.width / sticker.height).toFixed(4) } : undefined}
      >
        {sticker ? (
          <>
            {/* The sticker and its pager, and the column about it: on a phone two plain blocks in
                one scroll, and side by side on a large screen wider than tall (sticker-detail.css). */}
            <div className="sticker-detail__sticker-pane">
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
                    kyotoSeika={kyotoSeika}
                    veiled={veiled}
                  />
                  <TimelapseOverlay timelapse={timelapse} />
                  {/* A gift's state, stuck on the sticker as it pages; its note says it in words. */}
                  {giftDot && (
                    <span
                      className="sticker-detail__dot-layer"
                      style={{
                        "--spot-x": giftDot.spot.x.toFixed(4),
                        "--spot-y": giftDot.spot.y.toFixed(4),
                      }}
                      aria-hidden="true"
                    >
                      <span className="sticker-detail__gift-dot" data-gift={giftDot.status}>
                        {giftDot.status === "sent" ? (
                          <PaperPlaneTilt weight="fill" />
                        ) : (
                          <GiveIcon weight="fill" />
                        )}
                      </span>
                    </span>
                  )}
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
                      setSize: list.length,
                    })}
                  </span>
                  <span className="visually-hidden">
                    {t(($) => $.stickerBoard.detail.countSpoken, {
                      no: formatNo(sticker.no),
                      position: index + 1,
                      setSize: list.length,
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
            </div>

            <div className="sticker-detail__column">
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
                    {t(($) => $.stickerBoard.detail.sealedOn, {
                      day: formatDay(sticker.createdAt),
                    })}
                  </span>
                  <TimelapseButton timelapse={timelapse} />
                </p>
                {sticker.kyotoSeikaSubjects && (
                  <>
                    <SubjectThought
                      subjects={sticker.kyotoSeikaSubjects}
                      size="detail"
                      toward={DETAIL_TOWARD}
                      reduced={reduced}
                    />
                    <p className="visually-hidden">{spokenPair(sticker.kyotoSeikaSubjects)}</p>
                  </>
                )}
                {/* The Transfer Trail says it too, once it's in or while its place is held. */}
                {mode === "given" && sticker.givenTo && trail.length === 0 && !trailHeld && (
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

              {/* A gift in flight says its state only, with Take it out under it. Sent, it waits
                  for its friend: nothing to give until it comes back. */}
              {mode === "yours" && openGift && (
                <div className="sticker-detail__in-flight">
                  <p className="sticker-detail__on-its-way">
                    <span
                      className={`sticker-detail__sleeve ${sent ? "" : "is-open"}`}
                      aria-hidden="true"
                    >
                      <img src={sticker.urls.png} alt="" draggable={false} />
                    </span>
                    <span>
                      {!sent
                        ? t(($) => $.giving.inTheBag.title)
                        : openGift.to
                          ? t(($) => $.stickerBoard.detail.onItsWayTo, {
                              receiver: formatHandle(openGift.to),
                            })
                          : t(($) => $.stickerBoard.detail.onItsWay)}
                    </span>
                  </p>
                  {ownerId &&
                    (askingTakeOut ? (
                      <div
                        className="sticker-detail__confirm"
                        role="group"
                        aria-labelledby={`${markId}-take-out`}
                      >
                        <p className="sticker-detail__confirm-title" id={`${markId}-take-out`}>
                          {t(($) => $.stickerBoard.detail.takeOut.title, {
                            no: formatNo(sticker.no),
                          })}
                        </p>
                        <div className="sticker-detail__confirm-actions">
                          <QuietLink ref={cancelTakeOut} onClick={stopAskingTakeOut}>
                            {t(($) => $.stickerBoard.detail.takeOut.cancel)}
                          </QuietLink>
                          <LabelButton
                            size="sm"
                            onClick={() => startTakeOut(sticker.id, openGift.id)}
                          >
                            {t(($) => $.giving.inTheBag.takeOut)}
                          </LabelButton>
                        </div>
                      </div>
                    ) : (
                      <QuietLink
                        ref={takeOutLink}
                        aria-busy={takeOut?.step === "takingOut" || undefined}
                        aria-disabled={takeOut?.step === "takingOut" || undefined}
                        onClick={() => {
                          if (takeOut?.step === "takingOut") return;
                          if (sent) setTakeOutAsk(sticker.id);
                          else startTakeOut(sticker.id, openGift.id);
                        }}
                      >
                        <ArrowUUpLeft />{" "}
                        {takeOut?.step === "takingOut"
                          ? t(($) => $.giving.takingOut.button)
                          : t(($) => $.giving.inTheBag.takeOut)}
                      </QuietLink>
                    ))}
                  {takeOut?.step === "failed" && (
                    <ErrorLine
                      className="sticker-detail__take-out-failed"
                      detail={errorDetail(takeOut.error)}
                      // It goes as it retries or is dismissed, so focus moves to Take it out.
                      onRetry={() => {
                        takeOutLink.current?.focus({ preventScroll: true });
                        startTakeOut(sticker.id, takeOut.giftId);
                      }}
                      action={{
                        label: t(($) => $.stickerBoard.detail.dismiss),
                        onClick: () => {
                          takeOutLink.current?.focus({ preventScroll: true });
                          dismissTakeOut(sticker.id);
                        },
                      }}
                    >
                      {t(($) => $.giving.inTheBag.couldntTakeOut, {
                        no: formatNo(sticker.no),
                        reason: errorMessage(takeOut.error),
                      })}
                    </ErrorLine>
                  )}
                </div>
              )}
              {mode === "yours" &&
                !sent &&
                ((owed && onSendGratitude) || mayOweGratitude ? (
                  // Gratitude comes first; Give stays within reach as label stock.
                  <div className="sticker-detail__acts sticker-detail__acts--stack">
                    {owed && onSendGratitude ? (
                      <Key
                        tone="pink"
                        icon={<GratitudeIcon />}
                        onClick={() => onSendGratitude(owed.gift, owed.sticker, owed.giver)}
                      >
                        {t(($) => $.stickerBoard.detail.sendGratitude)}
                      </Key>
                    ) : (
                      <Skeleton
                        className="sticker-detail__key-skeleton"
                        width="100%"
                        height="auto"
                      />
                    )}
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
                  rises={heldTrailOf === sticker.id}
                />
              )}
              {trailHeld && <TransferTrailSkeleton trail={sticker.trail} />}

              {/* At the foot past a rule, so it never reads as Give's alternative. Its confirm is plain
                  label stock too, since a mark can come off again. */}
              {(canChangeMark || markedSaid?.stickerId === sticker.id) && (
                <section className="sticker-detail__mark">
                  <hr className="sticker-detail__mark-rule" />
                  {canChangeMark &&
                    (mark ? (
                      <div
                        className="sticker-detail__confirm"
                        role="group"
                        aria-labelledby={`${markId}-title`}
                        aria-describedby={`${markId}-lines`}
                        aria-busy={mark.step === "sending"}
                      >
                        <p className="sticker-detail__confirm-title" id={`${markId}-title`}>
                          {sticker.nsfw
                            ? t(($) => $.stickerBoard.detail.unmarkNsfw.title, {
                                no: formatNo(sticker.no),
                              })
                            : t(($) => $.stickerBoard.detail.markNsfw.title, {
                                no: formatNo(sticker.no),
                              })}
                        </p>
                        <div className="sticker-detail__mark-lines" id={`${markId}-lines`}>
                          {sticker.nsfw ? (
                            <p>{t(($) => $.stickerBoard.detail.unmarkNsfw.does)}</p>
                          ) : (
                            <>
                              <p>{t(($) => $.stickerBoard.detail.markNsfw.does)}</p>
                              <p>{t(($) => $.stickerBoard.detail.markNsfw.copies)}</p>
                            </>
                          )}
                        </div>
                        <div ref={markActions} className="sticker-detail__confirm-actions">
                          <QuietLink
                            ref={cancelMark}
                            aria-disabled={mark.step === "sending"}
                            onClick={() => {
                              if (mark.step !== "sending") stopAsking();
                            }}
                          >
                            {sticker.nsfw
                              ? t(($) => $.stickerBoard.detail.unmarkNsfw.cancel)
                              : t(($) => $.stickerBoard.detail.markNsfw.cancel)}
                          </QuietLink>
                          <LabelButton
                            size="sm"
                            aria-busy={mark.step === "sending"}
                            aria-disabled={mark.step === "sending"}
                            onClick={() => {
                              if (mark.step !== "sending") changeMark(sticker);
                            }}
                          >
                            {sticker.nsfw
                              ? mark.step === "sending"
                                ? t(($) => $.stickerBoard.detail.unmarkNsfw.sending)
                                : t(($) => $.stickerBoard.detail.unmarkNsfw.confirm)
                              : mark.step === "sending"
                                ? t(($) => $.stickerBoard.detail.markNsfw.sending)
                                : t(($) => $.stickerBoard.detail.markNsfw.confirm)}
                          </LabelButton>
                        </div>
                        {mark.step === "failed" && (
                          <ErrorLine
                            className="sticker-detail__mark-failed"
                            detail={errorDetail(mark.error)}
                            onRetry={() => changeMark(sticker)}
                          >
                            {sticker.nsfw
                              ? t(($) => $.stickerBoard.detail.unmarkNsfw.failed, {
                                  no: formatNo(sticker.no),
                                  reason: errorMessage(mark.error),
                                })
                              : t(($) => $.stickerBoard.detail.markNsfw.failed, {
                                  no: formatNo(sticker.no),
                                  reason: errorMessage(mark.error),
                                })}
                          </ErrorLine>
                        )}
                      </div>
                    ) : (
                      <LabelButton
                        ref={markButton}
                        block
                        onClick={() =>
                          settleMark(sticker.id, { stickerId: sticker.id, step: "asking" })
                        }
                      >
                        {sticker.nsfw
                          ? t(($) => $.stickerBoard.detail.unmarkNsfw.open)
                          : t(($) => $.stickerBoard.detail.markNsfw.open)}
                      </LabelButton>
                    ))}
                  <p className="sticker-detail__marked" role="status">
                    {markedSaid?.stickerId === sticker.id ? markedSaid.words : ""}
                  </p>
                </section>
              )}
              <p className="visually-hidden sticker-detail__taken-out" role="status">
                {takenOutSaid?.stickerId === sticker.id ? takenOutSaid.words : ""}
              </p>
            </div>
          </>
        ) : (
          <p className="sticker-detail__none">{t(($) => $.stickerBoard.detail.none)}</p>
        )}
      </div>
    </div>
  );
  return <PhonePortal eachRender>{page}</PhonePortal>;
}
