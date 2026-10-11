import { useEffect, useEffectEvent, useId, useRef } from "react";
import { useTranslation } from "../../i18n/react";
import { Switch } from "../../ui/Switch";
import type { PostCorrectionSettings } from "../canvas/post-correction/settings";
import type { SmoothingMode } from "../canvas/stabilizer";
import "./panel-bar.css";
import "./SmoothingBar.css";

interface Props {
  id: string;
  open: boolean;
  /** Live strength 0 through 100; the readout displays it as a percentage. */
  value: number;
  onChange: (value: number) => void;
  mode: SmoothingMode;
  onModeChange: (mode: SmoothingMode) => void;
  postCorrection: PostCorrectionSettings;
  onPostChange: (value: PostCorrectionSettings) => void;
}

/**
 * Smoothing: a compact bar under the tools, from zero to full strength. It has no standard icon, so its name
 * shows here, and only while the bar is open. The track redraws as the thumb moves; the value lands
 * once the thumb is let go.
 */
export function SmoothingBar({
  id,
  open,
  value,
  onChange,
  mode,
  onModeChange,
  postCorrection,
  onPostChange,
}: Props) {
  const { t } = useTranslation();
  const titleId = useId();
  const range = useRef<HTMLInputElement>(null);
  const readout = useRef<HTMLOutputElement>(null);
  const postRange = useRef<HTMLInputElement>(null);
  const postValue = useRef<HTMLOutputElement>(null);
  const commit = useEffectEvent(onChange);
  const commitPost = useEffectEvent((strength: number) =>
    onPostChange({ ...postCorrection, strength }),
  );
  const off = t(($) => $.stickerCreation.smoothingBar.off);

  useEffect(() => {
    const input = range.current;
    if (!input) return;
    const onCommit = () => commit(input.valueAsNumber);
    // The native change event fires on release, where React's onChange fires on every step.
    input.addEventListener("change", onCommit);
    return () => input.removeEventListener("change", onCommit);
  }, []);

  useEffect(() => {
    const input = postRange.current;
    if (!input) return;
    const onCommit = () => commitPost(input.valueAsNumber);
    input.addEventListener("change", onCommit);
    return () => input.removeEventListener("change", onCommit);
  }, []);

  // The slider is the one that moves the value; a value that came from elsewhere, such as a kept
  // drawing picked back up, moves the slider to it.
  useEffect(() => {
    const input = range.current;
    if (input && input.valueAsNumber !== value) input.value = String(value);
    input?.style.setProperty("--p", `${value}%`);
    if (readout.current)
      readout.current.textContent = t(($) => $.stickerCreation.smoothingBar.value, { value });
  }, [value, t]);

  useEffect(() => {
    const input = postRange.current;
    if (input) input.value = String(postCorrection.strength);
    if (postValue.current)
      postValue.current.value =
        postCorrection.strength === 0 ? off : String(postCorrection.strength);
  }, [postCorrection.strength, off]);

  return (
    <div
      id={id}
      className={`panel-bar under-tool-strip smoothing-bar ${open ? "is-open" : ""}`}
      role="group"
      aria-labelledby={titleId}
    >
      <span className="smoothing-title" id={titleId}>
        {t(($) => $.stickerCreation.tools.smoothing)}
      </span>
      <input
        ref={range}
        id={`${id}-live`}
        className="smoothing-range"
        type="range"
        min={0}
        max={100}
        step={1}
        defaultValue={value}
        aria-label={t(($) => $.stickerCreation.tools.smoothing)}
        style={{ "--p": `${value}%` }}
        onInput={(e) => {
          e.currentTarget.style.setProperty("--p", `${e.currentTarget.value}%`);
          if (readout.current)
            readout.current.textContent = t(($) => $.stickerCreation.smoothingBar.value, {
              value: e.currentTarget.value,
            });
        }}
      />
      <output ref={readout} className="smoothing-readout" htmlFor={`${id}-live`} aria-hidden="true">
        {t(($) => $.stickerCreation.smoothingBar.value, { value })}
      </output>
      <label className="smoothing-speed-label" htmlFor={`${id}-speed`}>
        {t(($) => $.stickerCreation.smoothingBar.penSpeed)}
      </label>
      <select
        id={`${id}-speed`}
        className="smoothing-speed"
        value={mode}
        aria-describedby={`${id}-speed-help`}
        onChange={(event) => {
          const selected = event.currentTarget.value;
          if (selected === "fixed" || selected === "slow" || selected === "fast")
            onModeChange(selected);
        }}
      >
        <option value="fixed">{t(($) => $.stickerCreation.smoothingBar.fixed)}</option>
        <option value="slow">{t(($) => $.stickerCreation.smoothingBar.slow)}</option>
        <option value="fast">{t(($) => $.stickerCreation.smoothingBar.fast)}</option>
      </select>
      <p className="post-correction-help" id={`${id}-speed-help`}>
        {mode === "slow"
          ? t(($) => $.stickerCreation.smoothingBar.slowHelp)
          : mode === "fast"
            ? t(($) => $.stickerCreation.smoothingBar.fastHelp)
            : t(($) => $.stickerCreation.smoothingBar.penSpeedHelp)}
      </p>
      <div className="smoothing-title smoothing-value-title post-correction-title">
        <label htmlFor={`${id}-post`}>
          {t(($) => $.stickerCreation.smoothingBar.postCorrection)}
        </label>
        <output ref={postValue} htmlFor={`${id}-post`} aria-hidden="true">
          {postCorrection.strength === 0 ? off : postCorrection.strength}
        </output>
      </div>
      <p className="post-correction-help" id={`${id}-post-help`}>
        {t(($) => $.stickerCreation.smoothingBar.postHelp)}
      </p>
      <span className="smoothing-end" aria-hidden="true">
        {off}
      </span>
      <input
        id={`${id}-post`}
        ref={postRange}
        className="smoothing-range"
        type="range"
        min={0}
        max={40}
        step={1}
        defaultValue={postCorrection.strength}
        aria-label={t(($) => $.stickerCreation.smoothingBar.postCorrection)}
        aria-describedby={`${id}-post-help`}
        style={{ "--p": `${postCorrection.strength * 2.5}%` }}
        onInput={(e) => {
          const strength = e.currentTarget.valueAsNumber;
          e.currentTarget.style.setProperty("--p", `${strength * 2.5}%`);
          if (postValue.current) postValue.current.value = strength === 0 ? off : String(strength);
        }}
      />
      <span className="smoothing-end" aria-hidden="true">
        {40}
      </span>
      <fieldset className="post-correction-options" disabled={postCorrection.strength === 0}>
        <legend className="visually-hidden">
          {t(($) => $.stickerCreation.smoothingBar.postCorrection)}
        </legend>
        <label>
          <span>{t(($) => $.stickerCreation.smoothingBar.adjustBySpeed)}</span>
          <Switch
            checked={postCorrection.adjustBySpeed}
            onChange={(adjustBySpeed) => onPostChange({ ...postCorrection, adjustBySpeed })}
          />
        </label>
        <label>
          <span>{t(($) => $.stickerCreation.smoothingBar.adjustByScale)}</span>
          <Switch
            checked={postCorrection.adjustByScale}
            onChange={(adjustByScale) => onPostChange({ ...postCorrection, adjustByScale })}
          />
        </label>
      </fieldset>
    </div>
  );
}
