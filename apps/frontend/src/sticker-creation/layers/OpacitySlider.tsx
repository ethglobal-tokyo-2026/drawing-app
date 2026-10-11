import {
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  type KeyboardEvent,
  type PointerEvent,
} from "react";
import { useTranslation } from "../../i18n/react";
import { capturePointer } from "../../ui/capturePointer";
import { clamp } from "../../ui/easing";
import "./OpacitySlider.css";

/** How far an arrow key moves opacity, in percent. */
export const KEY_STEP = 5;
const THUMB_SIZE = 16;
export interface OpacitySliderProps {
  value: number;
  /** Live preview; no history step until release. */
  onPreview: (value: number) => void;
  onCommit: (value: number) => void;
  onHold: (holding: boolean) => void;
}

/** A horizontal native range in the layer menu, with one durable change per completed drag. */
export function OpacitySlider({ value, onPreview, onCommit, onHold }: OpacitySliderProps) {
  const { t } = useTranslation();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const output = useRef<HTMLOutputElement>(null);
  const held = useRef<{
    pointer: number;
    from: number;
    shown: number;
    grabOffset: number;
  } | null>(null);
  const show = useCallback(
    (next: number) => {
      if (input.current) {
        input.current.value = String(next);
        input.current.style.setProperty("--p", `${next}%`);
        input.current.setAttribute("aria-valuenow", String(next));
        input.current.setAttribute(
          "aria-valuetext",
          t(($) => $.stickerCreation.opacitySlider.value, { value: next }),
        );
      }
      if (output.current)
        output.current.textContent = t(($) => $.stickerCreation.opacitySlider.value, {
          value: next,
        });
    },
    [t],
  );
  useLayoutEffect(() => {
    if (!held.current) show(value);
  }, [value, show]);
  const cancel = () => {
    const drag = held.current;
    if (!drag) return;
    held.current = null;
    if (drag.shown !== drag.from) onPreview(drag.from);
    show(drag.from);
    onHold(false);
  };
  const abandon = useEffectEvent(cancel);
  useEffect(() => () => abandon(), []);
  const end = (event: PointerEvent<HTMLInputElement>, canceled: boolean) => {
    const drag = held.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    if (canceled) {
      cancel();
      return;
    }
    held.current = null;
    if (drag.shown !== drag.from) onCommit(drag.shown);
    onHold(false);
  };
  const move = (event: PointerEvent<HTMLInputElement>) => {
    const drag = held.current;
    if (!drag || drag.pointer !== event.pointerId) return;
    const box = event.currentTarget.getBoundingClientRect();
    const travel = box.width - THUMB_SIZE;
    if (travel <= 0) return;
    const next = Math.round(
      clamp(((event.clientX - box.left - THUMB_SIZE / 2 - drag.grabOffset) / travel) * 100, 0, 100),
    );
    if (next === drag.shown) return;
    drag.shown = next;
    show(next);
    onPreview(next);
  };
  const key = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || held.current) return;
    const next =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? 100
          : ["ArrowUp", "ArrowRight"].includes(event.key)
            ? clamp(value + KEY_STEP, 0, 100)
            : ["ArrowDown", "ArrowLeft"].includes(event.key)
              ? clamp(value - KEY_STEP, 0, 100)
              : null;
    if (next === null) return;
    event.preventDefault();
    event.stopPropagation();
    if (next !== value) onCommit(next);
  };
  return (
    <div className="opacity-row">
      <label htmlFor={id}>{t(($) => $.stickerCreation.opacitySlider.label)}</label>
      <input
        ref={input}
        id={id}
        className="opacity-slider"
        type="range"
        min={0}
        max={100}
        step={1}
        defaultValue={value}
        aria-orientation="horizontal"
        aria-valuenow={value}
        aria-valuetext={t(($) => $.stickerCreation.opacitySlider.value, { value })}
        style={{ "--p": `${value}%`, "--thumb-size": `${THUMB_SIZE}px` }}
        onKeyDown={key}
        onPointerDown={(event) => {
          if (held.current || (event.pointerType === "mouse" && event.button !== 0)) return;
          // WebKit's native thumb stops dragging if its input captures the pointer. Handle
          // travel here so capture, focus and cancellation behave the same for every pointer.
          event.preventDefault();
          event.currentTarget.focus({ preventScroll: true });
          const box = event.currentTarget.getBoundingClientRect();
          const center = box.left + THUMB_SIZE / 2 + ((box.width - THUMB_SIZE) * value) / 100;
          const grabOffset = event.clientX - center;
          held.current = {
            pointer: event.pointerId,
            from: value,
            shown: value,
            grabOffset: Math.abs(grabOffset) <= THUMB_SIZE / 2 ? grabOffset : 0,
          };
          capturePointer(event.currentTarget, event.pointerId);
          onHold(true);
          move(event);
        }}
        onPointerMove={move}
        onInput={(event) => {
          const next = event.currentTarget.valueAsNumber;
          show(next);
          if (held.current) {
            held.current.shown = next;
            onPreview(next);
          } else if (next !== value) onCommit(next);
        }}
        onPointerUp={(event) => end(event, false)}
        onPointerCancel={(event) => end(event, true)}
        onLostPointerCapture={(event) => end(event, true)}
        onBlur={() => cancel()}
      />
      <output ref={output} htmlFor={id} aria-hidden="true">
        {t(($) => $.stickerCreation.opacitySlider.value, { value })}
      </output>
    </div>
  );
}
