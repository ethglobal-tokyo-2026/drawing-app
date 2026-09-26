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
import { useIdentity } from "../identity/useIdentity";
import { addSticker, type StickerRecord } from "../stickers/stickerStorage";
import { OutOfTickets, type OutOfTicketsStep } from "../tickets/OutOfTickets";
import { StartDrawing } from "../tickets/StartDrawing";
import type { SpentTicket } from "../tickets/tickets";
import { useTickets } from "../tickets/useTickets";
import { useToast } from "../ui/useToast";
import { sizePx } from "./canvas/brush";
import { DrawingCanvas, type DrawingCanvasHandle } from "./canvas/DrawingCanvas";
import { isFirstVisit } from "./drawVisits";
import { lazyRadius } from "./canvas/lazyBrush";
import type { Op, Tool } from "./canvas/ops";
import { SealKey } from "./SealKey";
import { makeSticker, type SealedSticker } from "./sealing/makeSticker";
import { SealCeremony } from "./sealing/SealCeremony";
import type { Box } from "./sealing/sealTimeline";
import { loadKeptSession, SessionKeeper, type KeptSession } from "./session/keptSession";
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
import { FIRST_COLOR, FIRST_RECENT, withRecent } from "./tools/palette";
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

/** What the label under the timer says while the clock waits for the first stroke. */
const STARTS = "Starts when you draw";
/** What the label under the timer says over a drawing kept across a reload. */
const PICKED_UP = "Picked up where you left off";
/** What the start card says when a drawing kept across a reload can't be read back. */
const LOST = {
  lost: "Couldn’t pick up where you left off.",
  refunded: "Couldn’t pick up where you left off, so your ticket is back.",
};

interface Sealed {
  sticker: SealedSticker;
  record: StickerRecord;
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
  const root = useRef<HTMLDivElement>(null);
  const canvas = useRef<DrawingCanvasHandle>(null);
  const timer = useRef<TimerDotHandle>(null);
  const tickets = useTickets();
  const me = useIdentity();
  const toast = useToast();
  const colorSheetId = useId();
  const smoothingBarId = useId();

  const [tool, setTool] = useState<Tool>("brush");
  const [color, setColor] = useState(FIRST_COLOR);
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
  const [sealed, setSealed] = useState<Sealed | null>(null);
  // The sealed sticker's layers are let go when a fresh sheet replaces it.
  const lastSealed = useRef<Sealed | null>(null);
  const [sealProblem, setSealProblem] = useState<string | null>(null);
  // The out-of-tickets card's first step while it's up, or null.
  const [paywallOpen, setPaywallOpen] = useState<OutOfTicketsStep | null>(null);
  // The session's ticket: spent at Start, or before a reload it was kept across.
  const ticket = useRef<SpentTicket | null>(null);
  const [keeper] = useState(() => new SessionKeeper());
  // Until a session kept across a reload is back, or known lost, Draw doesn't ask for a ticket.
  const [restoring, setRestoring] = useState(true);
  const [pickedUp, setPickedUp] = useState<"restored" | keyof typeof LOST | null>(null);
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
      case "spend-ticket":
        ticket.current = tickets.use();
        if (!ticket.current) console.error("Start was tapped with no ticket left to spend");
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
      case "reset-sheet":
        canvas.current?.reset();
        clock.reset();
        keeper.wipe();
        ticket.current = null;
        setPickedUp(null);
        setPaused(false);
        setPanel(null);
        lastSealed.current?.sticker.dispose();
        lastSealed.current = null;
        setSealed(null);
        setSealProblem(null);
        return;
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

  async function seal() {
    setPanel(null);
    canvas.current?.finishStroke();
    const ink = canvas.current?.inkForReading() ?? null;
    const timeUsed = Math.min(SESSION_MS / 1000, Math.max(1, Math.round(clock.elapsed / 1000)));
    let sticker: SealedSticker | null = null;
    try {
      const sheet = sheetBox();
      // The cut holds the main thread a moment: the key's pop and the tools stepping back paint first.
      await afterPaint();
      sticker = ink && (await makeSticker(ink));
      if (!sticker) {
        // Everything drawn was erased or undone. At 0:00 the sheet is spent; before that, draw on.
        if (clock.elapsed >= SESSION_MS) {
          toast("Time’s up. The sheet was empty, so nothing was sealed.");
          send({ type: "reset" });
        } else {
          setSealProblem("The sheet is empty, so there’s nothing to seal.");
          send({ type: "seal-failed" });
        }
        return;
      }
      const record = await addSticker({
        createdAt: Date.now(),
        timeUsed,
        blob: sticker.png,
        width: sticker.width,
        height: sticker.height,
        outline: sticker.outline,
        mask: sticker.mask,
        resin: { spec: sticker.spec, rim: sticker.rim },
        flat: sticker.flat,
      });
      if (ticket.current) tickets.linkSticker(ticket.current, record.id);
      ticket.current = null;
      keeper.wipe();
      lastSealed.current = { sticker, record, sheet };
      setSealed(lastSealed.current);
      send({ type: "sealed" });
      onSealed(record.id);
    } catch (error) {
      sticker?.dispose();
      console.error("Sealing the sticker failed", error);
      setSealProblem(`Couldn’t seal (${reason(error)}). Tap the check to try again.`);
      send({ type: "seal-failed" });
    }
  }

  const startNewSticker = () => {
    send({ type: "reset" });
    onNewSticker();
  };

  /** Keep drawing and the Draw after a purchase already chose to spend a ticket, so they skip the ask. */
  const startRightAway = () => {
    if (tickets.left > 0) send({ type: "start" });
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
      keeper.resume(kept.ticket, kept.ops);
      ticket.current = kept.ticket;
      send({ type: "restored", drawn });
      if (!drawn) return;
      clock.restore(kept.elapsedMs);
      setPaused(true);
      setPickedUp("restored");
      return;
    }
    console.error("The drawing in progress couldn't be picked up after a reload", kept.error);
    const refunded = kept.ticket !== null && tickets.giveBack(kept.ticket);
    keeper.wipe();
    setPickedUp(refunded ? "refunded" : "lost");
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

  // "Picked up" stays until the clock runs again; word of a lost drawing, until the next one starts.
  if (pickedUp === "restored" && !paused) setPickedUp(null);
  if (pickedUp && pickedUp !== "restored" && session.phase !== "blank") setPickedUp(null);
  const waiting = session.phase === "blank" || session.phase === "primed";
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
  if (active && fresh && tickets.left === 0 && !paywallOpen) setPaywallOpen("out");
  const paywall = active && fresh && paywallOpen !== null;
  // A fresh sheet asks before a ticket is spent, and takes no ink until then.
  const asking = active && fresh && !paywall;
  const sealing = session.phase === "sealing" || session.phase === "sealed";
  // Until Start, and while a kept session loads, the sheet takes no ink.
  const locked = !active || session.phase === "blank" || sealing;

  // On the first few visits, a started sheet says the timer waits for the first stroke, which peels it off.
  const startsLabel = startsNote || (active && session.phase === "primed" && isFirstVisit());
  const timerNote = pickedUp === "restored" ? PICKED_UP : startsLabel ? STARTS : null;

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
      <SealKey
        shown={history.canUndo && !sealing}
        armed={session.phase === "armed"}
        problem={sealProblem}
        onTap={() => {
          setSealProblem(null);
          send({ type: "seal-tap", now: performance.now(), hasInk: history.canUndo });
        }}
      />
      {sealed && active && (
        <SealCeremony
          key={sealed.record.id}
          sticker={sealed.sticker}
          record={sealed.record}
          sheet={sealed.sheet}
          handle={me.handle}
          onKeepDrawing={() => {
            startNewSticker();
            startRightAway();
          }}
          onBoard={onGoToBoard}
          // A fresh sheet with no tickets left brings up the out-of-tickets card, here at its Sui purchase.
          onGetTickets={() => {
            setPaywallOpen("approve");
            startNewSticker();
          }}
        />
      )}
      {asking && (
        <StartDrawing
          minutes={SESSION_MS / 60_000}
          note={pickedUp && pickedUp !== "restored" ? LOST[pickedUp] : null}
          onStart={() => send({ type: "start" })}
          onBoard={onGoToBoard}
        />
      )}
      {paywall && (
        <OutOfTickets
          refillAt={tickets.refillAt}
          firstStep={paywallOpen}
          onTicketsBought={tickets.add}
          onStartDrawing={() => {
            setPaywallOpen(null);
            startRightAway();
          }}
          onBoard={() => {
            setPaywallOpen(null);
            onGoToBoard();
          }}
        />
      )}
    </div>
  );
}
