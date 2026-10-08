import { ArrowBendLeftUp, Pause } from "../icons";
import {
  useEffect,
  useId,
  useImperativeHandle,
  useRef,
  useState,
  useSyncExternalStore,
  type Ref,
} from "react";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { Hold } from "./session/session";
import { NUDGE, NUDGE_MS } from "./nudge";
import type { SessionClock } from "./session/useSessionClock";
import "./TimerDot.css";

/** How long the paused hint stays after a stroke meets a paused sheet. */
const HINT_MS = 2600;
/** A time warning stays in its live region this long, then the region empties so no stale one is read later. */
const WARNING_MS = 6000;
/** A proctor's time call stays on the label this long: an unverified guess, to tune by feel. */
const CALL_MS = 4000;
/** "30:00" doesn't fit the dot's usual size, so it's wider while the clock reads this many seconds or more. */
export const WIDE_FROM_SECONDS = 10 * 60;

/** Each second of the last ten lands with a small pulse. */
const TICK: Keyframe[] = [{ scale: "1.08" }, { scale: "1" }];

/** What the timer reads out while each hold stops it: a tool in hand says which. */
const HELD_STATUS = {
  paused: "paused",
  hidden: "paused",
  away: "paused",
  color: "color",
  smoothing: "smoothing",
  clear: "clear",
  size: "size",
} as const satisfies Record<Hold, string>;

const clockText = (seconds: number) =>
  `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

export interface TimerDotHandle {
  /** A stroke met the paused sheet: nudge the dot and point at it. */
  showHint: () => void;
}

interface Props {
  ref?: Ref<TimerDotHandle>;
  clock: SessionClock;
  /** The person's own pause. */
  paused: boolean;
  /** Said on the white label under the timer while there's no paused hint or time call to show; null for none. */
  note: string | null;
  /** What starts a waiting clock: the first stroke, or Begin on a sheet in Kyoto Seika Practice Mode. */
  waitsFor: "stroke" | "begin";
  onToggle: () => void;
}

/**
 * The timer: a Seal Yellow dot slapped on at the world's tilt, with puffy numerals in fixed cells.
 * Once the first stroke starts it, tapping it pauses. Every hold wears the same white PAUSED tag, the
 * page being hidden also lifts a corner, and the last ten seconds turn Tomato. A white label under it
 * points up at it: the paused hint, or the drawing screen's note.
 */
export function TimerDot({ ref, clock, paused, note, waitsFor, onToggle }: Props) {
  const { t } = useTranslation();
  const view = useSyncExternalStore(clock.subscribe, clock.getView);
  const reduced = useReducedMotion();
  const dot = useRef<HTMLButtonElement>(null);
  const face = useRef<HTMLSpanElement>(null);
  const hintTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const [hint, setHint] = useState(false);
  const describedBy = useId();

  // A proctor's time call, in minutes, while it shows.
  const [call, setCall] = useState<number | null>(null);

  // The hint only ever speaks to a paused sheet.
  if (hint && !paused) setHint(false);
  const label = hint
    ? t(($) => $.stickerCreation.timer.note.tapToKeepDrawing)
    : call !== null
      ? t(($) => $.stickerCreation.timer.note.minutesLeft, { minutes: call })
      : note;
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
        if (el && !reduced) el.animate(NUDGE, { duration: NUDGE_MS, easing: EASE_OUT });
      },
    }),
    [reduced],
  );

  useEffect(() => () => clearTimeout(hintTimer.current), []);

  // The dot turns Tomato in the last ten seconds, which a screen reader never sees: it hears them. A
  // warning of a minute or more is a proctor's time call, which the label shows and reads out.
  const [warning, setWarning] = useState<number | null>(null);
  useEffect(() => {
    let clearWarning: ReturnType<typeof setTimeout> | undefined;
    let clearCall: ReturnType<typeof setTimeout> | undefined;
    const stopListening = clock.onWarning((seconds) => {
      if (seconds >= 60) {
        setCall(seconds / 60);
        clearTimeout(clearCall);
        clearCall = setTimeout(() => setCall(null), CALL_MS);
        return;
      }
      setWarning(seconds);
      clearTimeout(clearWarning);
      clearWarning = setTimeout(() => setWarning(null), WARNING_MS);
    });
    return () => {
      stopListening();
      clearTimeout(clearWarning);
      clearTimeout(clearCall);
    };
  }, [clock]);

  useEffect(() => {
    const el = face.current;
    if (el && view.late && !reduced) el.animate(TICK, { duration: 380, easing: EASE_OUT });
  }, [view.late, view.secondsLeft, reduced]);

  const time = clockText(view.secondsLeft);
  const waiting = waitsFor === "begin" ? "dealt" : "waiting";
  const status = view.waiting ? waiting : view.held ? HELD_STATUS[view.held] : "running";
  const wide = view.secondsLeft >= WIDE_FROM_SECONDS;
  const classes = [
    "timer-dot",
    wide && "is-wide",
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
        aria-label={
          view.waiting
            ? t(($) => $.stickerCreation.timer.label)
            : paused
              ? t(($) => $.stickerCreation.timer.resume)
              : t(($) => $.stickerCreation.timer.pause)
        }
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
          <b>{t(($) => $.stickerCreation.timer.paused)}</b>
        </span>
        <span className="visually-hidden" id={describedBy}>
          {t(($) => $.stickerCreation.timer.status[status], { time })}
        </span>
      </button>
      <div
        className={`timer-hint ${label ? "is-on" : ""} ${wide ? "is-wide" : ""}`}
        aria-hidden="true"
      >
        <ArrowBendLeftUp className="timer-hint-arrow" size={28} />
        <span className="timer-hint-label">{words}</span>
      </div>
      <span className="visually-hidden" role="status">
        {label ?? ""}
      </span>
      <span className="visually-hidden" role="status">
        {warning === null ? "" : t(($) => $.stickerCreation.timer.warning, { seconds: warning })}
      </span>
    </>
  );
}
