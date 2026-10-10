import { useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from "react";
import { useTranslation } from "../../i18n/react";
import { clamp01 } from "../../ui/easing";
import { Sheet } from "../../ui/Sheet";
import { hexToHsv, hsvToHex, type Hsv } from "../canvas/color";
import { colorName, SWATCHES } from "./palette";
import { useDrag } from "./useDrag";
import "./ColorSheet.css";

/** Touching the pad while the color is darker than this lifts it to `LIFT_TO`, so the hue shows. */
const DARK = 0.12;
const LIFT_TO = 0.85;
/** Arrow keys move the hue by `HUE_STEP` degrees and saturation and brightness by `STEP`. */
const HUE_STEP = 6;
const STEP = 0.05;

const SWATCH_HEXES = SWATCHES.map((s) => s.hex);

/** Where the pad's cursor and the brightness thumb sit for a color, as CSS draws them. */
function hsvStyle({ h, s, v }: Hsv): CSSProperties {
  return {
    "--x": `${(h / 360) * 100}%`,
    "--y": `${(1 - s) * 100}%`,
    "--v": `${v * 100}%`,
    "--full": hsvToHex({ h, s, v: 1 }),
  };
}

interface Props {
  id: string;
  open: boolean;
  /** The drawing screen: it stays live around the sheet, so a tap on the canvas closes it. */
  layer: RefObject<HTMLElement | null>;
  color: string;
  recent: string[];
  onPick: (hex: string) => void;
  /** A color in hand on the pad or the brightness bar, shown everywhere the color shows, not yet picked. */
  onPreview: (hex: string) => void;
  onClose: () => void;
}

/** The color sheet: recent colors, a hue and saturation pad, a brightness bar, and the swatches. */
export function ColorSheet({ open, layer, onClose, ...picker }: Props) {
  const { t } = useTranslation();
  return (
    <Sheet
      label={t(($) => $.stickerCreation.colorSheet.title)}
      open={open}
      layer={layer}
      className="color-sheet"
      onClose={onClose}
    >
      <ColorPicker {...picker} />
    </Sheet>
  );
}

function ColorPicker({
  id,
  color,
  recent,
  onPick,
  onPreview,
}: Omit<Props, "open" | "layer" | "onClose">) {
  const { t } = useTranslation();
  // Hue and saturation survive a trip through black or white here, which a hex can't carry.
  const [picked, setPicked] = useState(() => ({ color, hsv: hexToHsv(color) }));
  if (picked.color !== color) setPicked({ color, hsv: hexToHsv(color) });
  const body = useRef<HTMLDivElement>(null);
  const live = useRef(picked.hsv);

  const show = (hsv: Hsv) => {
    live.current = hsv;
    for (const [name, v] of Object.entries(hsvStyle(hsv)))
      body.current?.style.setProperty(name, String(v));
    onPreview(hsvToHex(hsv));
  };
  const commit = (hsv: Hsv) => {
    const hex = hsvToHex(hsv);
    setPicked({ color: hex, hsv });
    onPick(hex);
  };

  // A drag the sheet's going cuts off picks nothing, so the screen shows the drawn color again.
  const dropPreview = () => onPreview(color);

  const pad = useDrag({
    onStart: () => (live.current = picked.hsv),
    onMove: (x, y, box) =>
      show({
        h: Math.min(0.999, clamp01((x - box.left) / box.width)) * 360,
        s: 1 - clamp01((y - box.top) / box.height),
        v: live.current.v < DARK ? LIFT_TO : live.current.v,
      }),
    onEnd: () => commit(live.current),
    onAbandon: dropPreview,
  });
  const brightness = useDrag({
    onStart: () => (live.current = picked.hsv),
    onMove: (x, _y, box) => show({ ...live.current, v: clamp01((x - box.left) / box.width) }),
    onEnd: () => commit(live.current),
    onAbandon: dropPreview,
  });

  const { h, s, v } = picked.hsv;
  const onPadKey = (e: KeyboardEvent) => {
    const [dh, ds] = {
      ArrowLeft: [-HUE_STEP, 0],
      ArrowRight: [HUE_STEP, 0],
      ArrowUp: [0, STEP],
      ArrowDown: [0, -STEP],
    }[e.key] ?? [0, 0];
    if (!dh && !ds) return;
    e.preventDefault();
    commit({ h: (h + dh + 360) % 360, s: clamp01(s + ds), v: v < DARK ? LIFT_TO : v });
  };
  const onBrightnessKey = (e: KeyboardEvent) => {
    const dv = { ArrowRight: STEP, ArrowUp: STEP, ArrowLeft: -STEP, ArrowDown: -STEP }[e.key];
    if (!dv) return;
    e.preventDefault();
    commit({ h, s, v: clamp01(v + dv) });
  };

  return (
    <div id={id} ref={body} className="color-picker" style={hsvStyle(picked.hsv)}>
      <header className="color-head">
        <h2 className="color-title">{t(($) => $.stickerCreation.colorSheet.title)}</h2>
        <span className="color-now" />
      </header>
      <div className="color-recent">
        <span className="color-label" aria-hidden="true">
          {t(($) => $.stickerCreation.colorSheet.recent)}
        </span>
        <Swatches
          label={t(($) => $.stickerCreation.colorSheet.recentColors)}
          colors={recent}
          color={color}
          small
          onPick={onPick}
        />
      </div>
      <div
        className="color-pad"
        role="slider"
        tabIndex={0}
        aria-label={t(($) => $.stickerCreation.colorSheet.huePad)}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(h)}
        aria-valuetext={t(($) => $.stickerCreation.colorSheet.huePadValue, {
          hue: Math.round(h),
          saturation: Math.round(s * 100),
        })}
        onKeyDown={onPadKey}
        {...pad}
      >
        <span className="color-pad-cursor" />
      </div>
      <div
        className="color-brightness"
        role="slider"
        tabIndex={0}
        aria-label={t(($) => $.stickerCreation.colorSheet.brightness)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(v * 100)}
        onKeyDown={onBrightnessKey}
        {...brightness}
      >
        <span className="color-brightness-thumb" />
      </div>
      {/* Last, so a short screen shows the pad first and the swatches wait behind a scroll. */}
      <Swatches
        label={t(($) => $.stickerCreation.colorSheet.swatches)}
        colors={SWATCH_HEXES}
        color={color}
        columns={10}
        onPick={onPick}
      />
    </div>
  );
}

interface SwatchesProps {
  label: string;
  colors: readonly string[];
  color: string;
  /** Arrow keys move by a row of this many; a single row by default. */
  columns?: number;
  small?: boolean;
  onPick: (hex: string) => void;
}

/** A row or grid of color dots, one of which may be the current color. Arrow keys pick as they move. */
function Swatches({ label, colors, color, columns, small = false, onPick }: SwatchesProps) {
  const current = Math.max(0, colors.indexOf(color));
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const row = columns ?? colors.length;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: row, ArrowUp: -row }[e.key];
    if (!step) return;
    const dots = [...e.currentTarget.querySelectorAll("button")];
    const at = dots.findIndex((dot) => dot === document.activeElement);
    if (at < 0) return;
    e.preventDefault();
    const next = (at + step + colors.length) % colors.length;
    dots[next].focus();
    onPick(colors[next]);
  };
  return (
    <div
      className={small ? "color-recent-row" : "color-swatches"}
      role="radiogroup"
      aria-label={label}
      onKeyDown={onKeyDown}
    >
      {colors.map((hex, i) => (
        <button
          key={hex}
          type="button"
          role="radio"
          className={`swatch ${small ? "is-small" : ""}`}
          aria-checked={hex === color}
          aria-label={colorName(hex)}
          tabIndex={i === current ? 0 : -1}
          style={{ "--c": hex }}
          onClick={() => onPick(hex)}
        />
      ))}
    </div>
  );
}
