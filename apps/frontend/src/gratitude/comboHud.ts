import { formatCount } from "../i18n/format";
import { i18next } from "../i18n/i18n";
import { fullBarSeconds } from "./combo";
import { EASE_OUT, EASE_PEEL, clamp } from "./easing";
import { HEART_SVG } from "./heartArt";

/** The combo as the HUD draws it. */
export interface HudView {
  total: number;
  multiplier: number;
  secondsLeft: number;
  /** secondsLeft over a full bar's seconds, 0–1. */
  barFill: number;
  running: boolean;
}

export interface ComboHud {
  show: (on: boolean) => void;
  /** A hit's tick: a sliver of the time it added at the bar's end, and a "+0.2s" over it. */
  hit: (secondsAdded: number) => void;
  step: (real: number, view: HudView) => void;
}

/** Shares of a full bar: below HOT the bar heats up and shivers, below BLINK it blinks too. */
const HOT = 0.3;
const BLINK = 0.12;
/** A hit that adds less than this, in s, shows no tick. */
const TICK_MIN_S = 0.05;
/** At a mash the labels would stack: one at most this often, in s. */
const LABEL_GAP_S = 0.13;
const LABEL_MS = 540;
/** A label this close in px to the last one, while that one shows, takes its place instead. */
const LABEL_NEAR_PX = 36;
const LABELS = 5;
const SLIVERS = 8;
/** Until the track is measured. */
const FALLBACK_TRACK_PX = 300;

/** A pooled element and the animation it was last given, cancelled when it's reused. */
interface Pooled<E extends HTMLElement> {
  el: E;
  animation: Animation | null;
}

function element<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className: string,
  ...children: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const el = document.createElement(tag);
  if (className) el.className = className;
  el.append(...children);
  return el;
}

/** The oldest in the pool once it's full, otherwise a new one. */
function recycle<E extends HTMLElement>(pool: Pooled<E>[], cap: number, make: () => E): Pooled<E> {
  const item = (pool.length >= cap ? pool.shift() : undefined) ?? { el: make(), animation: null };
  pool.push(item);
  return item;
}

/** Cancelling an animation rejects its `finished`: browsers mark that handled, happy-dom doesn't. */
function animate(
  el: HTMLElement,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation {
  const animation = el.animate(frames, options);
  void animation.finished.catch(rethrowUnlessCancelled);
  return animation;
}

function rethrowUnlessCancelled(error: unknown) {
  if (!(error instanceof Error && error.name === "AbortError")) throw error;
}

function play(item: Pooled<HTMLElement>, frames: Keyframe[], options: KeyframeAnimationOptions) {
  item.animation?.cancel();
  item.animation = animate(item.el, frames, options);
}

/** The bar that only goes down, the amount counting up under it and the multiplier sticker. */
export function createComboHud(
  hud: HTMLElement,
  options: { reduced: () => boolean; random: () => number },
): ComboHud {
  const { reduced, random } = options;
  const fullBar = fullBarSeconds();

  const hot = element("div", "gr-timer-hot");
  const fill = element("div", "gr-timer-fill", hot);
  const ticks = element("div", "gr-timer-ticks");
  const head = element("div", "gr-timer-head");
  const track = element("div", "gr-timer-track", fill, ticks, head);
  const seconds = document.createTextNode("0.0");
  const unit = element(
    "small",
    "",
    i18next.t(($) => $.gratitude.hud.secondsUnit),
  );
  const row = element("div", "gr-timer", track, element("span", "gr-timer-s", seconds, unit));
  const amountNumber = document.createTextNode("0");
  const heart = element("i", "");
  heart.innerHTML = HEART_SVG;
  const amount = element("div", "gr-amount", element("b", "", amountNumber), heart);
  const multNumber = document.createTextNode("1.0");
  const multiplier = element(
    "div",
    "gr-mult",
    element("span", "", "×"),
    element("b", "", multNumber),
  );
  const readout = element("div", "gr-readout", amount, multiplier);
  // The engine announces the figures; the HUD is for the eyes.
  for (const part of [row, readout]) part.setAttribute("aria-hidden", "true");
  hud.append(row, readout);

  let shown = false;
  /** The HUD's own real-time clock, in s: it paces the blink and the labels. */
  let clock = 0;
  let trackWidth = FALLBACK_TRACK_PX;
  /** The bar as last drawn, raised by each hit until the next step redraws it. */
  let fillShare = 0;
  let countedTotal = 0;
  let amountShown = 0;
  let wholeMultiplier = 1;
  let lastLabelAt = -Infinity;
  let lastLabel: { item: Pooled<HTMLSpanElement>; x: number } | null = null;
  let amountPulse: Animation | null = null;
  let multiplierPulse: Animation | null = null;
  const labels: Pooled<HTMLSpanElement>[] = [];
  const slivers: Pooled<HTMLDivElement>[] = [];

  const setText = (node: Text, text: string) => {
    if (node.data !== text) node.data = text;
  };

  function pulseMultiplier() {
    if (reduced()) return;
    multiplierPulse?.cancel();
    // Keyframes replace the sticker's resting tilt, so they carry it.
    multiplierPulse = animate(
      multiplier,
      [
        { transform: "rotate(-4deg) scale(1.55)" },
        { offset: 0.5, transform: "rotate(-4deg) scale(.9)" },
        { transform: "rotate(-4deg) scale(1)" },
      ],
      { duration: 320, easing: EASE_PEEL },
    );
  }

  return {
    show(on) {
      shown = on;
      // Measured here, when the combo starts, so the frame loop never reads layout.
      if (on) trackWidth = track.clientWidth || FALLBACK_TRACK_PX;
      else row.style.transform = "";
    },

    hit(secondsAdded) {
      if (!reduced()) {
        amountPulse?.cancel();
        amountPulse = animate(amount, [{ transform: "scale(1.05)" }, { transform: "scale(1)" }], {
          duration: 110,
        });
      }
      if (secondsAdded < TICK_MIN_S) return;

      const share = secondsAdded / fullBar;
      fillShare = Math.min(1, fillShare + share);
      const x = fillShare * trackWidth;
      const sliverWidth = Math.max(3, share * trackWidth);
      const sliver = recycle(slivers, SLIVERS, () => ticks.appendChild(element("div", "gr-seg")));
      sliver.el.style.width = `${sliverWidth.toFixed(1)}px`;
      const end = `translateX(${(x - sliverWidth).toFixed(1)}px)`;
      play(
        sliver,
        [
          { transform: end, opacity: 0.95 },
          { transform: end, opacity: 0 },
        ],
        { duration: 380, easing: EASE_OUT, fill: "both" },
      );

      const showing = clock - lastLabelAt < LABEL_MS / 1000;
      if (clock - lastLabelAt < LABEL_GAP_S) return;
      lastLabelAt = clock;
      const labelX = Math.min(x, trackWidth - 10);
      // Labels in quick succession would sit on each other: a label near the last one replaces it.
      const label =
        showing && lastLabel && Math.abs(labelX - lastLabel.x) < LABEL_NEAR_PX
          ? lastLabel.item
          : recycle(labels, LABELS, () => ticks.appendChild(element("span", "gr-tick")));
      lastLabel = { item: label, x: labelX };
      label.el.textContent = i18next.t(($) => $.gratitude.hud.secondsAdded, {
        seconds: secondsAdded.toFixed(1),
      });
      // Over the bar's end, in the HUD's lane above the bar: it rises out of the bar, never past the HUD's top.
      const at = `translateX(${labelX.toFixed(1)}px) translateX(-50%)`;
      play(
        label,
        reduced()
          ? [
              { transform: at, opacity: 0 },
              { offset: 0.18, transform: at, opacity: 1 },
              { transform: at, opacity: 0 },
            ]
          : [
              { transform: `${at} translateY(5px) scale(.6)`, opacity: 0 },
              { offset: 0.18, transform: `${at} translateY(0) scale(1)`, opacity: 1 },
              { transform: `${at} translateY(-2px) scale(.96)`, opacity: 0 },
            ],
        { duration: LABEL_MS, easing: EASE_OUT, fill: "both" },
      );
    },

    step(real, view) {
      clock += real;
      if (!shown) return;

      const f = clamp(view.barFill, 0, 1);
      fillShare = f;
      fill.style.transform = `scaleX(${Math.max(0.0001, f).toFixed(4)})`;
      head.style.transform = `translateX(${(f * trackWidth).toFixed(1)}px)`;
      const low = f < HOT ? 1 - f / HOT : 0;
      // Slower than the flash rate that can trigger seizures.
      const blink = f < BLINK && Math.sin(clock * Math.PI * 5) < 0 ? 0.55 : 1;
      hot.style.opacity = low ? ((0.35 + 0.65 * low) * blink).toFixed(3) : "0";
      head.style.opacity = low ? (0.45 + 0.55 * low).toFixed(3) : "0";
      if (low && view.running && !reduced()) {
        const amplitude = 0.5 + 2.6 * low;
        const dx = (random() - 0.5) * 2 * amplitude;
        const dy = (random() - 0.5) * amplitude;
        row.style.transform = `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px)`;
      } else if (row.style.transform) row.style.transform = "";

      countedTotal += (view.total - countedTotal) * Math.min(1, real * 12);
      if (Math.abs(view.total - countedTotal) < 0.6) countedTotal = view.total;
      const rounded = Math.round(countedTotal);
      if (rounded !== amountShown) {
        amountShown = rounded;
        amountNumber.data = formatCount(rounded);
      }
      setText(multNumber, view.multiplier.toFixed(1));
      setText(seconds, view.secondsLeft.toFixed(1));

      const whole = Math.floor(view.multiplier + 1e-6);
      if (whole > wholeMultiplier) pulseMultiplier();
      wholeMultiplier = whole;
    },
  };
}
