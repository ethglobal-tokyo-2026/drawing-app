import { HSlider } from "./HSlider";
import { Sheet } from "./Sheet";

interface SmoothnessDrawerProps {
  value: number; // 0..100
  pressure: boolean;
  fingerDraws: boolean;
  onChange: (value: number) => void;
  onPressure: (on: boolean) => void;
  onFingerDraws: (on: boolean) => void;
  onClose: () => void;
}

export function SmoothnessDrawer(p: SmoothnessDrawerProps) {
  return (
    <Sheet onClose={p.onClose}>
      <div className="sheet-head">
        <h2>Smoothness</h2>
        <span className="value-badge">{p.value}</span>
      </div>
      <HSlider
        label="Smoothness"
        value={p.value / 100}
        background="linear-gradient(90deg, #e5e5ea, #f6d84c)"
        onChange={(v) => p.onChange(Math.round(v * 100))}
      />
      <div className="hint">
        <span>Less lag</span>
        <span>Smoother lines</span>
      </div>
      <div className="settings-card">
        <label className="row">
          <span>Pen pressure</span>
          <input
            type="checkbox"
            className="switch"
            checked={p.pressure}
            onChange={(e) => p.onPressure(e.target.checked)}
          />
        </label>
        <label className="row">
          <span>Draw with finger</span>
          <input
            type="checkbox"
            className="switch"
            checked={p.fingerDraws}
            onChange={(e) => p.onFingerDraws(e.target.checked)}
          />
        </label>
      </div>
      <p className="hint center">Two-finger tap to undo · three-finger tap to redo</p>
    </Sheet>
  );
}
