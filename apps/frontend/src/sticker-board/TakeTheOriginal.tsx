import { ArrowDown, Scissors } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { formatNo } from "../stickers/format";
import { LabelButton } from "../ui/LabelButton";
import { Sheet } from "../ui/Sheet";
import { TearLine } from "../ui/TearLine";
import { useBackToClose } from "../ui/useBackToClose";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { BoardSticker } from "./boardSticker";
import "./take-the-original.css";

/** How long the tear takes, held down. */
const HOLD_MS = 1400;
/** How long a let-go tear takes to close back up. */
const RELEASE_MS = 220;

/**
 * The hold-to-tear key: holding it tears along its perforation; letting go early closes the tear back
 * up. `onTorn` runs once, when it rips through.
 */
function HoldToTear({ onTorn }: { onTorn: () => void }) {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [holding, setHolding] = useState(false);
  const frame = useRef(0);
  const torn = useRef(false);
  const latest = useRef(progress);
  useLayoutEffect(() => {
    latest.current = progress;
  });

  useEffect(() => () => cancelAnimationFrame(frame.current), []);

  const start = () => {
    if (torn.current || holding) return;
    cancelAnimationFrame(frame.current);
    setHolding(true);
    const from = performance.now() - latest.current * HOLD_MS;
    const tick = (now: number) => {
      const p = Math.min(1, (now - from) / HOLD_MS);
      setProgress(p);
      if (p < 1) frame.current = requestAnimationFrame(tick);
      else {
        torn.current = true;
        setHolding(false);
        onTorn();
      }
    };
    frame.current = requestAnimationFrame(tick);
  };

  const stop = () => {
    if (torn.current || !holding) return;
    cancelAnimationFrame(frame.current);
    setHolding(false);
    const from = latest.current;
    const t0 = performance.now();
    const back = (now: number) => {
      const p = Math.max(0, from * (1 - (now - t0) / RELEASE_MS));
      setProgress(p);
      if (p > 0) frame.current = requestAnimationFrame(back);
    };
    frame.current = requestAnimationFrame(back);
  };

  const isKey = (e: KeyboardEvent) => e.key === " " || e.key === "Enter";
  return (
    <button
      type="button"
      className={`hold-to-tear ${holding ? "is-holding" : ""}`}
      aria-describedby="hold-to-tear-sub"
      onPointerDown={(e) => {
        start();
        // Capture keeps the hold when the finger drifts off the key. A pointer the browser no longer
        // tracks can't be captured, and the hold still runs without it.
        if (e.currentTarget.hasPointerCapture(e.pointerId)) return;
        try {
          e.currentTarget.setPointerCapture(e.pointerId);
        } catch (error) {
          console.warn("Hold to tear runs without pointer capture", error);
        }
      }}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={(e) => {
        if (!isKey(e)) return;
        e.preventDefault();
        if (!e.repeat) start();
      }}
      onKeyUp={(e) => {
        if (isKey(e)) stop();
      }}
      // The hold is the act; a click alone does nothing.
      onClick={(e) => e.preventDefault()}
    >
      <span className="hold-to-tear__main">
        <span className="hold-to-tear__label">
          <Scissors size={18} aria-hidden />
          Hold to tear
        </span>
        <span className="fine hold-to-tear__sub" id="hold-to-tear-sub">
          Keep holding until it rips
        </span>
      </span>
      <span
        className="hold-to-tear__stub"
        aria-hidden
        style={
          reduced
            ? undefined
            : {
                transform: `rotate(${progress * 6}deg) translate(${progress * 2}px, ${progress * 1.5}px)`,
              }
        }
      >
        <ArrowDown size={22} />
      </span>
      <span
        className="hold-to-tear__rip"
        aria-hidden
        style={{ transform: `scaleY(${progress})` }}
      />
    </button>
  );
}

/**
 * Take the original: below a perforation, well apart from Give. It asks first in a sheet, then takes a
 * held tear. Taking it isn't built yet, so the tear ends on a note that it's coming and nothing changes.
 */
export function TakeTheOriginal({ sticker }: { sticker: BoardSticker }) {
  const [open, setOpen] = useState(false);
  const [torn, setTorn] = useState(false);
  const keep = useRef<HTMLButtonElement>(null);
  const close = () => {
    setOpen(false);
    setTorn(false);
  };
  useBackToClose(open, close);

  useEffect(() => {
    if (open) keep.current?.focus();
  }, [open, torn]);

  const name = formatNo(sticker.no);
  return (
    <>
      <div className="take-the-original">
        <TearLine />
        <div className="take-the-original__row">
          <LabelButton
            tone="tomato"
            size="sm"
            icon={<Scissors size={18} aria-hidden />}
            onClick={() => setOpen(true)}
          >
            Take the original
          </LabelButton>
          <p className="take-the-original__note">Ends the sticker. You keep the file as drawn.</p>
        </div>
      </div>

      {open && (
        <>
          <div className="take-the-original__scrim" onClick={close} />
          <Sheet label="Take the original" onClose={close} className="take-the-original__sheet">
            {/* Escape closes the sheet, not the detail under it. */}
            <div
              onKeyDown={(e) => {
                if (e.key !== "Escape") return;
                e.stopPropagation();
                close();
              }}
            >
              {torn ? (
                <div role="status">
                  <h2 className="title-label take-the-original__title">
                    Taking the original is coming soon
                  </h2>
                  <p className="take-the-original__text">
                    Nothing was torn: {name} stays on your sticker board. Once it’s ready, the
                    original opens in Safari or Chrome, and the sticker ends.
                  </p>
                  <LabelButton
                    ref={keep}
                    block
                    icon={<StickerBoardIcon size={18} />}
                    onClick={close}
                  >
                    Back to the sticker
                  </LabelButton>
                </div>
              ) : (
                <>
                  <div className="take-the-original__head">
                    <img
                      className="take-the-original__figure"
                      src={sticker.urls.png}
                      alt=""
                      draggable={false}
                    />
                    <div>
                      <h2 className="title-label take-the-original__title">
                        Take the original of {name}?
                      </h2>
                      <p className="take-the-original__text">
                        The sticker ends here: it leaves your sticker board and can’t be given
                        again. You keep the file as drawn.
                      </p>
                    </div>
                  </div>
                  <HoldToTear onTorn={() => setTorn(true)} />
                  <LabelButton
                    ref={keep}
                    block
                    className="take-the-original__keep"
                    icon={<StickerBoardIcon size={18} />}
                    onClick={close}
                  >
                    Keep the sticker
                  </LabelButton>
                </>
              )}
            </div>
          </Sheet>
        </>
      )}
    </>
  );
}
