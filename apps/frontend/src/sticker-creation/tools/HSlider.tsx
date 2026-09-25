import { useDrag } from "./useDrag";

interface HSliderProps {
  value: number; // 0..1
  onChange: (v: number) => void;
  onEnd?: () => void;
  background: string;
  thumbColor?: string;
  label: string;
}

/** Horizontal pill slider (brightness, smoothness). */
export function HSlider({
  value,
  onChange,
  onEnd,
  background,
  thumbColor = "#fff",
  label,
}: HSliderProps) {
  const drag = useDrag((fx) => onChange(fx), onEnd);
  return (
    <div
      className="hslider"
      style={{ background }}
      role="slider"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      {...drag}
    >
      <span className="hslider-thumb" style={{ left: `${value * 100}%`, background: thumbColor }} />
    </div>
  );
}
