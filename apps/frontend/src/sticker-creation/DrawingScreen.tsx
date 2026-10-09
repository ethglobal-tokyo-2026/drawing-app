import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type Ref,
} from "react";
import { retryPrivySignIn } from "../identity/privy";
import type { KyotoSeikaSubject, Sticker, TicketUse } from "@drawing-app/api/client";
import { apiError, type ApiClient } from "../api/apiClient";
import { useMe } from "../api/meContext";
import type { BeginKeyHandle } from "../kyoto-seika/BeginKey";
import { CornerPrint } from "../kyoto-seika/CornerPrint";
import { useCanvasName } from "../kyoto-seika/useCanvasName";
import { pickedPair } from "../kyoto-seika/deal";
import { KyotoSeikaDeal } from "../kyoto-seika/KyotoSeikaDeal";
import { useKyotoSeikaSheet } from "../kyoto-seika/useKyotoSeikaSheet";
import { useApi } from "../api/useApi";
import { errorDetail, errorMessage, problemOf, type Problem } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { OutOfTickets } from "../tickets/OutOfTickets";
import { StartDrawing } from "../tickets/StartDrawing";
import { nextKind, ticketsLeft, type TicketKind, type Tickets } from "../tickets/tickets";
import { ReserveTicketCheckout } from "../tickets/ReserveTicketCheckout";
import { TicketsNotLoaded } from "../tickets/TicketsNotLoaded";
import { useTickets } from "../tickets/useTickets";
import { clamp01 } from "../ui/easing";
import { useSideways } from "../ui/sideways";
import { useLargeScreen } from "../ui/largeScreen";
import { QuietLink } from "../ui/QuietLink";
import { releaseCanvas } from "../ui/releaseCanvas";
import { sizePx } from "./canvas/brush";
import { DrawingCanvas, type DrawingCanvasHandle } from "./canvas/DrawingCanvas";
import type { HistoryState, InputMode } from "./canvas/inkEngine";
import { penDrew, useDrawingHand, useInputMode, usePenPressure } from "./drawingSettings";
import { isFirstVisit } from "./drawVisits";
import type { Op, Tool } from "./canvas/ops";
import type { SheetFrame } from "./canvas/sheetFrame";
import { FIRST_SMOOTHING } from "./canvas/stabilizer";
import { SealKey } from "./SealKey";
import { SealSheet } from "./SealSheet";
import { makeSticker, type SealedSticker } from "./sealing/makeSticker";
import { SealCeremony } from "./sealing/SealCeremony";
import { SealingStatusLabel } from "./sealing/SealingStatusLabel";
import { LEAVE_MS, type Box } from "./sealing/sealTimeline";
import { encodeTimelapse, gzipTimelapse } from "./sealing/timelapse";
import {
  keptColor,
  loadKeptSession,
  LOAD_TIMEOUT_MS,
  SessionKeeper,
  UNDEALT,
  type KeptDrawing,
  type KeptKyotoSeika,
  type KeptSession,
} from "./session/keptSession";
import { forgetSentSeal, keepSentSeal, sealWentOut, sentSealOutcome } from "./session/sentSeal";
import {
  describeSealFailure,
  FRESH_SESSION,
  sealFailure,
  sessionMs,
  transition,
  type SessionEffect,
  type SessionEvent,
} from "./session/session";
import { useSessionClock } from "./session/useSessionClock";
import { TimerDot, type TimerDotHandle } from "./TimerDot";
import { ClearBar } from "./tools/ClearBar";
import { ColorSheet } from "./tools/ColorSheet";
import { HistoryButtons } from "./tools/HistoryButtons";
import { MyBoardTile } from "./tools/MyBoardTile";
import { FIRST_RECENT, startingColor, withRecent } from "./tools/palette";
import { SizeRail } from "./tools/SizeRail";
import { SmoothingBar } from "./tools/SmoothingBar";
import { ToolStrip, type Panel } from "./tools/ToolStrip";
import { useShortcuts } from "./useShortcuts";
import "./DrawingScreen.css";

/** Where the size rail starts for each tool, remembered per tool from then on. */
const FIRST_SIZES = { brush: 0.34, eraser: 0.52 };
/** How far [ and ] move the size rail. */
const SIZE_STEP = 0.04;

const afterPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve)));

/** A seal's ceremony: from the moment the sticker is cut, through the server's answer. */
interface Ceremony {
  /** Counts seals, so a new try replaces a failed one's ceremony. */
  id: number;
  sticker: SealedSticker;
  /** The sticker as the server sealed it; null while the seal is on its way. */
  sealed: Sticker | null;
  /** The seal failed, and the ceremony is fading back to the drawing. */
  failed: boolean;
  /** Keep drawing or the shop was chosen: the card is leaving over the fresh sheet. */
  leaving: boolean;
  /** Where the sheet sat in the drawing screen when it was sealed. */
  sheet: Box;
}

type SealRequest = Parameters<ApiClient["seal"]>[0];

/** A seal whose request may have reached the server: a retry sends it as it was, and plays its sticker. */
interface SentSeal {
  request: SealRequest;
  sticker: SealedSticker;
}

export interface DrawingScreenHandle {
  /** Wipes the canvas and history so the next sticker starts from a fresh sheet. */
  startNewSticker: () => void;
  closeDrawers: () => void;
}

interface Props {
  ref?: Ref<DrawingScreenHandle>;
  /** Whether the drawing screen is showing. It stays mounted either way, so a sticker in progress survives a tab switch. */
  active: boolean;
  onSealed: (stickerId: string) => void;
  onNewSticker: () => void;
  onGoToBoard: () => void;
  /** The My board tile: the board opens over the drawing screen, as its tab opens it elsewhere. */
  onMyBoardTile: () => void;
}

/**
 * The drawing screen: a white sheet on the Liner, the timer and the tools in one row across the top.
 * On a phone the size rail runs down the left edge, undo, redo and My board sit at the bottom left
 * and the seal key at the bottom right; on a large screen the rail, undo, redo, My board and the seal
 * key stack in a slim sidebar at the left edge. A left drawing hand mirrors both. It owns the session
 * (tickets, the clock and the seal step); the ink engine owns the drawing.
 */
export function DrawingScreen({
  ref,
  active,
  onSealed,
  onNewSticker,
  onGoToBoard,
  onMyBoardTile,
}: Props) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<DrawingCanvasHandle>(null);
  // The seal sheet's preview reads the ink as it opens.
  const readInk = useCallback(() => canvas.current?.inkForReading() ?? null, []);
  const timer = useRef<TimerDotHandle>(null);
  const undoTile = useRef<HTMLButtonElement>(null);
  const api = useApi();
  const tickets = useTickets();
  const me = useMe();
  const colorSheetId = useId();
  const smoothingBarId = useId();
  const clearBarId = useId();
  /** On a large screen the color sheet is a popover, which a tap outside closes. */
  const large = useLargeScreen();
  const hand = useDrawingHand();
  // The input each sheet starts in, from Settings; null before a pen has drawn on this device.
  const defaultInputMode = useInputMode();
  // The Pencil only tile's choice for this sheet; a fresh sheet starts in the default again.
  const [sheetInputMode, setSheetInputMode] = useState<InputMode | null>(null);
  const inputMode = defaultInputMode === null ? null : (sheetInputMode ?? defaultInputMode);
  const penPressure = usePenPressure();

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(() => startingColor());
  // The color this drawing started in. The next drawing starts in another.
  const startedIn = useRef(color);
  const [recent, setRecent] = useState(FIRST_RECENT);
  const [sizes, setSizes] = useState(FIRST_SIZES);
  const [smoothing, setSmoothing] = useState(FIRST_SMOOTHING);
  const [panel, setPanel] = useState<Panel>(null);
  const [paused, setPaused] = useState(false);
  const [sizing, setSizing] = useState(false);
  // How many CSS px a sheet unit spans on screen: the size rail's ghost shows the brush at it.
  const [sheetScale, setSheetScale] = useState(1);
  const [history, setHistory] = useState<HistoryState>({
    canUndo: false,
    canRedo: false,
    hasInk: false,
  });
  const [session, setSession] = useState(FRESH_SESSION);
  // Transitions start from here, so one sent after an await still starts from the latest session.
  const latest = useRef(FRESH_SESSION);
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  // The sealed sticker's layers are let go when a fresh sheet replaces it, or once its card has left.
  const lastCeremony = useRef<Ceremony | null>(null);
  const seals = useRef(0);
  // Until the server answers it or refuses it, the sheet can't change: the server may already hold it.
  const sentSeal = useRef<SentSeal | null>(null);
  const [sealProblem, setSealProblem] = useState<Problem | null>(null);
  // At 0:00 a seal that never reached the server can be let go for a fresh sheet, since the phone
  // may fail to cut it every time.
  const [canStartOver, setCanStartOver] = useState(false);
  /** The chip says LINE's sign-in expired, so tapping the check reconnects instead of sealing. */
  const reconnectOnTap = useRef(false);
  // The out-of-tickets card or the ticket shop, over a fresh sheet, or null.
  const [overlay, setOverlay] = useState<"out" | "shop" | null>(null);
  // A ticket is being spent on the server; Start waits for it.
  const [spending, setSpending] = useState(false);
  // The spend needs no asking (Keep drawing, or Draw after a refill or a purchase): the ask stays down
  // while it's on its way, and comes up only if it fails.
  const [rightAway, setRightAway] = useState(false);
  const [startProblem, setStartProblem] = useState<string | null>(null);
  // The session's ticket use, as the server numbers it: spent at Start, or before a reload.
  const ticket = useRef<number | null>(null);
  // Whether this device keeps the drawing in progress; the timer's note says so while it can't.
  const [kept, setKept] = useState(true);
  const [keeper] = useState(() => new SessionKeeper(me.id, setKept));
  // The deal of a ticket spent in Kyoto Seika Manga Expression Practice Mode, and whether this sheet's was.
  const kyotoSeikaSheet = useKyotoSeikaSheet({ userId: me.id, keeper });
  const ticketKyotoSeika = useRef(false);
  const begin = useRef<BeginKeyHandle>(null);
  // Begin was pressed: the deal tucks away before it goes.
  const [dealLeaving, setDealLeaving] = useState(false);
  // The rail's sizes and Smoothing are kept with the drawing, so a reload brings them back too.
  useEffect(
    () => keeper.keepTools({ brushSize: sizes.brush, eraserSize: sizes.eraser, smoothing }),
    [keeper, sizes, smoothing],
  );
  // Until a session kept across a reload is back, or known lost, Draw doesn't ask for a ticket.
  const [restoring, setRestoring] = useState(true);
  // The sheet's 18+ mark, from the seal sheet's switch; the seal reads the ref, after an await.
  const [nsfwOn, setNsfwOn] = useState(false);
  const nsfw = useRef(false);
  const keepNsfw = (on: boolean) => {
    nsfw.current = on;
    setNsfwOn(on);
  };
  const [pickedUp, setPickedUp] = useState<"restored" | "lost" | "carried" | "sealed" | null>(null);
  // A tap on the waiting timer puts "Starts when you draw" under it, until the first stroke.
  const [startsNote, setStartsNote] = useState(false);

  // 0:00 puts the pencils down: the time's-up sheet rises, and the drawing is kept at its full time,
  // so a reload brings the sheet back. A sheet with nothing on it has nothing to seal: it's spent,
  // and the fresh one says so.
  const clock = useSessionClock(() => {
    if (latest.current.phase === "drawing" && !history.hasInk) {
      send({ type: "reset" });
      setSealProblem({ message: t(($) => $.stickerCreation.seal.emptyAtTimeUp) });
      return;
    }
    send({ type: "time-up" });
    keepProgress();
  }, sessionMs(me.kyotoSeikaPractice));
  // A blank sheet shows the length its ticket will be spent with, so Settings apply to it in place.
  useEffect(() => {
    if (session.phase === "blank") clock.setLength(sessionMs(me.kyotoSeikaPractice));
  }, [clock, session.phase, me.kyotoSeikaPractice]);

  function send(event: SessionEvent) {
    const { session: next, effects } = transition(latest.current, event);
    if (next === latest.current) return;
    latest.current = next;
    setSession(next);
    effects.forEach(run);
  }

  function run(effect: SessionEffect) {
    switch (effect) {
      case "keep-session":
        keeper.start(ticket.current, ticketKyotoSeika.current ? UNDEALT : null);
        if (ticketKyotoSeika.current && ticket.current !== null)
          kyotoSeikaSheet.open(ticket.current, null);
        // The ticket use is kept with this sheet now, so the spend's key can go.
        tickets.forgetKeptSpend();
        return;
      case "start-clock":
        clock.start();
        return;
      case "lock-subjects":
        kyotoSeikaSheet.begin();
        setDealLeaving(true);
        // Begin leaves with the deal, so focus goes to the clock it started rather than to the page.
        timer.current?.focus();
        return;
      case "seal":
        clock.stop();
        void seal();
        return;
      case "resume-clock":
        clock.resume();
        return;
      case "reset-sheet": {
        canvas.current?.reset();
        // The next ticket is spent in the mode the person has on now.
        clock.reset(sessionMs(me.kyotoSeikaPractice));
        keeper.wipe();
        kyotoSeikaSheet.close();
        ticketKyotoSeika.current = false;
        setDealLeaving(false);
        forgetSentSeal(me.id);
        ticket.current = null;
        setPickedUp(null);
        setPaused(false);
        setPanel(null);
        setSheetInputMode(null);
        lastCeremony.current?.sticker.dispose();
        lastCeremony.current = null;
        sentSeal.current?.sticker.dispose();
        sentSeal.current = null;
        // A sealed card handing over to this sheet stays up until it has left.
        setCeremony((c) => (c?.leaving ? c : null));
        setSealProblem(null);
        setCanStartOver(false);
        setStartProblem(null);
        keepNsfw(false);
        // A fresh sheet starts in a new color, whatever the last one ended in.
        const next = startingColor([startedIn.current, color]);
        startedIn.current = next;
        setColor(next);
        return;
      }
    }
  }

  /** The sheet's place in the drawing screen, which the ceremony plays over. */
  function sheetBox(): Box {
    const screen = root.current?.getBoundingClientRect();
    const paper = root.current?.querySelector(".ink-sheet")?.getBoundingClientRect();
    if (!screen || !paper) throw new Error("the sheet isn't on screen");
    return {
      x: paper.left - screen.left,
      y: paper.top - screen.top,
      w: paper.width,
      h: paper.height,
    };
  }

  /** How the sticker was drawn, gzipped; null when it can't be made, and the sticker seals without it. */
  async function timelapseOf(ops: readonly Op[], frame: SheetFrame, sticker: SealedSticker) {
    try {
      return await gzipTimelapse(encodeTimelapse({ ops, frame, place: sticker.place }));
    } catch (error) {
      console.error("The timelapse couldn’t be made, so the sticker seals without it", error);
      return null;
    }
  }

  /**
   * Cuts the sticker from the sheet as it is now, and makes its seal request once the timelapse is
   * gzipped; null when nothing is drawn. The ops and the 18+ mark are read with the ink's copy, so
   * nothing on the sheet after it reaches the sticker or its timelapse.
   */
  async function cutFromSheet(timeUsed: number) {
    canvas.current?.finishStroke();
    const ops = [...(canvas.current?.ops() ?? [])];
    const frame = canvas.current?.frame() ?? null;
    // The drawing kept on this device holds what the sticker is cut from, the stroke just ended too.
    keeper.save(canvas.current?.steps() ?? [], clock.elapsed, frame);
    const marked = nsfw.current;
    // The pair Begin locked in, each subject as the sticker keeps it.
    const pair = kyotoSeikaSheet.pair;
    const kept = ({ ja, reading, en }: KyotoSeikaSubject) => ({ ja, reading, en });
    const subjects = pair && ([kept(pair[0]), kept(pair[1])] as const);
    // A sheet that never showed has no frame, and nothing on it to cut.
    if (!frame) return null;
    const ink = canvas.current?.inkForReading();
    if (!ink) return null;
    let sticker: SealedSticker | null;
    try {
      // Handing the ink to the sealing worker, or the whole cut where that can't run, holds the main
      // thread a moment: the key's pop and the tools stepping back paint first.
      await afterPaint();
      sticker = await makeSticker(ink, frame.density);
    } finally {
      releaseCanvas(ink);
    }
    if (!sticker) return null;
    const ticketUseId = ticket.current;
    if (ticketUseId === null) {
      sticker.dispose();
      throw new Error("this sheet has no ticket to seal it on");
    }
    const cut = sticker;
    const request = timelapseOf(ops, frame, cut).then((timelapse): SealRequest => ({
      ticketUseId,
      timeUsed,
      width: cut.width,
      height: cut.height,
      outline: cut.outline,
      png: cut.png,
      ...(cut.sharp && { sharp: cut.sharp }),
      mask: cut.mask,
      spec: cut.spec,
      rim: cut.rim,
      flat: cut.flat,
      ...(timelapse && { timelapse }),
      nsfw: marked,
      ...(subjects && { kyotoSeikaSubjects: subjects }),
    }));
    return { sticker: cut, request };
  }

  /**
   * Keep drawing or the shop, from the sealed card: the fresh sheet and clock are set up at once,
   * under the veil, while the card carries the sticker away over them. Its layers go once it's gone.
   */
  function handOver(from: Ceremony) {
    // The reset lets go of the last ceremony's layers; this one's are still on screen.
    if (lastCeremony.current?.id === from.id) lastCeremony.current = null;
    setCeremony((c) => (c?.id === from.id ? { ...c, leaving: true } : c));
    startNewSticker();
  }

  /** The sealed card has left: its sticker's layers are let go. */
  function dropCeremony(gone: Ceremony) {
    setCeremony((c) => (c?.id === gone.id ? null : c));
    gone.sticker.dispose();
  }

  /**
   * A failed seal's ceremony fades back to the drawing, then its layers are let go, unless a retry of
   * the same seal plays them again.
   */
  function dismissCeremony(failed: Ceremony, { keepSticker }: { keepSticker: boolean }) {
    setCeremony((c) => (c?.id === failed.id ? { ...c, failed: true } : c));
    setTimeout(() => {
      setCeremony((c) => (c?.id === failed.id ? null : c));
      if (lastCeremony.current === failed) lastCeremony.current = null;
      if (!keepSticker) failed.sticker.dispose();
    }, LEAVE_MS);
  }

  /**
   * Seals the sheet, or sends again the seal that may have reached the server, which it answers from
   * the ticket use. Any failure lands on the sheet; only one that proves the server holds no seal
   * before 0:00 lets the sheet take ink again.
   */
  async function seal() {
    setPanel(null);
    const timeUsed = Math.min(clock.length / 1000, Math.max(1, Math.round(clock.elapsed / 1000)));
    let sticker: SealedSticker | null = null;
    let request: SealRequest | null = null;
    let shown: Ceremony | null = null;
    let sent = false;
    // A seal sent before, here or before a reload, may have reached the server.
    const heldBefore = sentSeal.current !== null || sealWentOut(me.id, ticket.current);
    try {
      const sheet = sheetBox();
      const again = sentSeal.current;
      let made: Promise<SealRequest>;
      if (again) {
        sticker = again.sticker;
        made = Promise.resolve(again.request);
      } else {
        const cut = await cutFromSheet(timeUsed);
        if (!cut) {
          // Everything drawn was erased or undone. At 0:00 the sheet is spent; before that, draw on.
          if (clock.elapsed >= clock.length) {
            send({ type: "reset" });
            // The fresh sheet says so in the chip, since the reset just cleared it.
            setSealProblem({ message: t(($) => $.stickerCreation.seal.emptyAtTimeUp) });
          } else {
            setSealProblem({ message: t(($) => $.stickerCreation.seal.empty) });
            send({ type: "seal-failed", mayHaveSealed: false, timeUp: false, refused: false });
          }
          return;
        }
        sticker = cut.sticker;
        made = cut.request;
      }
      // The ceremony starts as soon as the sticker is cut, and waits at the cut until the server has
      // sealed it.
      const started: Ceremony = {
        id: ++seals.current,
        sticker,
        sealed: null,
        failed: false,
        leaving: false,
        sheet,
      };
      shown = started;
      lastCeremony.current = started;
      setCeremony(started);
      request = await made;
      sent = true;
      keepSentSeal(me.id, request.ticketUseId);
      const { sticker: sealedSticker } = await api.seal(request);
      sentSeal.current = null;
      forgetSentSeal(me.id);
      ticket.current = null;
      keeper.wipe();
      // The used ticket's stub now carries this sticker's outline.
      tickets.refresh();
      setCeremony((c) => (c?.id === started.id ? { ...c, sealed: sealedSticker } : c));
      send({ type: "sealed" });
      onSealed(sealedSticker.id);
    } catch (error) {
      console.error("Sealing the sticker failed", error);
      const failure = sent ? sealFailure(error) : "unsent";
      if (failure === "refused") sentSeal.current = null;
      else if (failure === "unknown" && sticker && request) sentSeal.current = { request, sticker };
      // One that never left changes nothing: an earlier try may still have reached the server.
      const mayHaveSealed = failure === "unknown" || (failure === "unsent" && heldBefore);
      if (!mayHaveSealed) forgetSentSeal(me.id);
      const held = sentSeal.current?.sticker;
      if (shown) dismissCeremony(shown, { keepSticker: shown.sticker === held });
      else if (sticker !== held) sticker?.dispose();
      const problem = describeSealFailure(error, sent);
      // Only reconnecting LINE renews its sign-in, and that leaves the page: the check does it.
      reconnectOnTap.current = problem.kind === "signInExpired";
      const timeUp = clock.elapsed >= clock.length;
      const refused = failure === "refused";
      setCanStartOver(timeUp && !mayHaveSealed);
      // A refusal at 0:00 resets the sheet, which clears the chip, so the chip is set after it.
      send({ type: "seal-failed", mayHaveSealed, timeUp, refused });
      // The chip says what failed and what to do, with the error's own words under it for a report.
      const { detail } = problemOf(error);
      if (timeUp && refused && problem.kind === "refused") {
        const reason = errorMessage(problem.error);
        setSealProblem({
          message: t(($) => $.stickerCreation.seal.refusedAtTimeUp, { reason }),
          detail,
        });
        return;
      }
      const words =
        problem.kind === "refused"
          ? t(($) => $.stickerCreation.seal.refused, { reason: errorMessage(problem.error) })
          : t(($) => $.stickerCreation.seal.failed[problem.kind]);
      setSealProblem({
        message: timeUp ? t(($) => $.stickerCreation.seal.timeUp, { problem: words }) : words,
        detail,
      });
    }
  }

  const startNewSticker = () => {
    send({ type: "reset" });
    onNewSticker();
  };

  /**
   * Spends a ticket of `kind` on this sheet, unless Draw on the board already spent one for it: that
   * spend is this sheet's whatever kind was asked for, so the sheet never spends a second ticket.
   */
  const start = (kind: TicketKind | null, { asked = true }: { asked?: boolean } = {}) => {
    if (spending) return;
    const spent = tickets.takeSheetSpend();
    const spend = spent ?? (kind && tickets.spend(kind));
    if (!spend) return;
    setSpending(true);
    setRightAway(!asked);
    setStartProblem(null);
    spend.then(
      (use: TicketUse) => {
        setSpending(false);
        setRightAway(false);
        ticket.current = use.id;
        ticketKyotoSeika.current = use.kyotoSeikaPractice;
        // The sheet keeps the clock its ticket was spent with, whatever the switch says later.
        clock.setLength(sessionMs(use.kyotoSeikaPractice));
        send({ type: "start", kyotoSeika: use.kyotoSeikaPractice });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error(`Spending ${spent ? "the sheet's" : `a ${kind}`} ticket failed`, failure);
        setSpending(false);
        setRightAway(false);
        // The server's own English detail is left to the log above: the card says it in the app's language.
        setStartProblem(errorMessage(failure));
        // A refusal says the tickets changed. With no answer, the card goes on offering the spend it
        // tried, whose key a retry sends again.
        const refused = failure.status >= 400 && failure.status < 500;
        if (refused) tickets.refresh();
      },
    );
  };

  /**
   * A daily ticket is never asked for: Draw and Keep drawing spend it at once. A reserve ticket is
   * asked for, unless Draw comes right after a purchase, which chose to spend either.
   */
  const startRightAway = ({ reserve }: { reserve: boolean }) => {
    const kind = tickets.tickets && nextKind(tickets.tickets);
    if (kind === "daily" || (kind === "reserve" && reserve)) start(kind, { asked: false });
  };

  useImperativeHandle(ref, () => ({ startNewSticker, closeDrawers: () => setPanel(null) }));

  /** Keeps the session on this device while it's in progress, so a reload doesn't lose it. */
  const keepProgress = () => {
    const { phase } = latest.current;
    if (phase === "drawing" || phase === "seal-sheet" || phase === "time-up")
      keeper.save(canvas.current?.steps() ?? [], clock.elapsed, canvas.current?.frame() ?? null);
  };
  const keepOnHide = useEffectEvent(keepProgress);
  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === "hidden") keepOnHide();
    };
    const onPageHide = () => keepOnHide();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onPageHide);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onPageHide);
    };
  }, []);

  /** Puts a kept drawing back on the sheet, on its own ticket and in its own color, paused. */
  function putBack(found: Extract<KeptDrawing, { status: "found" }>) {
    // Nothing drawn and no time counted: Start spent the ticket and the clock still waits. In Kyoto
    // Seika Practice Mode only Begin starts it: a sheet whose pair is dealt again waits at its deal,
    // drawing and all.
    const part = found.kyotoSeika;
    const drawn = part ? part.begun : found.steps.length > 0 || found.elapsedMs > 0;
    clock.setLength(sessionMs(part !== null));
    ticketKyotoSeika.current = part !== null;
    if (part) kyotoSeikaSheet.open(found.ticket, part);
    canvas.current?.load(found.steps, found.frame);
    // It keeps its own color rather than the one a fresh sheet would start in.
    const own = keptColor(found.steps);
    if (own) {
      setColor(own);
      startedIn.current = own;
    }
    keeper.resume(
      found.ticket,
      found.steps,
      // A sheet back at its deal draws on a clock Begin starts afresh.
      drawn ? found.elapsedMs : 0,
      found.nsfw,
      found.tools,
      found.kyotoSeika,
    );
    keepNsfw(found.nsfw);
    if (found.tools) {
      setSizes({ brush: found.tools.brushSize, eraser: found.tools.eraserSize });
      setSmoothing(found.tools.smoothing);
    }
    ticket.current = found.ticket;
    // Kept at 0:00, it comes back pencils down, its time's-up sheet up, with nothing to pause.
    const timeUp = drawn && found.elapsedMs >= sessionMs(part !== null);
    send({
      type: "restored",
      drawn,
      sealSent: sealWentOut(me.id, found.ticket),
      dealt: part?.begun === false,
      timeUp,
    });
    if (!drawn) {
      setPickedUp(null);
      return;
    }
    clock.restore(found.elapsedMs);
    if (timeUp) return;
    setPaused(true);
    setPickedUp("restored");
  }

  /**
   * A drawing that can't be put back gives its ticket, which never became a sticker, to a fresh sheet,
   * which seals on it without spending another. `clear`: what's kept of it can't be read back, so it
   * goes; a drawing that wasn't read stays kept, for a read that answers late or the next reload. Its
   * Kyoto Seika Practice Mode part goes with the ticket, which keeps its mode.
   */
  function carryOver(ticketUseId: number, clear: boolean, kyotoSeika: KeptKyotoSeika | null) {
    ticket.current = ticketUseId;
    if (clear) keeper.start(ticketUseId, kyotoSeika);
    else keeper.carry(ticketUseId, kyotoSeika);
    clock.setLength(sessionMs(kyotoSeika !== null));
    ticketKyotoSeika.current = kyotoSeika !== null;
    if (kyotoSeika) kyotoSeikaSheet.open(ticketUseId, kyotoSeika);
    // A begun pair stays locked in on the fresh sheet, whose clock waits for the first stroke.
    const dealt = kyotoSeika !== null && !kyotoSeika.begun;
    send({ type: "restored", drawn: false, sealSent: false, dealt, timeUp: false });
    setPickedUp("carried");
  }

  // A drawing not read whose seal went out: the server may hold the seal, so a new drawing on its
  // ticket could be answered with the old sticker. The sheet stays locked until the drawing is read
  // or the tickets show what became of the seal. `reading`: a late read may still bring the drawing.
  const unsettled = useRef<{
    ticket: number;
    reading: boolean;
    clear: boolean;
    kyotoSeika: KeptKyotoSeika | null;
  } | null>(null);
  const [sealUnsettled, setSealUnsettled] = useState(false);
  const unsettle = (next: typeof unsettled.current) => {
    unsettled.current = next;
    setSealUnsettled(next !== null);
  };
  const lateReadDeadline = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(lateReadDeadline.current), []);

  // A session kept across a reload comes back without asking for another ticket, a drawing on it
  // paused; one that can't be read gives its ticket back.
  const pickUp = useEffectEvent((kept: KeptSession) => {
    const notRead = kept.status === "unread" || kept.status === "lost";
    if (notRead && kept.ticket !== null && sealWentOut(me.id, kept.ticket)) {
      console.error(
        "The drawing in progress wasn't read after a reload, and its seal had gone out, so its sheet waits for the drawing or the tickets",
        kept.error,
      );
      const reading = kept.status === "unread" && kept.later !== null;
      unsettle({
        ticket: kept.ticket,
        reading,
        clear: kept.status === "lost",
        kyotoSeika: kept.kyotoSeika,
      });
      if (tickets.tickets) settleSentSeal(tickets.tickets);
      // A read that never answers mustn't hold the sheet for good: past a second wait, the tickets say.
      if (reading) {
        const sentTicket = kept.ticket;
        lateReadDeadline.current = setTimeout(() => stopWaitingOnRead(sentTicket), LOAD_TIMEOUT_MS);
      }
      return;
    }
    setRestoring(false);
    if (kept.status === "none") return;
    if (kept.status === "found") {
      putBack(kept);
      return;
    }
    if (kept.status === "unread") {
      console.error(
        "The drawing in progress wasn't read after a reload, so its ticket carries over and it stays kept",
        kept.error,
      );
      carryOver(kept.ticket, false, kept.kyotoSeika);
      return;
    }
    console.error("The drawing in progress couldn't be picked up after a reload", kept.error);
    if (kept.ticket !== null) {
      carryOver(kept.ticket, true, kept.kyotoSeika);
      return;
    }
    keeper.wipe();
    setPickedUp("lost");
  });
  const settleSentSeal = useEffectEvent((loaded: Tickets) => {
    const waiting = unsettled.current;
    if (!waiting) return;
    const outcome = sentSealOutcome(waiting.ticket, loaded);
    if (outcome === null && waiting.reading) return;
    unsettle(null);
    setRestoring(false);
    forgetSentSeal(me.id);
    if (outcome === "unsealed") {
      carryOver(waiting.ticket, waiting.clear, waiting.kyotoSeika);
      return;
    }
    // Sealed, the sticker is on the board. Not one of today's uses, the tickets can't say whether it
    // was, and a ticket carried over could seal the next drawing as the old sticker: it's dropped.
    keeper.wipe();
    if (outcome === null)
      console.error(
        `Ticket use ${waiting.ticket}'s seal went out before a reload and the drawing can't be read, so its ticket is dropped`,
      );
    setPickedUp(outcome === "sealed" ? "sealed" : "lost");
  });
  const stopWaitingOnRead = useEffectEvent((sentTicket: number) => {
    const waiting = unsettled.current;
    if (!waiting?.reading || waiting.ticket !== sentTicket) return;
    console.error(
      `Ticket use ${sentTicket}'s drawing still hasn't been read, so the tickets say what became of its seal`,
    );
    unsettle({ ...waiting, reading: false });
    if (tickets.tickets) settleSentSeal(tickets.tickets);
  });
  useEffect(() => {
    const loaded = tickets.tickets;
    if (!loaded) return;
    // Settled once this render is on screen, like the spend at once below.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) settleSentSeal(loaded);
    });
    return () => {
      cancelled = true;
    };
  }, [tickets.tickets]);
  // A read that answers late still puts the drawing back, while the sheet its ticket carried over to
  // has nothing drawn on it, or while its sent seal waits on it.
  const pickUpLate = useEffectEvent((late: KeptDrawing) => {
    const waiting = unsettled.current;
    if (waiting && late.ticket === waiting.ticket) {
      if (late.status === "found") {
        unsettle(null);
        setRestoring(false);
        // It comes back locked, for the seal key, since its seal went out.
        putBack(late);
        return;
      }
      console.error(
        "The drawing in progress couldn't be read, so the tickets say what became of its seal",
        late.error,
      );
      unsettle({ ...waiting, reading: false, clear: late.status === "lost" });
      if (tickets.tickets) settleSentSeal(tickets.tickets);
      return;
    }
    if (latest.current.phase !== "primed" || late.ticket !== ticket.current) {
      console.warn("The drawing in progress was read after its sheet moved on, so it's dropped");
      return;
    }
    if (late.status === "found") putBack(late);
    else if (late.status === "lost") {
      console.error("The drawing in progress can't be picked up", late.error);
      keeper.start(late.ticket, late.kyotoSeika);
    } else console.error("The drawing in progress couldn't be read", late.error);
  });
  useEffect(() => {
    let cancelled = false;
    void loadKeptSession(me.id).then((kept) => {
      if (cancelled) return;
      pickUp(kept);
      if (kept.status === "unread")
        void kept.later?.then((late) => {
          if (!cancelled) pickUpLate(late);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [me.id]);

  // "Picked up" stays until the clock runs again; word of a lost drawing, or of a carried-over
  // ticket, until the first stroke.
  const dealt = session.phase === "dealt";
  // Begin locked the pair in: it prints in the sheet's corner, under the ink.
  const lockedPair = kyotoSeikaSheet.pair;
  const canvasName = useCanvasName(lockedPair);
  const waiting = session.phase === "blank" || session.phase === "primed" || dealt;
  if (pickedUp === "restored" && !paused) setPickedUp(null);
  if (pickedUp !== null && pickedUp !== "restored" && !waiting) setPickedUp(null);
  if (startsNote && !waiting) setStartsNote(false);
  // Undo can take the sheet back to blank under an open clear bar, which then has nothing to clear.
  if (panel === "clear" && !history.hasInk) setPanel(null);

  // As in the real test, a begun sheet in Kyoto Seika Practice Mode never pauses: neither a tap nor a
  // tool in hand holds its clock, only an interruption: a hidden page, the board over it, a reload.
  const pausable = !kyotoSeikaSheet.begun;

  // Before the first stroke there's nothing to pause: a tap on the timer says when it starts. A clock
  // that never pauses says why, though a reload's pause still lets go at a tap.
  const onTimerTap = () => {
    if (clock.getView().waiting) {
      setPickedUp(null);
      setStartsNote(true);
    } else if (!pausable && !paused) timer.current?.showClockRuns();
    else setPaused((p) => !p);
  };

  // Every hold stops the clock: the person's pause, the board or the upright cover over the screen,
  // the seal sheet, a tool in hand.
  const sealSheet = session.phase === "seal-sheet";
  const sideways = useSideways();
  useEffect(() => {
    clock.setHolds({
      paused,
      away: !active || sideways,
      seal: pausable && sealSheet,
      color: pausable && panel === "color",
      smoothing: pausable && panel === "smoothing",
      clear: pausable && panel === "clear",
      size: pausable && sizing,
    });
  }, [clock, paused, active, sideways, sealSheet, panel, sizing, pausable]);

  // Out of tickets: the card comes up as Draw opens on a fresh sheet, and stays until the person picks
  // a way on, even if tickets come back meanwhile.
  const fresh = session.phase === "blank" && !restoring;
  const loaded = tickets.tickets;
  // A spend whose answer never came may have landed: its kept key gets back the ticket use it spent.
  const keptSpend = tickets.hasKeptSpend();
  // The last ticket, spent by Draw on the board or on its way here, isn't a reason for the card.
  const spentForSheet = spending || tickets.hasSheetSpend() || keptSpend;
  if (active && fresh && loaded && ticketsLeft(loaded) === 0 && !overlay && !spentForSheet)
    setOverlay("out");
  const paywall = active && fresh && overlay !== null;
  // A fresh sheet takes no ink until its ticket is spent.
  const asking = active && fresh && !paywall;
  // A daily ticket is spent at once, with no card: the one Draw spent on the board, or one spent now.
  // The card asks only before a reserve ticket is spent, or says why a spend failed and tries again.
  const next = loaded && nextKind(loaded);
  const spendAtOnce = useEffectEvent(() => {
    if (tickets.hasSheetSpend()) start(null, { asked: false });
    else if (startProblem) return;
    // With none left, sending a kept key again can only get back the ticket use it spent.
    else if (next === "daily" || (next === null && keptSpend)) start("daily", { asked: false });
  });
  useEffect(() => {
    if (!asking || !loaded || spending) return;
    // The spend goes to the server once this render is on screen; its busy state is a render of its own.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) spendAtOnce();
    });
    return () => {
      cancelled = true;
    };
  }, [asking, loaded, spending, startProblem]);
  const asks =
    (next === "reserve" && !tickets.hasSheetSpend()) ||
    startProblem !== null ||
    (spending && !rightAway);
  // Once its ticket is spent, the ask drops away over the sheet, showing the tickets it asked about:
  // the spend it answers mustn't turn it into another ask on its way out. When the shop takes its
  // place, or the board covers it, it simply goes: the next card's rise carries that change.
  const ask = asking && !rightAway && asks ? loaded : null;
  const [askShown, setAskShown] = useState<Tickets | null>(null);
  if (ask && askShown !== ask) setAskShown(ask);
  if (!ask && askShown && (!active || paywall)) setAskShown(null);
  const sealing = session.phase === "sealing" || session.phase === "sealed";
  const retrying = session.phase === "retry";
  const timeUp = session.phase === "time-up";
  // Until Start, and while a kept session loads, the sheet takes no ink; nor under the seal sheet, nor
  // once it's sealing.
  const locked = !active || session.phase === "blank" || sealSheet || timeUp || sealing || retrying;

  // On the first few visits, a started sheet says the timer waits for the first stroke, which peels it off.
  const startsLabel =
    startsNote || (active && (session.phase === "primed" || dealt) && isFirstVisit());
  const timerNote = !kept
    ? t(($) => $.stickerCreation.timer.note.notKept)
    : pickedUp === "restored"
      ? t(($) => $.stickerCreation.timer.note.pickedUp)
      : pickedUp === "carried"
        ? t(($) => $.stickerCreation.timer.note.ticketCarriesOver)
        : pickedUp === "sealed"
          ? t(($) => $.stickerCreation.timer.note.sealedBeforeReload)
          : pickedUp === "lost"
            ? t(($) => $.stickerCreation.timer.note.lost)
            : startsLabel
              ? dealt
                ? t(($) => $.stickerCreation.timer.note.startsWhenYouPressBegin)
                : t(($) => $.stickerCreation.timer.note.startsWhenYouDraw)
              : null;

  // Tells the sticker board what Draw means for this sheet: a fresh one spends a ticket (after a seal,
  // Draw starts one), while a drawing in progress, or a spend on its way, already has one.
  const sheet =
    restoring || !tickets.tickets
      ? null
      : (session.phase === "blank" && !spending) || session.phase === "sealed"
        ? "fresh"
        : "held";
  const { setSheet } = tickets;
  useEffect(() => setSheet(sheet), [setSheet, sheet]);
  useEffect(() => () => setSheet(null), [setSheet]);

  const sizeKey = tool === "eraser" ? "eraser" : "brush";
  const setSize = (value: number) => setSizes((s) => ({ ...s, [sizeKey]: value }));
  const pickTool = (next: Tool) => {
    setTool(next);
    setPanel(null);
  };
  const pickColor = (hex: string) => {
    setColor(hex);
    if (tool === "eraser") setTool("brush");
  };
  // The clock, the ticket and the tools carry on, and undo brings the drawing back, so focus goes there.
  const clearSheet = () => {
    undoTile.current?.focus({ preventScroll: true });
    setPanel(null);
    canvas.current?.clear();
    setSealProblem(null);
  };

  useShortcuts({
    enabled: !locked && !dealt,
    undo: () => canvas.current?.undo(),
    redo: () => canvas.current?.redo(),
    setTool: pickTool,
    stepSize: (direction) => setSize(clamp01(sizes[sizeKey] + direction * SIZE_STEP)),
    closePanel: () => setPanel(null),
  });

  // A tap anywhere but an open panel or its tile closes the panel: the bars always, and the color sheet
  // where it's a popover, since a bottom sheet covers what's around it. The sheet is left to the ink
  // engine, which closes it and swallows the tap: closing it here first would let the tap draw.
  const closePanelOutside = (e: ReactPointerEvent) => {
    const open =
      panel === "smoothing"
        ? smoothingBarId
        : panel === "clear"
          ? clearBarId
          : panel === "color" && large
            ? colorSheetId
            : null;
    if (!open || !(e.target instanceof Element)) return;
    const own = `#${CSS.escape(open)}, [aria-controls="${open}"], .ink-sheet, .color-sheet`;
    if (!e.target.closest(own)) setPanel(null);
  };

  return (
    <div
      ref={root}
      className={`drawing-screen ${sealing ? "is-sealing" : ""} ${retrying ? "is-retrying" : ""} ${timeUp ? "is-time-up" : ""} ${dealt ? "is-dealt" : ""} ${dealLeaving ? "is-deal-leaving" : ""}`}
      data-hand={hand}
      style={{ "--draw-color": color }}
      // It stays mounted under the board so a sticker in progress survives; covered, it takes no focus.
      inert={!active}
      onPointerDownCapture={closePanelOutside}
    >
      <DrawingCanvas
        ref={canvas}
        active={active}
        under={lockedPair && <CornerPrint subjects={lockedPair} />}
        label={canvasName}
        settings={{
          tool,
          color,
          size: sizePx(sizes[sizeKey]),
          smoothing,
          locked,
          // The dealt sheet takes the paused sheet's path, so a touch nudges Begin.
          paused: paused || dealt,
          panelOpen: panel !== null,
          inputMode,
          penPressure,
          sessionMs: () => clock.elapsed,
        }}
        onHistory={(next) => {
          setHistory((h) =>
            h.canUndo === next.canUndo && h.canRedo === next.canRedo && h.hasInk === next.hasInk
              ? h
              : next,
          );
          keepProgress();
        }}
        onCommit={(op: Op) => {
          if (sealProblem) setSealProblem(null);
          send({ type: "ink" });
          if (op.tool === "brush") setRecent((r) => withRecent(r, op.color));
        }}
        onBlocked={() => {
          if (dealt) begin.current?.nudge();
          timer.current?.showHint();
        }}
        onDismissPanel={() => setPanel(null)}
        onPen={penDrew}
        onFit={setSheetScale}
      />
      <div className="drawing-top">
        <TimerDot
          ref={timer}
          clock={clock}
          paused={paused}
          note={active ? timerNote : null}
          waitsFor={session.phase === "dealt" ? "begin" : "stroke"}
          pausable={pausable}
          onToggle={onTimerTap}
        />
        <ToolStrip
          tool={tool}
          panel={panel}
          canClear={history.hasInk}
          colorSheetId={colorSheetId}
          smoothingBarId={smoothingBarId}
          clearBarId={clearBarId}
          onTool={pickTool}
          onPanel={setPanel}
          inputMode={inputMode}
          onInputMode={setSheetInputMode}
        />
      </div>
      {/* A deal on its way out finishes leaving even under the board, so it never plays again. */}
      {((active && dealt) || dealLeaving) && (
        <KyotoSeikaDeal
          screen={root}
          list={kyotoSeikaSheet.list}
          seed={kyotoSeikaSheet.seed}
          deal={kyotoSeikaSheet.deal}
          minutes={clock.length / 60_000}
          begin={begin}
          onRoll={kyotoSeikaSheet.roll}
          onPick={kyotoSeikaSheet.pick}
          onBegin={() =>
            send({
              type: "begin",
              hasPair: kyotoSeikaSheet.deal !== null && pickedPair(kyotoSeikaSheet.deal) !== null,
            })
          }
          leaving={dealLeaving}
          onLeft={() => setDealLeaving(false)}
        />
      )}
      <ColorSheet
        id={colorSheetId}
        open={panel === "color"}
        layer={root}
        color={color}
        recent={recent}
        onPick={pickColor}
        onPreview={(hex) => root.current?.style.setProperty("--draw-color", hex)}
        onClose={() => setPanel(null)}
      />
      <SmoothingBar
        id={smoothingBarId}
        open={panel === "smoothing"}
        value={smoothing}
        onChange={setSmoothing}
      />
      <ClearBar
        id={clearBarId}
        open={panel === "clear"}
        onClear={clearSheet}
        onClose={() => setPanel(null)}
      />
      <SizeRail
        value={sizes[sizeKey]}
        eraser={tool === "eraser"}
        active={sizing}
        scale={sheetScale}
        onChange={setSize}
        onHold={setSizing}
      />
      <HistoryButtons
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        undoRef={undoTile}
        onUndo={() => canvas.current?.undo()}
        onRedo={() => canvas.current?.redo()}
      />
      <MyBoardTile onOpen={onMyBoardTile} />
      <SealKey
        // The seal sheet's Seal is the screen's one key while it's up.
        shown={retrying || (history.hasInk && !sealing && !sealSheet && !timeUp)}
        problem={
          sealProblem?.message ?? (retrying ? t(($) => $.stickerCreation.seal.interrupted) : null)
        }
        detail={sealProblem?.detail}
        onTap={() => {
          setSealProblem(null);
          if (sealProblem && reconnectOnTap.current) {
            // The drawing is kept on this device, and the drawing screen picks it back up.
            // Still here after a failed reconnect: the chip says why, and the check tries it again.
            retryPrivySignIn(new URL("/draw", location.href).href, (failure) =>
              setSealProblem({
                message: t(($) => $.stickerCreation.seal.refused, {
                  reason: errorMessage(failure),
                }),
                detail: errorDetail(failure),
              }),
            );
            return;
          }
          send({ type: "seal-tap", hasInk: history.hasInk });
        }}
      />
      <SealSheet
        open={active && (sealSheet || timeUp)}
        timeUp={timeUp}
        nsfw={nsfwOn}
        subjects={lockedPair}
        ink={readInk}
        onNsfwChange={(on) => {
          keepNsfw(on);
          keeper.keepNsfw(on);
        }}
        onSeal={() => send({ type: "seal" })}
        onNotYet={() => send({ type: "not-yet" })}
      />
      {retrying && canStartOver && (
        <QuietLink
          className="drawing-start-over keep-phrases"
          onClick={() => send({ type: "reset" })}
        >
          {t(($) => $.stickerCreation.seal.startOver)}
        </QuietLink>
      )}
      {/* A card on its way out finishes leaving even under the board, so it never plays again. */}
      {ceremony && (active || ceremony.leaving) && (
        <SealCeremony
          key={ceremony.id}
          sticker={ceremony.sticker}
          sealed={ceremony.sealed}
          failed={ceremony.failed}
          leaving={ceremony.leaving}
          onLeft={() => dropCeremony(ceremony)}
          sheet={ceremony.sheet}
          onKeepDrawing={() => {
            handOver(ceremony);
            startRightAway({ reserve: false });
          }}
          onBoard={onGoToBoard}
          onShop={() => {
            setOverlay("shop");
            handOver(ceremony);
          }}
        />
      )}
      <SealingStatusLabel waiting={active && session.phase === "sealing"} />
      {/* A sheet waiting to learn what became of its sent seal needs the tickets too. */}
      {(asking || (active && sealUnsettled)) && !loaded && (
        <TicketsNotLoaded error={tickets.error} onRetry={tickets.refresh} onBoard={onGoToBoard} />
      )}
      {askShown && (
        <StartDrawing
          tickets={askShown}
          minutes={sessionMs(me.kyotoSeikaPractice) / 60_000}
          followsSealedCard={ceremony?.leaving === true}
          leaving={!ask}
          onLeft={() => setAskShown(null)}
          busy={spending}
          failure={startProblem}
          onStart={(kind) => start(kind)}
          onShop={() => setOverlay("shop")}
          onBoard={onGoToBoard}
        />
      )}
      {paywall && loaded && overlay === "out" && (
        <OutOfTickets
          tickets={loaded}
          onShop={() => setOverlay("shop")}
          onStartDrawing={() => {
            setOverlay(null);
            startRightAway({ reserve: false });
          }}
          onBoard={() => {
            setOverlay(null);
            onGoToBoard();
          }}
        />
      )}
      {/* Leaving the checkout with no tickets brings the out-of-tickets card back; with some, the start screen. */}
      {paywall && overlay === "shop" && (
        <ReserveTicketCheckout
          onDraw={() => {
            setOverlay(null);
            startRightAway({ reserve: true });
          }}
          onClose={() => setOverlay(null)}
        />
      )}
    </div>
  );
}
