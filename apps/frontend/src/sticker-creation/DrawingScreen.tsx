import {
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
import { useMyAgeStatus } from "../identity/useMyAgeStatus";
import type { Sticker, TicketUse } from "@drawing-app/api/client";
import { ApiError, apiError } from "../api/apiClient";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { errorReason } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { OutOfTickets } from "../tickets/OutOfTickets";
import { StartDrawing } from "../tickets/StartDrawing";
import { nextKind, ticketsLeft, type TicketKind, type Tickets } from "../tickets/tickets";
import { ReserveTicketCheckout } from "../tickets/ReserveTicketCheckout";
import { TicketsNotLoaded } from "../tickets/TicketsNotLoaded";
import { useTickets } from "../tickets/useTickets";
import { useToast } from "../ui/useToast";
import { sizePx } from "./canvas/brush";
import { DrawingCanvas, type DrawingCanvasHandle } from "./canvas/DrawingCanvas";
import { isFirstVisit } from "./drawVisits";
import { lazyRadius } from "./canvas/lazyBrush";
import type { Op, Tool } from "./canvas/ops";
import { NsfwToggle } from "./NsfwToggle";
import { SealKey } from "./SealKey";
import { makeSticker, type SealedSticker } from "./sealing/makeSticker";
import { SealCeremony } from "./sealing/SealCeremony";
import { SealingStatusLabel } from "./sealing/SealingStatusLabel";
import { LEAVE_MS, type Box } from "./sealing/sealTimeline";
import { encodeTimelapse, gzipTimelapse } from "./sealing/timelapse";
import { keptColor, loadKeptSession, SessionKeeper, type KeptSession } from "./session/keptSession";
import {
  ARM_WINDOW_MS,
  FRESH_SESSION,
  SESSION_MS,
  transition,
  type SessionEffect,
  type SessionEvent,
} from "./session/session";
import { useSessionClock } from "./session/useSessionClock";
import { TimerDot, type TimerDotHandle } from "./TimerDot";
import { ColorSheet } from "./tools/ColorSheet";
import { HistoryButtons } from "./tools/HistoryButtons";
import { FIRST_RECENT, startingColor, withRecent } from "./tools/palette";
import { SizeRail } from "./tools/SizeRail";
import { SmoothingBar } from "./tools/SmoothingBar";
import { ToolStrip, type Panel } from "./tools/ToolStrip";
import { useShortcuts } from "./useShortcuts";
import "./DrawingScreen.css";

/** Where the size rail starts for each tool, remembered per tool from then on. */
const FIRST_SIZES = { brush: 0.34, eraser: 0.52 };
const FIRST_SMOOTHING = 30;
/** How far [ and ] move the size rail. */
const SIZE_STEP = 0.04;

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const afterPaint = () =>
  new Promise<void>((resolve) => requestAnimationFrame(() => setTimeout(resolve)));
const reason = (error: unknown) =>
  error instanceof Error && error.message ? error.message : String(error);

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
}

/**
 * The drawing screen: a white sheet on the Liner, the timer and the tools in one row across the top,
 * the size rail down the left edge, undo and redo at the bottom left and the seal key at the bottom
 * right. It owns the session (tickets, the clock and the seal step); the ink engine owns the drawing.
 */
export function DrawingScreen({ ref, active, onSealed, onNewSticker, onGoToBoard }: Props) {
  const { t } = useTranslation();
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<DrawingCanvasHandle>(null);
  const timer = useRef<TimerDotHandle>(null);
  const api = useApi();
  const tickets = useTickets();
  const me = useMe();
  const toast = useToast();
  const colorSheetId = useId();
  const smoothingBarId = useId();

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
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [session, setSession] = useState(FRESH_SESSION);
  // Transitions start from here, so one sent after an await still starts from the latest session.
  const latest = useRef(FRESH_SESSION);
  const [ceremony, setCeremony] = useState<Ceremony | null>(null);
  // The sealed sticker's layers are let go when a fresh sheet replaces it, or once its card has left.
  const lastCeremony = useRef<Ceremony | null>(null);
  const seals = useRef(0);
  const [sealProblem, setSealProblem] = useState<string | null>(null);
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
  const [keeper] = useState(() => new SessionKeeper());
  // Until a session kept across a reload is back, or known lost, Draw doesn't ask for a ticket.
  const [restoring, setRestoring] = useState(true);
  // The 18+ switch; the seal reads the ref, since it runs from the clock's time-up too.
  const [nsfwOn, setNsfwOn] = useState(false);
  const nsfw = useRef(false);
  const adult = useMyAgeStatus() === "adult";
  const keepNsfw = (on: boolean) => {
    nsfw.current = on;
    setNsfwOn(on);
  };
  const [pickedUp, setPickedUp] = useState<"restored" | "lost" | "carried" | null>(null);
  // A tap on the waiting timer puts "Starts when you draw" under it, until the first stroke.
  const [startsNote, setStartsNote] = useState(false);

  const clock = useSessionClock(() => send({ type: "time-up" }));

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
        keeper.start(ticket.current);
        return;
      case "start-clock":
        clock.start();
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
        clock.reset();
        keeper.wipe();
        ticket.current = null;
        setPickedUp(null);
        setPaused(false);
        setPanel(null);
        lastCeremony.current?.sticker.dispose();
        lastCeremony.current = null;
        // A sealed card handing over to this sheet stays up until it has left.
        setCeremony((c) => (c?.leaving ? c : null));
        setSealProblem(null);
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
  async function timelapseOf(sticker: SealedSticker, ink: HTMLCanvasElement) {
    try {
      const ops = canvas.current?.ops() ?? [];
      const density = canvas.current?.inkDensity() ?? 1;
      return await gzipTimelapse(encodeTimelapse({ ops, ink, place: sticker.place, density }));
    } catch (error) {
      console.error("The timelapse couldn’t be made, so the sticker seals without it", error);
      return null;
    }
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

  /** A failed seal's ceremony fades back to the drawing, then its layers are let go. */
  function dismissCeremony(failed: Ceremony) {
    setCeremony((c) => (c?.id === failed.id ? { ...c, failed: true } : c));
    setTimeout(() => {
      setCeremony((c) => (c?.id === failed.id ? null : c));
      if (lastCeremony.current === failed) lastCeremony.current = null;
      failed.sticker.dispose();
    }, LEAVE_MS);
  }

  async function seal() {
    setPanel(null);
    canvas.current?.finishStroke();
    const ink = canvas.current?.inkForReading() ?? null;
    const timeUsed = Math.min(SESSION_MS / 1000, Math.max(1, Math.round(clock.elapsed / 1000)));
    let sticker: SealedSticker | null = null;
    let shown: Ceremony | null = null;
    try {
      const sheet = sheetBox();
      // Handing the ink to the sealing worker, or the whole cut where that can't run, holds the main
      // thread a moment: the key's pop and the tools stepping back paint first.
      await afterPaint();
      sticker = ink && (await makeSticker(ink));
      if (!sticker) {
        // Everything drawn was erased or undone. At 0:00 the sheet is spent; before that, draw on.
        if (clock.elapsed >= SESSION_MS) {
          toast(t(($) => $.stickerCreation.seal.emptyAtTimeUp));
          send({ type: "reset" });
        } else {
          setSealProblem(t(($) => $.stickerCreation.seal.empty));
          send({ type: "seal-failed" });
        }
        return;
      }
      if (ticket.current === null) throw new Error("this sheet has no ticket to seal it on");
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
      const timelapse = ink && (await timelapseOf(sticker, ink));
      const { sticker: sealedSticker } = await api.seal({
        ticketUseId: ticket.current,
        timeUsed,
        width: sticker.width,
        height: sticker.height,
        outline: sticker.outline,
        png: sticker.png,
        mask: sticker.mask,
        spec: sticker.spec,
        rim: sticker.rim,
        flat: sticker.flat,
        ...(timelapse && { timelapse }),
        nsfw: nsfw.current,
      });
      ticket.current = null;
      keeper.wipe();
      // The used ticket's stub now carries this sticker's outline.
      tickets.refresh();
      setCeremony((c) => (c?.id === started.id ? { ...c, sealed: sealedSticker } : c));
      send({ type: "sealed" });
      onSealed(sealedSticker.id);
    } catch (error) {
      if (shown) dismissCeremony(shown);
      else sticker?.dispose();
      console.error("Sealing the sticker failed", error);
      // Only reconnecting LINE renews its sign-in, and that leaves the page: the check does it.
      reconnectOnTap.current = error instanceof ApiError && error.code === "line_token_expired";
      setSealProblem(
        reconnectOnTap.current
          ? t(($) => $.stickerCreation.seal.reconnect)
          : error instanceof ApiError
            ? t(($) => $.stickerCreation.seal.failed, { reason: errorReason(error) })
            : t(($) => $.stickerCreation.seal.failedHere, { reason: reason(error) }),
      );
      send({ type: "seal-failed" });
    }
  }

  const startNewSticker = () => {
    send({ type: "reset" });
    onNewSticker();
  };

  /** Spends a ticket of `kind` on this sheet, or takes `spent`, the one Draw already spent on the board. */
  const start = (
    kind: TicketKind | null,
    { asked = true, spent }: { asked?: boolean; spent?: Promise<TicketUse> } = {},
  ) => {
    if (spending) return;
    const spend = spent ?? (kind && tickets.spend(kind));
    if (!spend) return;
    setSpending(true);
    setRightAway(!asked);
    setStartProblem(null);
    spend.then(
      (use) => {
        setSpending(false);
        setRightAway(false);
        ticket.current = use.id;
        send({ type: "start" });
      },
      (error: unknown) => {
        const failure = apiError(error);
        console.error(`Spending a ${kind ?? "sheet's"} ticket failed`, failure);
        setSpending(false);
        setRightAway(false);
        setStartProblem(
          t(($) => $.stickerCreation.startNote.ticketFailed, { reason: errorReason(failure) }),
        );
        tickets.refresh();
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
    if (phase === "drawing" || phase === "armed")
      keeper.save(canvas.current?.ops() ?? [], clock.elapsed);
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

  // A session kept across a reload comes back without asking for another ticket, a drawing on it
  // paused; one that can't be read gives its ticket back.
  const pickUp = useEffectEvent((kept: KeptSession) => {
    setRestoring(false);
    if (kept.status === "none") return;
    if (kept.status === "found") {
      // Nothing drawn and no time counted: Start spent the ticket and the clock still waits.
      const drawn = kept.ops.length > 0 || kept.elapsedMs > 0;
      canvas.current?.load(kept.ops);
      // It keeps its own color rather than the one a fresh sheet would start in.
      const own = keptColor(kept.ops);
      if (own) {
        setColor(own);
        startedIn.current = own;
      }
      keeper.resume(kept.ticket, kept.ops, kept.elapsedMs, kept.nsfw);
      keepNsfw(kept.nsfw);
      ticket.current = kept.ticket;
      send({ type: "restored", drawn });
      if (!drawn) return;
      clock.restore(kept.elapsedMs);
      setPaused(true);
      setPickedUp("restored");
      return;
    }
    console.error("The drawing in progress couldn't be picked up after a reload", kept.error);
    // Its ticket never became a sticker, so a fresh sheet seals on it without spending another.
    if (kept.ticket !== null) {
      ticket.current = kept.ticket;
      keeper.start(kept.ticket);
      send({ type: "restored", drawn: false });
      setPickedUp("carried");
      return;
    }
    keeper.wipe();
    setPickedUp("lost");
  });
  useEffect(() => {
    let cancelled = false;
    void loadKeptSession().then((kept) => {
      if (!cancelled) pickUp(kept);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // "Picked up" stays until the clock runs again; word of a lost drawing, or of a carried-over
  // ticket, until the first stroke.
  const waiting = session.phase === "blank" || session.phase === "primed";
  if (pickedUp === "restored" && !paused) setPickedUp(null);
  if ((pickedUp === "lost" || pickedUp === "carried") && !waiting) setPickedUp(null);
  if (startsNote && !waiting) setStartsNote(false);

  // Before the first stroke there's nothing to pause: a tap on the timer says when it starts.
  const onTimerTap = () => {
    if (!clock.getView().waiting) {
      setPaused((p) => !p);
      return;
    }
    setPickedUp(null);
    setStartsNote(true);
  };

  // Every hold stops the clock: the person's pause, the board covering the screen, a tool in hand.
  useEffect(() => {
    clock.setHolds({
      paused,
      away: !active,
      color: panel === "color",
      smoothing: panel === "smoothing",
      size: sizing,
    });
  }, [clock, paused, active, panel, sizing]);

  const expireArm = useEffectEvent(() => send({ type: "arm-expired", now: performance.now() }));
  useEffect(() => {
    if (session.phase !== "armed") return;
    const id = setTimeout(() => expireArm(), ARM_WINDOW_MS);
    return () => clearTimeout(id);
  }, [session]);

  // Out of tickets: the card comes up as Draw opens on a fresh sheet, and stays until the person picks
  // a way on, even if tickets come back meanwhile.
  const fresh = session.phase === "blank" && !restoring;
  const loaded = tickets.tickets;
  // The last ticket, spent by Draw on the board or on its way here, isn't a reason for the card.
  const spentForSheet = spending || tickets.hasSheetSpend();
  if (active && fresh && loaded && ticketsLeft(loaded) === 0 && !overlay && !spentForSheet)
    setOverlay("out");
  const paywall = active && fresh && overlay !== null;
  // A fresh sheet takes no ink until its ticket is spent.
  const asking = active && fresh && !paywall;
  // A daily ticket is spent at once, with no card: the one Draw spent on the board, or one spent now.
  // The card asks only before a reserve ticket is spent, or says why a spend failed and tries again.
  const next = loaded && nextKind(loaded);
  const spendAtOnce = useEffectEvent(() => {
    const spent = tickets.takeSheetSpend();
    if (spent) start(null, { asked: false, spent });
    else if (next === "daily") start("daily", { asked: false });
  });
  useEffect(() => {
    if (!asking || !loaded || spending || startProblem) return;
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
  // Until Start, and while a kept session loads, the sheet takes no ink.
  const locked = !active || session.phase === "blank" || sealing;

  // On the first few visits, a started sheet says the timer waits for the first stroke, which peels it off.
  const startsLabel = startsNote || (active && session.phase === "primed" && isFirstVisit());
  const timerNote =
    pickedUp === "restored"
      ? t(($) => $.stickerCreation.timer.note.pickedUp)
      : pickedUp === "carried"
        ? t(($) => $.stickerCreation.timer.note.ticketCarriesOver)
        : pickedUp === "lost"
          ? t(($) => $.stickerCreation.timer.note.lost)
          : startsLabel
            ? t(($) => $.stickerCreation.timer.note.startsWhenYouDraw)
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

  useShortcuts({
    enabled: !locked,
    undo: () => canvas.current?.undo(),
    redo: () => canvas.current?.redo(),
    setTool: pickTool,
    stepSize: (direction) => setSize(clamp01(sizes[sizeKey] + direction * SIZE_STEP)),
    closePanel: () => setPanel(null),
  });

  // A tap anywhere but the bar or its button closes the smoothing bar. The sheet closes it as well,
  // and swallows the tap.
  const closeSmoothingOutside = (e: ReactPointerEvent) => {
    if (panel !== "smoothing" || !(e.target instanceof Element)) return;
    const own = `#${CSS.escape(smoothingBarId)}, [aria-controls="${smoothingBarId}"]`;
    if (!e.target.closest(own)) setPanel(null);
  };

  return (
    <div
      ref={root}
      className={`drawing-screen ${sealing ? "is-sealing" : ""}`}
      style={{ "--draw-color": color }}
      // It stays mounted under the board so a sticker in progress survives; covered, it takes no focus.
      inert={!active}
      onPointerDownCapture={closeSmoothingOutside}
    >
      <DrawingCanvas
        ref={canvas}
        active={active}
        settings={{
          tool,
          color,
          size: sizePx(sizes[sizeKey]),
          lazyRadius: lazyRadius(smoothing),
          locked,
          paused,
          panelOpen: panel !== null,
          armed: session.phase === "armed",
          sessionMs: () => clock.elapsed,
        }}
        onHistory={(canUndo, canRedo) => {
          setHistory((h) =>
            h.canUndo === canUndo && h.canRedo === canRedo ? h : { canUndo, canRedo },
          );
          keepProgress();
        }}
        onCommit={(op: Op) => {
          if (sealProblem) setSealProblem(null);
          send({ type: "ink" });
          if (op.tool === "brush") setRecent((r) => withRecent(r, op.color));
        }}
        onBlocked={() => timer.current?.showHint()}
        onDismissPanel={() => setPanel(null)}
        onDisarm={() => send({ type: "canvas-touch" })}
      />
      <div className="drawing-top">
        <TimerDot
          ref={timer}
          clock={clock}
          paused={paused}
          note={active ? timerNote : null}
          onToggle={onTimerTap}
        />
        <ToolStrip
          tool={tool}
          panel={panel}
          colorSheetId={colorSheetId}
          smoothingBarId={smoothingBarId}
          onTool={pickTool}
          onPanel={setPanel}
        />
      </div>
      <ColorSheet
        id={colorSheetId}
        open={panel === "color"}
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
      <SizeRail
        value={sizes[sizeKey]}
        eraser={tool === "eraser"}
        active={sizing}
        onChange={setSize}
        onHold={setSizing}
      />
      <HistoryButtons
        canUndo={history.canUndo}
        canRedo={history.canRedo}
        onUndo={() => canvas.current?.undo()}
        onRedo={() => canvas.current?.redo()}
      />
      {adult && (
        <NsfwToggle
          shown={history.canUndo && !sealing}
          on={nsfwOn}
          onChange={(on) => {
            keepNsfw(on);
            keeper.keepNsfw(on);
          }}
        />
      )}
      <SealKey
        shown={history.canUndo && !sealing}
        armed={session.phase === "armed"}
        problem={sealProblem}
        onTap={() => {
          setSealProblem(null);
          if (sealProblem && reconnectOnTap.current) {
            // The drawing is kept on this device, and the drawing screen picks it back up.
            retryPrivySignIn(new URL("/draw", location.href).href);
            return;
          }
          send({ type: "seal-tap", now: performance.now(), hasInk: history.canUndo });
        }}
      />
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
          handle={me.handle ?? ""}
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
      {asking && !loaded && (
        <TicketsNotLoaded error={tickets.error} onRetry={tickets.refresh} onBoard={onGoToBoard} />
      )}
      {askShown && (
        <StartDrawing
          tickets={askShown}
          minutes={SESSION_MS / 60_000}
          followsSealedCard={ceremony?.leaving === true}
          leaving={!ask}
          onLeft={() => setAskShown(null)}
          busy={spending}
          note={startProblem}
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
