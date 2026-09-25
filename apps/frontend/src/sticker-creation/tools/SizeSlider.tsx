import { useState } from "react";
import { useDrag } from "./useDrag";
import "./SizeSlider.css";

interface SizeSliderProps {
  value: number; // 0..1
  previewSize: number;
  previewColor: string;
  onChange: (v: number) => void;
  /** A finger on the rail holds the clock. */
  onActiveChange: (active: boolean) => void;
}

/** Vertical brush-size slider: big dot on top, small at the bottom. */
export function SizeSlider({
  value,
  previewSize,
  previewColor,
  onChange,
  onActiveChange,
}: SizeSliderProps) {
  const [active, setActiveState] = useState(false);
  const setActive = (on: boolean) => {
    setActiveState(on);
    onActiveChange(on);
  };
  const drag = useDrag(
    (_, fy) => onChange(1 - fy),
    () => setActive(false),
  );
  const thumbTop = `${(1 - value) * 100}%`;
  return (
    <div className="size-slider">
      <span className="size-cap big" />
      <div
        className="size-track"
        role="slider"
        aria-label="Brush size"
        aria-valuenow={Math.round(previewSize)}
        {...drag}
        onPointerDown={(e) => {
          setActive(true);
          drag.onPointerDown(e);
        }}
        onPointerCancel={() => setActive(false)}
      >
        <span className="size-rail" />
        <span className="size-thumb" style={{ top: thumbTop }}>
          <span />
        </span>
        {active && (
          <span
            className="size-bubble"
            style={{
              top: thumbTop,
              "--d": `${Math.max(2, previewSize)}px`,
              background: previewColor,
            }}
          />
        )}
      </div>
      <span className="size-cap small" />
      <span className="size-value" aria-hidden>
        {Math.round(previewSize)}px
      </span>
    </div>
  );
}
