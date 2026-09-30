import { useEffect, useEffectEvent, useId, useRef } from "react";
import { useTranslation } from "../../i18n/react";
import "./SmoothingBar.css";

interface Props {
  id: string;
  open: boolean;
  /** 0 (Raw) to 100 (Smooth). */
  value: number;
  onChange: (value: number) => void;
}

/**
 * Smoothing: a compact bar under the tools, Raw to Smooth. Smoothing has no standard icon, so its name
 * shows here, and only while the bar is open. The track redraws as the thumb moves; the value lands
 * once the thumb is let go.
 */
export function SmoothingBar({ id, open, value, onChange }: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const range = useRef<HTMLInputElement>(null);
  const commit = useEffectEvent(onChange);

  useEffect(() => {
    const input = range.current;
    if (!input) return;
    const onCommit = () => commit(input.valueAsNumber);
    // The native change event fires on release, where React's onChange fires on every step.
    input.addEventListener("change", onCommit);
    return () => input.removeEventListener("change", onCommit);
  }, []);

  // The slider is the one that moves the value; a value that came from elsewhere, such as a kept
  // drawing picked back up, moves the slider to it.
  useEffect(() => {
    const input = range.current;
    if (input && input.valueAsNumber !== value) input.value = String(value);
  }, [value]);

  return (
    <div
      id={id}
      className={`smoothing-bar ${open ? "is-open" : ""}`}
      role="group"
      aria-labelledby={titleId}
    >
      <span className="smoothing-title" id={titleId}>
        {t(($) => $.stickerCreation.tools.smoothing)}
      </span>
      <span className="smoothing-end" aria-hidden="true">
        {t(($) => $.stickerCreation.smoothingBar.raw)}
      </span>
      <input
        ref={range}
        className="smoothing-range"
        type="range"
        min={0}
        max={100}
        step={1}
        defaultValue={value}
        aria-label={t(($) => $.stickerCreation.tools.smoothing)}
        style={{ "--p": `${value}%` }}
        onInput={(e) => e.currentTarget.style.setProperty("--p", `${e.currentTarget.value}%`)}
      />
      <span className="smoothing-end" aria-hidden="true">
        {t(($) => $.stickerCreation.smoothingBar.smooth)}
      </span>
    </div>
  );
}
