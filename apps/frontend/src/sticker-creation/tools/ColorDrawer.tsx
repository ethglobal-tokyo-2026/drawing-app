import { useRef, useState } from "react";
import { hexToHsv, hsvToHex, type HSV } from "../canvas/color";
import { HSlider } from "./HSlider";
import { PALETTE } from "./palette";
import { Sheet } from "./Sheet";
import { SpectrumPad } from "./SpectrumPad";

interface ColorDrawerProps {
  color: string;
  recent: string[];
  onChange: (color: string) => void;
  /** Commit the color to the recent row (after a pick or drag ends). */
  onCommit: (color: string) => void;
  onClose: () => void;
}

export function ColorDrawer({ color, recent, onChange, onCommit, onClose }: ColorDrawerProps) {
  // Kept locally so hue survives greys and black (where hex loses it).
  const [hsv, setHsv] = useState<HSV>(() => hexToHsv(color));
  const latest = useRef(color);

  const set = (next: HSV) => {
    setHsv(next);
    latest.current = hsvToHex(next);
    onChange(latest.current);
  };
  const pick = (hex: string) => {
    setHsv(hexToHsv(hex));
    latest.current = hex;
    onChange(hex);
    onCommit(hex);
  };
  const bright = hsvToHex({ ...hsv, v: 1 });

  return (
    <Sheet onClose={onClose}>
      <div className="sheet-head">
        <h2>Color</h2>
        <span className="current-color" style={{ background: color }} />
      </div>
      <div className="recent">
        <span className="recent-label fine">Recent</span>
        {recent.map((c) => (
          <button
            key={c}
            className={`dot ${c === color ? "on" : ""}`}
            style={{ background: c }}
            onClick={() => pick(c)}
            aria-label={`Recent ${c}`}
          />
        ))}
      </div>
      <div className="palette">
        {PALETTE.map((c) => (
          <button
            key={c}
            className={`dot ${c === color ? "on" : ""}`}
            style={{ background: c }}
            onClick={() => pick(c)}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <SpectrumPad
        hue={hsv.h}
        sat={hsv.s}
        color={color}
        onChange={(h, s) => set({ h, s, v: hsv.v < 0.15 ? 1 : hsv.v })}
        onEnd={() => onCommit(latest.current)}
      />
      <HSlider
        label="Brightness"
        value={hsv.v}
        background={`linear-gradient(90deg, #000, ${bright})`}
        onChange={(v) => set({ ...hsv, v })}
        onEnd={() => onCommit(latest.current)}
      />
    </Sheet>
  );
}
