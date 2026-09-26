import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from "react";
import { Key } from "../controls/controls";
import { ArrowBendLeftUpIcon } from "../icons/ArrowBendLeftUpIcon";
import { CheckIcon } from "../icons/CheckIcon";
import { RedoIcon } from "../icons/RedoIcon";
import { UndoIcon } from "../icons/UndoIcon";
import { addSticker, type StickerRecord } from "../stickers/stickerStorage";
import { OutOfTickets } from "../tickets/OutOfTickets";
import { StartDrawing } from "../tickets/StartDrawing";
import { useTickets } from "../tickets/useTickets";
import { DrawingCanvas, type CanvasHandle } from "./canvas/DrawingCanvas";
import type { Tool } from "./canvas/types";
import { hasContent, makeSticker, type StickerImages } from "./sealing/makeSticker";
import { SealSequence } from "./sealing/SealSequence";
import { Timer } from "./Timer";
import { ColorDrawer } from "./tools/ColorDrawer";
import { SizeSlider } from "./tools/SizeSlider";
import { SmoothingBar } from "./tools/SmoothingBar";
import { ToolPill, type Drawer } from "./tools/ToolPill";
import { useShortcuts } from "./useShortcuts";
import "./DrawingScreen.css";

const DURATION_S = 3 * 60;
const MAX_SIZE = 60;
const ARM_TIMEOUT_MS = 2500;
/** How long the paused hint stays stuck on before it peels off. */
const PAUSED_HINT_MS = 2500;

// Slider position (0..1) ↔ brush size, squared for finer control of thin lines.
const sizeFromSlider = (v: number) => Math.round(1 + (MAX_SIZE - 1) * v * v);
const sliderFromSize = (s: number) => Math.sqrt((s - 1) / (MAX_SIZE - 1));

/**
 * ready (asks to spend a ticket; Start spends it and starts the clock)
 * → drawing → armed (first tick tap) → sealing (building the sticker)
 * → sealed (animation + result). When the clock runs out it becomes timeup,
 * where a single tap seals.
 */
type Phase = "ready" | "drawing" | "armed" | "timeup" | "sealing" | "sealed";

interface Sealed {
  images: StickerImages;
  record: StickerRecord;
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

/** Counts down only while running, so a hold keeps the time that was left. */
function useCountdown(running: boolean) {
  const [left, setLeft] = useState(DURATION_S);
  const remainingMs = useRef(DURATION_S * 1000);
  useEffect(() => {
    if (!running) return;
    const deadline = Date.now() + remainingMs.current;
    const tick = () => {
      remainingMs.current = Math.max(0, deadline - Date.now());
      setLeft(Math.ceil(remainingMs.current / 1000));
    };
    const id = setInterval(tick, 250);
    return () => {
      clearInterval(id);
      remainingMs.current = Math.max(0, deadline - Date.now());
    };
  }, [running]);
  const restart = () => {
    remainingMs.current = DURATION_S * 1000;
    setLeft(DURATION_S);
  };
  return { left, restart };
}

function usePageHidden() {
  const [hidden, setHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onChange = () => setHidden(document.hidden);
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  }, []);
  return hidden;
}

export function DrawingScreen({ ref, active, onSealed, onNewSticker, onGoToBoard }: Props) {
  const canvas = useRef<CanvasHandle>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [sizes, setSizes] = useState({ brush: 6, eraser: 24 });
  // Indigo, not black: every tool icon is Ink, so a black brush color would read as another icon.
  const [color, setColor] = useState("#3a3c86");
  const [recent, setRecent] = useState([
    "#3a3c86",
    "#1c1b29",
    "#ec6341",
    "#f1b555",
    "#8cc2f7",
    "#f4b6c6",
  ]);
  const [stabilization, setStabilization] = useState(30);
  const [pressure, setPressure] = useState(true);
  const [fingerDraws, setFingerDraws] = useState(true);
  const [history, setHistory] = useState({ canUndo: false, canRedo: false });
  const [openDrawer, setDrawer] = useState<Drawer>(null);
  const [storedPhase, setPhase] = useState<Exclude<Phase, "timeup">>("ready");
  const penSeen = useRef(false);
  const [sealed, setSealed] = useState<Sealed | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const tickets = useTickets();
  // Keeps the ticket card up after a purchase until "Start drawing".
  const [holdPaywall, setHoldPaywall] = useState(false);

  // The person's pause is the timer tap; the other holds release on their own.
  const [userPaused, setUserPaused] = useState(false);
  const [railHeld, setRailHeld] = useState(false);
  const pageHidden = usePageHidden();
  const [pausedHint, setPausedHint] = useState(0);
  const clockPhase = storedPhase === "drawing" || storedPhase === "armed";
  const held = userPaused || pageHidden || openDrawer !== null || railHeld;
  const { left, restart } = useCountdown(clockPhase && !held);
  // Time's up: the canvas locks and the tick seals in one tap.
  const phase: Phase =
    left === 0 && (storedPhase === "drawing" || storedPhase === "armed") ? "timeup" : storedPhase;
  const paywall = active && phase === "ready" && (tickets.left === 0 || holdPaywall);
  const startCard = active && phase === "ready" && !paywall && !sealed;
  const locked =
    phase === "ready" || phase === "timeup" || phase === "sealing" || phase === "sealed";
  const drawer = locked ? null : openDrawer;
  const canPause = clockPhase && left > 0;
  // While paused by a tap the canvas takes no marks; tools can still switch.
  const tapPaused = userPaused && canPause;

  // The paused hint peels off by itself.
  useEffect(() => {
    if (!pausedHint) return;
    const id = setTimeout(() => setPausedHint(0), PAUSED_HINT_MS);
    return () => clearTimeout(id);
  }, [pausedHint]);

  const sizeTool = tool === "eraser" ? "eraser" : "brush";
  const size = sizes[sizeTool];
  const setSize = (n: number) =>
    setSizes((s) => ({ ...s, [sizeTool]: Math.min(MAX_SIZE, Math.max(1, n)) }));

  // An armed tick disarms itself after a moment.
  useEffect(() => {
    if (phase !== "armed") return;
    const id = setTimeout(() => setPhase("drawing"), ARM_TIMEOUT_MS);
    return () => clearTimeout(id);
  }, [phase]);

  const onHistoryChange = useCallback((canUndo: boolean, canRedo: boolean) => {
    setHistory({ canUndo, canRedo });
    setPhase((cur) => (cur === "armed" ? "drawing" : cur));
  }, []);

  /** Spends a ticket and starts the clock. With none left, the out-of-tickets card shows instead. */
  const startDrawing = () => {
    if (!tickets.use()) return;
    restart();
    setUserPaused(false);
    setPhase("drawing");
  };

  // Like most tablet apps: once a pen shows up, fingers stop drawing (palm
  // rejection) but still do gestures. The toggle turns finger drawing back on.
  const onPenDetected = useCallback(() => {
    if (penSeen.current) return;
    penSeen.current = true;
    setFingerDraws(false);
  }, []);

  const commitRecent = (c: string) =>
    setRecent((r) => [c, ...r.filter((x) => x !== c)].slice(0, 6));

  // Brief hint above the tick ("Draw something first").
  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 2000);
    return () => clearTimeout(id);
  }, [notice]);

  const isBlank = () => {
    const surface = canvas.current?.surface();
    return !surface || !hasContent(surface);
  };

  const seal = async () => {
    const surface = canvas.current?.surface();
    if (!surface) return;
    setPhase("sealing");
    try {
      const images = await makeSticker(surface);
      if (!images) throw new Error("Nothing to seal");
      const record = await addSticker({
        createdAt: Date.now(),
        timeUsed: DURATION_S - left,
        blob: images.domeBlob,
        width: images.width,
        height: images.height,
        outline: images.outline,
      });
      setSealed({ images, record });
      setPhase("sealed");
      onSealed(record.id);
    } catch {
      setPhase("drawing");
      setNotice("Couldn’t seal, try again");
    }
  };

  const onTick = () => {
    setDrawer(null);
    if (phase === "ready") setNotice("Draw something first");
    else if (phase === "drawing") {
      if (isBlank()) setNotice("Draw something first");
      else setPhase("armed");
    } else if (phase === "armed") void seal();
    else if (phase === "timeup") {
      if (isBlank()) setNotice("Nothing to seal");
      else void seal();
    }
  };

  const startNewSticker = () => {
    canvas.current?.reset();
    setSealed(null);
    setPhase("ready");
    setUserPaused(false);
    restart();
    onNewSticker();
  };

  useImperativeHandle(ref, () => ({ startNewSticker, closeDrawers: () => setDrawer(null) }));

  const undo = () => active && !locked && canvas.current?.undo();
  const redo = () => active && !locked && canvas.current?.redo();

  useShortcuts({
    undo,
    redo,
    setTool: (t) => active && setTool(t),
    adjustSize: (d) => setSize(size + d * Math.max(1, Math.round(size * 0.1))),
  });

  return (
    <>
      <div
        className="canvas-area"
        // A tap on the canvas while a drawer is open just closes it; a stroke while
        // paused shows the hint instead of a mark.
        onPointerDownCapture={(e) => {
          if (drawer) {
            e.stopPropagation();
            setDrawer(null);
          } else if (tapPaused) {
            setPausedHint((n) => n + 1);
          }
        }}
      >
        <DrawingCanvas
          ref={canvas}
          settings={{
            tool,
            color,
            size,
            stabilization,
            pressure,
            fingerDraws,
            locked: locked || tapPaused,
          }}
          onHistoryChange={onHistoryChange}
          onPenDetected={onPenDetected}
        />
      </div>

      <div className="overlay top">
        <Timer
          seconds={left}
          paused={canPause && held}
          canPause={canPause}
          nudge={pausedHint}
          onToggle={() => {
            setUserPaused((p) => !p);
            setPausedHint(0);
          }}
        />
        <ToolPill
          tool={tool}
          color={color}
          drawer={drawer}
          disabled={locked}
          onTool={setTool}
          onDrawer={setDrawer}
        />
      </div>

      {tool !== "bucket" && !locked && (
        <SizeSlider
          value={sliderFromSize(size)}
          previewSize={size}
          previewColor={tool === "eraser" ? "#fff" : color}
          onChange={(v) => setSize(sizeFromSlider(v))}
          onActiveChange={setRailHeld}
        />
      )}

      {pausedHint > 0 && tapPaused && (
        <div className="paused-hint" key={pausedHint} role="status">
          <ArrowBendLeftUpIcon size={28} />
          Tap the timer to keep drawing
        </div>
      )}

      <div className="overlay bottom">
        <div className="history-btns">
          <button
            className="square-btn"
            onClick={undo}
            disabled={!history.canUndo || locked}
            aria-label="Undo"
          >
            <UndoIcon size={24} />
          </button>
          <button
            className="square-btn"
            onClick={redo}
            disabled={!history.canRedo || locked}
            aria-label="Redo"
          >
            <RedoIcon size={24} />
          </button>
        </div>
        <div className="seal-area">
          {notice ? (
            <span className="seal-hint" key={notice}>
              {notice}
            </span>
          ) : (
            (phase === "armed" || phase === "timeup") && (
              <span className="seal-hint">
                {phase === "timeup" ? "Time’s up · tap to seal" : "Tap again to seal"}
              </span>
            )
          )}
          <Key
            size="round"
            className={phase === "armed" || phase === "timeup" ? "armed" : ""}
            onPress={onTick}
            disabled={phase === "sealing" || phase === "sealed"}
            aria-label="Finish drawing"
            icon={<CheckIcon size={26} />}
          />
        </div>
      </div>

      {drawer === "color" && (
        <ColorDrawer
          color={color}
          recent={recent}
          onChange={(c) => {
            setColor(c);
            if (tool === "eraser") setTool("brush");
          }}
          onCommit={commitRecent}
          onClose={() => setDrawer(null)}
        />
      )}
      {drawer === "smooth" && (
        <SmoothingBar
          value={stabilization}
          pressure={pressure}
          fingerDraws={fingerDraws}
          onChange={setStabilization}
          onPressure={setPressure}
          onFingerDraws={setFingerDraws}
        />
      )}

      {sealed && active && (
        <SealSequence
          key={sealed.record.id}
          images={sealed.images}
          record={sealed.record}
          ticketsLeft={tickets.left}
          usedToday={tickets.usedFree}
          // Keep drawing already means "spend a ticket", so it starts without asking again.
          onKeepDrawing={() => {
            startNewSticker();
            startDrawing();
          }}
          onBoard={onGoToBoard}
        />
      )}

      {startCard && (
        <StartDrawing
          ticketsLeft={tickets.left}
          usedToday={tickets.usedFree}
          minutes={DURATION_S / 60}
          onStart={startDrawing}
          onBoard={onGoToBoard}
        />
      )}

      {paywall && !sealed && (
        <OutOfTickets
          refillAt={tickets.refillAt}
          onTicketsBought={(n) => {
            setHoldPaywall(true);
            tickets.add(n);
          }}
          onStartDrawing={() => {
            setHoldPaywall(false);
            startDrawing();
          }}
          onBoard={() => {
            setHoldPaywall(false);
            onGoToBoard();
          }}
        />
      )}
    </>
  );
}
