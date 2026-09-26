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
import { useTickets } from "../tickets/useTickets";
import { useToast } from "../ui/useToast";
import { sizePx } from "./canvas/brush";
import { DrawingCanvas, type DrawingCanvasHandle } from "./canvas/DrawingCanvas";
import { lazyRadius } from "./canvas/lazyBrush";
import type { Op, Tool } from "./canvas/ops";
import { SealKey } from "./SealKey";
import { makeSticker, type SealedSticker } from "./sealing/makeSticker";
import { SealCeremony } from "./sealing/SealCeremony";
import type { Box } from "./sealing/sealTimeline";
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
        if (!tickets.use()) console.error("Start was tapped with no ticket left to spend");
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
      tickets.linkSticker(record.id);
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
  const fresh = session.phase === "blank";
  if (active && fresh && tickets.left === 0 && !paywallOpen) setPaywallOpen("out");
  const paywall = active && fresh && paywallOpen !== null;
  // A fresh sheet asks before a ticket is spent, and takes no ink until then.
  const asking = active && fresh && !paywall;
  const sealing = session.phase === "sealing" || session.phase === "sealed";
  const locked = !active || fresh || sealing;

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
        onHistory={(canUndo, canRedo) =>
          setHistory((h) =>
            h.canUndo === canUndo && h.canRedo === canRedo ? h : { canUndo, canRedo },
          )
        }
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
        <TimerDot ref={timer} clock={clock} paused={paused} onToggle={() => setPaused((p) => !p)} />
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
