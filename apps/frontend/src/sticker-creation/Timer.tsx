import { PauseIcon } from "../icons/PauseIcon";

interface Props {
  seconds: number;
  /** The clock is held: tapped, the page hidden, a drawer open, or a finger on the size rail. */
  paused: boolean;
  /** Only a running clock can be paused by a tap. */
  canPause: boolean;
  /** Bumped to nudge the dot when a stroke lands while paused. */
  nudge: number;
  onToggle: () => void;
}

export function Timer({ seconds, paused, canPause, nudge, onToggle }: Props) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  const state = seconds === 0 ? "done" : seconds <= 30 && !paused ? "low" : "";
  return (
    <button
      type="button"
      className="timer"
      onClick={onToggle}
      disabled={!canPause}
      aria-pressed={canPause ? paused : undefined}
      aria-label={`${m} minutes ${s} seconds left${canPause ? (paused ? ", paused. Tap to keep drawing" : ". Tap to pause") : ""}`}
    >
      <span key={nudge} className={`timer-dot ${state} ${nudge ? "nudge" : ""}`} role="timer">
        {m}:{String(s).padStart(2, "0")}
      </span>
      {paused && (
        <span className="paused-tag fine">
          <PauseIcon size={12} />
          Paused
        </span>
      )}
    </button>
  );
}
