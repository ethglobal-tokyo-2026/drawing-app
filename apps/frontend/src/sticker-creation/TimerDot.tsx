import { ArrowBendLeftUp, Pause } from "@phosphor-icons/react";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { Hold } from "./session/session";
import type { SessionClock } from "./session/useSessionClock";
import "./TimerDot.css";

/** How long the paused hint stays after a stroke meets a paused sheet. */
const HINT_MS = 2600;
const HINT = "Tap the timer\nto keep drawing.";

/** A stroke on a paused sheet: the dot turns toward the hint and back, on top of its tilt. */
const NUDGE: Keyframe[] = [
  { rotate: "0deg", scale: "1" },
  { rotate: "-9deg", scale: "1.08", offset: 0.28 },
  { rotate: "5deg", scale: "1.03", offset: 0.58 },
  { rotate: "0deg", scale: "1" },
];
/** Each second of the last ten lands with a small pulse. */
const TICK: Keyframe[] = [{ scale: "1.08" }, { scale: "1" }];

const WHY: Partial<Record<Hold, string>> = {
  color: " while you choose a color",
  smoothing: " while you set smoothing",
  size: " while you set the brush size",
};

const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

const easeOut = (el: Element) => getComputedStyle(el).getPropertyValue("--ease-out").trim();

export interface TimerDotHandle {
  /** A stroke met the paused sheet: nudge the dot and point at it. */
  showHint: () => void;
}

interface Props {
  ref?: Ref<TimerDotHandle>;
  clock: SessionClock;
  /** The person's own pause. */
  paused: boolean;
  /** Said on the white label under the timer while there's no paused hint to show; null for none. */
  note: string | null;
  onToggle: () => void;
}

/**
 * The timer: a Seal Yellow dot slapped on at the world's tilt, with puffy numerals in fixed cells.
 * Once the first stroke starts it, tapping it pauses. Every hold wears the same white PAUSED tag, the
 * page being hidden also lifts a corner, and the last ten seconds turn Tomato. A white label under it
 * points up at it: the paused hint, or the drawing screen's note.
 */
export function TimerDot({ ref, clock, paused, note, onToggle }: Props) {
  const view = useSyncExternalStore(clock.subscribe, clock.getView);
  const reduced = useReducedMotion();
  const dot = useRef<HTMLButtonElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [hint, setHint] = useState(false);
  const describedBy = useId();

  // The hint only ever speaks to a paused sheet.
  if (hint && !paused) setHint(false);
  const label = hint ? HINT : note;
  // The label keeps its words while it peels off.
  const [words, setWords] = useState(label);
  if (label && label !== words) setWords(label);

  useImperativeHandle(
    ref,
    () => ({
      showHint() {
        setHint(true);
        clearTimeout(hintTimer.current);
        hintTimer.current = setTimeout(() => setHint(false), HINT_MS);
        const el = dot.current;
        if (el && !reduced) el.animate(NUDGE, { duration: 480, easing: easeOut(el) });
      },
    }),
    [reduced],
  );

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  useEffect(() => {
    const el = face.current;
    if (el && view.late && !reduced) el.animate(TICK, { duration: 380, easing: easeOut(el) });
  }, [view.late, view.secondsLeft, reduced]);

  const time = clockText(view.secondsLeft);
  const classes = [
    "timer-dot",
    view.held && "is-held",
    view.late && "is-late",
    view.lifted && "is-lifted",
  ].filter(Boolean);
  return (
    <>
      <button
        ref={dot}
        type="button"
        className={classes.join(" ")}
        aria-label={view.waiting ? "Timer" : paused ? "Resume timer" : "Pause timer"}
        aria-describedby={describedBy}
        onClick={onToggle}
      >
        <span ref={face} className="timer-face">
          <span className="timer-time" aria-hidden="true">
            {time.split("").map((c, i) => (
              <i key={i} className={c === ":" ? "timer-colon" : undefined}>
                {c}
              </i>
            ))}
          </span>
        </span>
        <span className="timer-tag" aria-hidden="true">
          <Pause weight="fill" />
          <b>Paused</b>
        </span>
        <span className="visually-hidden" id={describedBy}>
          {`${time} left${view.waiting ? ", starts when you draw" : view.held ? `, paused${WHY[view.held] ?? ""}` : ""}`}
        </span>
      </button>
      <div className={`timer-hint ${label ? "is-on" : ""}`} aria-hidden="true">
        <ArrowBendLeftUp className="timer-hint-arrow" size={28} />
        <span className="timer-hint-label">{words}</span>
      </div>
      <span className="visually-hidden" role="status">
        {label ?? ""}
      </span>
    </>
  );
}
