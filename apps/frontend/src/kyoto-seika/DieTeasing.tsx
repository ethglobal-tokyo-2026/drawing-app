import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import type { DealLayout } from "./balloonGeometry";
import {
  BURST,
  BURST_MS,
  COUNT_MS,
  FADE_IN_OUT,
  JOLT,
  JOLT_MS,
  TEASE_MS,
  teaseIn,
} from "./dealMotion";
import { BANG_SHARDS } from "./dieArt";
import { countPlacement, teasePlacement } from "./teasePlacement";
import "./die-teasing.css";

/** The burst: white, Tomato and Seal Yellow stars, each with its outer and inner radius, in px. */
const BURST_STARS = [
  { className: "die-bang__outer", outer: 78, inner: 44, turn: 0 },
  { className: "die-bang__middle", outer: 50, inner: 28, turn: 0.2 },
  { className: "die-bang__core", outer: 26, inner: 14, turn: 0.5 },
] as const;
const SPIKES = 16;
/** How much of the outer star's reach stays inside the screen's sides. */
const BURST_INSIDE = 0.8;
const CHIPS = 9;

interface LineProps {
  layout: DealLayout;
  /** The line, or the countdown's number. */
  text: string;
  count: boolean;
  reduced: boolean;
}

/** The die's line in manga hand lettering (書き文字), or its countdown's number just by the die. */
export function TeaseLine({ layout, text, count, reduced }: LineProps) {
  const { i18n } = useTranslation();
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const line = el.current;
    if (!line) return;
    const size = { w: line.offsetWidth, h: line.offsetHeight };
    const at = count ? countPlacement(layout, size) : teasePlacement(layout, size);
    line.style.left = `${at.left}px`;
    line.style.top = `${at.top}px`;
    const duration = count ? COUNT_MS : TEASE_MS;
    line.animate(reduced ? FADE_IN_OUT : teaseIn(count ? 0 : -6), { duration, fill: "forwards" });
  }, [layout, count, reduced]);
  return (
    <div
      ref={el}
      className={`die-tease ${count ? "is-count" : ""}`}
      lang={count ? undefined : i18n.language}
      aria-hidden="true"
    >
      {text}
    </div>
  );
}

/** One star's points, its spikes jittered so no two bangs look alike. */
function starPoints(outer: number, inner: number, turn: number) {
  return Array.from({ length: SPIKES * 2 }, (_, k) => {
    const angle = (k / (SPIKES * 2)) * Math.PI * 2 + turn;
    const radius =
      k % 2 ? inner * (0.8 + Math.random() * 0.25) : outer * (0.85 + Math.random() * 0.3);
    return `${(Math.cos(angle) * radius).toFixed(1)},${(Math.sin(angle) * radius).toFixed(1)}`;
  }).join(" ");
}

interface BangProps {
  layout: DealLayout;
  /** The clouds, which jolt. */
  balloonEl: () => HTMLElement | null;
}

/**
 * The bang, the moment the last roll lands: a manga burst from the die, a spray of its shards, and the
 * clouds jolt. No lettering: the burst says it. Under reduced motion there's none, only the broken die.
 */
export function DieBang({ layout, balloonEl }: BangProps) {
  const burst = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const die = [layout.die.x, layout.die.y] as const;
  // A die near the screen's side bursts a little inward, so the whole star shows.
  const reach = BURST_STARS[0].outer * BURST_INSIDE;
  const x = Math.min(Math.max(die[0], reach), layout.width - reach);

  // The bang plays once, as it goes off: renders after it, with a new `balloonEl`, never replay it.
  const goOff = useEffectEvent(() => {
    burst.current?.animate(BURST, { duration: BURST_MS, easing: EASE_OUT, fill: "forwards" });
    balloonEl()?.animate(JOLT, { duration: JOLT_MS });
    for (const chip of chips.current?.children ?? []) {
      const angle = Math.random() * Math.PI * 2;
      const reach = 50 + Math.random() * 70;
      chip.animate(
        [
          { translate: "0 0", rotate: "0deg", opacity: 1 },
          {
            translate: `${Math.cos(angle) * reach}px ${Math.sin(angle) * reach + 30}px`,
            rotate: `${(Math.random() - 0.5) * 720}deg`,
            opacity: 0,
          },
        ],
        { duration: 700 + Math.random() * 300, easing: EASE_OUT, fill: "forwards" },
      );
    }
  });
  useEffect(() => goOff(), []);

  return (
    <div className="die-bang" aria-hidden="true">
      <div ref={burst} className="die-bang__burst" style={{ left: x, top: die[1] }}>
        <svg width="1" height="1">
          {BURST_STARS.map((star) => (
            <polygon
              key={star.className}
              className={star.className}
              points={starPoints(star.outer, star.inner, star.turn)}
            />
          ))}
        </svg>
      </div>
      <div ref={chips} className="die-bang__chips" style={{ left: x, top: die[1] }}>
        {Array.from({ length: CHIPS }, (_, i) => (
          <svg key={i} className="die-bang__chip" viewBox="-7 -7 14 14" width="14" height="14">
            <path className="die-bang__chip-white" d={BANG_SHARDS[i % BANG_SHARDS.length].white} />
            <path className="die-bang__chip-ink" d={BANG_SHARDS[i % BANG_SHARDS.length].ink} />
          </svg>
        ))}
      </div>
    </div>
  );
}
