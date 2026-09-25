import { HSlider } from "./HSlider";

interface Props {
  value: number; // 0..100
  pressure: boolean;
  fingerDraws: boolean;
  onChange: (value: number) => void;
  onPressure: (on: boolean) => void;
  onFingerDraws: (on: boolean) => void;
}

/** A compact label-stock bar under the tools; its title shows only while it's open. */
export function SmoothingBar(p: Props) {
  return (
    <div className="smoothing-bar" role="group" aria-label="Smoothing">
      <div className="smoothing-title">Smoothing</div>
      <div className="smoothing-row">
        <span className="fine">Raw</span>
        <HSlider
          label="Smoothing"
          value={p.value / 100}
          background="linear-gradient(90deg, var(--liner-deep), var(--seal))"
          onChange={(v) => p.onChange(Math.round(v * 100))}
        />
        <span className="fine">Smooth</span>
      </div>
      <div className="smoothing-options">
        <button
          type="button"
          className={`chip ${p.pressure ? "on" : ""}`}
          aria-pressed={p.pressure}
          onClick={() => p.onPressure(!p.pressure)}
        >
          Pen pressure
        </button>
        <button
          type="button"
          className={`chip ${p.fingerDraws ? "on" : ""}`}
          aria-pressed={p.fingerDraws}
          onClick={() => p.onFingerDraws(!p.fingerDraws)}
        >
          Draw with finger
        </button>
      </div>
      <p className="smoothing-hint fine">Two-finger tap undo · three-finger tap redo</p>
    </div>
  );
}
