import { useDrag } from "./useDrag";

interface SpectrumProps {
  hue: number;
  sat: number;
  color: string;
  onChange: (hue: number, sat: number) => void;
  onEnd?: () => void;
}

/** Hue across, saturation fading to white downwards. */
export function SpectrumPad({ hue, sat, color, onChange, onEnd }: SpectrumProps) {
  const drag = useDrag((fx, fy) => onChange(fx * 360, 1 - fy), onEnd);
  return (
    <div
      className="spectrum"
      {...drag}
      role="slider"
      aria-label="Hue and saturation"
      aria-valuenow={Math.round(hue)}
    >
      <span
        className="spectrum-thumb"
        style={{ left: `${(hue / 360) * 100}%`, top: `${(1 - sat) * 100}%`, background: color }}
      />
    </div>
  );
}
