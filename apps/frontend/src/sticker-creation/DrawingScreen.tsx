import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
  type Ref,
} from "react";
import { ArrowClockwise, ArrowCounterClockwise, CheckFat } from "@phosphor-icons/react";
import { addSticker, type StickerRecord } from "../stickers/stickerStorage";
import { OutOfTickets } from "../tickets/OutOfTickets";
import { useTickets } from "../tickets/useTickets";
import { DrawingCanvas, type CanvasHandle } from "./canvas/DrawingCanvas";
import type { Tool } from "./canvas/types";
import { hasContent, makeSticker, type StickerImages } from "./sealing/makeSticker";
import { SealSequence } from "./sealing/SealSequence";
import { Timer } from "./Timer";
import { ColorDrawer } from "./tools/ColorDrawer";
import { SizeSlider } from "./tools/SizeSlider";
import { SmoothnessDrawer } from "./tools/SmoothnessDrawer";
import { ToolPill, type Drawer } from "./tools/ToolPill";
import { useShortcuts } from "./useShortcuts";
import "./DrawingScreen.css";

const DURATION_S = 5 * 60;
const MAX_SIZE = 60;
const ARM_TIMEOUT_MS = 3000;

// Slider position (0..1) ↔ brush size, squared for finer control of thin lines.
const sizeFromSlider = (v: number) => Math.round(1 + (MAX_SIZE - 1) * v * v);
const sliderFromSize = (s: number) => Math.sqrt((s - 1) / (MAX_SIZE - 1));

/**
 * ready (nothing drawn; the first stroke spends a ticket and starts the
 * clock) → drawing → armed (first tick tap) → sealing (building the sticker)
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

function useCountdown(running: boolean) {
  const [left, setLeft] = useState(DURATION_S);
  const deadline = useRef(0);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft(Math.max(0, Math.ceil((deadline.current - Date.now()) / 1000)));
    }, 250);
    return () => clearInterval(id);
  }, [running]);
  const restart = () => {
    deadline.current = Date.now() + DURATION_S * 1000;
    setLeft(DURATION_S);
  };
  return { left, restart };
}

export function DrawingScreen({ ref, active, onSealed, onNewSticker, onGoToBoard }: Props) {
  const canvas = useRef<CanvasHandle>(null);
  const [tool, setTool] = useState<Tool>("brush");
  const [sizes, setSizes] = useState({ brush: 6, eraser: 24 });
  const [color, setColor] = useState("#1c1b29");
  const [recent, setRecent] = useState([
    "#1c1b29",
    "#ec6341",
    "#f1b555",
    "#3a3c86",
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

  const { left, restart } = useCountdown(storedPhase === "drawing" || storedPhase === "armed");
  // Time's up: the canvas locks and the tick seals in one tap.
  const phase: Phase =
    left === 0 && (storedPhase === "drawing" || storedPhase === "armed") ? "timeup" : storedPhase;
  const paywall = active && phase === "ready" && (tickets.left === 0 || holdPaywall);
  const locked = paywall || phase === "timeup" || phase === "sealing" || phase === "sealed";
  const drawer = locked ? null : openDrawer;

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

  // The first stroke of a sticker spends a ticket and starts the clock.
  const startRef = useRef({ phase: storedPhase, tickets, restart });
  useLayoutEffect(() => {
    startRef.current = { phase: storedPhase, tickets, restart };
  });
  const onHistoryChange = useCallback((canUndo: boolean, canRedo: boolean) => {
    setHistory({ canUndo, canRedo });
    const { phase: p, tickets: t, restart: r } = startRef.current;
    if (p === "ready" && canUndo) {
      startRef.current.phase = "drawing";
      t.use();
      r();
      setPhase("drawing");
    } else {
      setPhase((cur) => (cur === "armed" ? "drawing" : cur));
    }
  }, []);

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
      tickets.linkSticker(record.id);
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
        // A tap on the canvas while a drawer is open just closes it.
        onPointerDownCapture={(e) => {
          if (!drawer) return;
          e.stopPropagation();
          setDrawer(null);
        }}
      >
        <DrawingCanvas
          ref={canvas}
          settings={{ tool, color, size, stabilization, pressure, fingerDraws, locked }}
          onHistoryChange={onHistoryChange}
          onPenDetected={onPenDetected}
        />
      </div>

      <div className="overlay top">
        <Timer seconds={left} />
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
        />
      )}

      <div className="overlay bottom">
        <div className="history-btns">
          <button
            className="square-btn"
            onClick={undo}
            disabled={!history.canUndo || locked}
            aria-label="Undo"
          >
            <ArrowCounterClockwise size={24} />
          </button>
          <button
            className="square-btn"
            onClick={redo}
            disabled={!history.canRedo || locked}
            aria-label="Redo"
          >
            <ArrowClockwise size={24} />
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
          <button
            className={`seal-btn ${phase === "armed" || phase === "timeup" ? "armed" : ""}`}
            onClick={onTick}
            disabled={phase === "sealing" || phase === "sealed"}
            aria-label="Finish drawing"
          >
            <CheckFat size={30} weight="fill" />
          </button>
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
        <SmoothnessDrawer
          value={stabilization}
          pressure={pressure}
          fingerDraws={fingerDraws}
          onChange={setStabilization}
          onPressure={setPressure}
          onFingerDraws={setFingerDraws}
          onClose={() => setDrawer(null)}
        />
      )}

      {sealed && active && (
        <SealSequence
          key={sealed.record.id}
          images={sealed.images}
          record={sealed.record}
          ticketsLeft={tickets.left}
          onKeepDrawing={startNewSticker}
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
          onStartDrawing={() => setHoldPaywall(false)}
          onBoard={() => {
            setHoldPaywall(false);
            onGoToBoard();
          }}
        />
      )}
    </>
  );
}
