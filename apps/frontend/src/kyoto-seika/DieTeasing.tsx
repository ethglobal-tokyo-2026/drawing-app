import { useEffect, useEffectEvent, useLayoutEffect, useRef } from "react";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { balloonShapes, shapesBox, type BalloonSpec, type PairLayout } from "./balloonGeometry";
import type { Balloon } from "./deal";
import {
  BOOM_MS,
  BURST,
  BURST_MS,
  COUNT_MS,
  FADE_IN_OUT,
  JOLT,
  JOLT_MS,
  SPRING,
  TEASE_MS,
  teaseIn,
} from "./dealMotion";
import type { DieMood } from "./dieMood";
import { teasePlacement } from "./teasePlacement";
import "./die-teasing.css";

/** A die's face is this wide; the line ends by its right edge. */
const DIE_PX = 32;
/** The burst: white, Tomato and Seal Yellow stars, each with its outer and inner radius, in px. */
const BURST_STARS = [
  { className: "die-bang__outer", outer: 78, inner: 44, turn: 0 },
  { className: "die-bang__middle", outer: 50, inner: 28, turn: 0.2 },
  { className: "die-bang__core", outer: 26, inner: 14, turn: 0.5 },
] as const;
const SPIKES = 16;
const CHIPS = 9;

/** Where the balloon's cloud and die sit on the screen, from the layout, for its line. */
function anchorOf(layout: PairLayout, balloon: Balloon) {
  const spec = layout.specs[balloon];
  const [cx, cy] = layout.centers[balloon];
  const box = shapesBox(balloonShapes(spec, layout.towards[balloon]).body);
  return {
    cloud: { top: cy + box.minY, bottom: cy + box.minY + box.height },
    die: [cx + spec.die[0], cy + spec.die[1]] as const,
  };
}

interface LineProps {
  balloon: Balloon;
  layout: PairLayout;
  /** The line, or the countdown's number. */
  text: string;
  count: boolean;
  reduced: boolean;
}

/** A die's line in manga hand lettering (書き文字), or its countdown's number over the die. */
export function TeaseLine({ balloon, layout, text, count, reduced }: LineProps) {
  const { i18n } = useTranslation();
  const el = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const line = el.current;
    if (!line) return;
    const { cloud, die } = anchorOf(layout, balloon);
    const size = { w: line.offsetWidth, h: line.offsetHeight };
    const at = count
      ? { left: die[0] - size.w / 2, top: die[1] - size.h / 2 }
      : teasePlacement({
          balloon,
          cloud,
          dieRight: die[0] + DIE_PX / 2,
          size,
          screenWidth: line.parentElement?.clientWidth ?? 0,
        });
    line.style.left = `${at.left}px`;
    line.style.top = `${at.top}px`;
    const duration = count ? COUNT_MS : TEASE_MS;
    line.animate(reduced ? FADE_IN_OUT : teaseIn(count ? 0 : -6), { duration, fill: "forwards" });
  }, [balloon, layout, count, reduced]);
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
  balloon: Balloon;
  layout: PairLayout;
  reduced: boolean;
  /** The balloon whose die blew up, to jolt. */
  balloonEl: () => HTMLElement | null;
}

/** The bang: a manga burst from the die, KA-BOOM!, a spray of chips, and the balloon jolts. */
export function DieBang({ balloon, layout, reduced, balloonEl }: BangProps) {
  const { t, i18n } = useTranslation();
  const burst = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const chips = useRef<HTMLDivElement>(null);
  const { cloud, die } = anchorOf(layout, balloon);

  // The bang plays once, as it goes off: renders after it, with a new `balloonEl`, never replay it.
  const goOff = useEffectEvent(() => {
    if (reduced) {
      burst.current?.animate(FADE_IN_OUT, { duration: BURST_MS, fill: "forwards" });
      words.current?.animate(FADE_IN_OUT, { duration: BOOM_MS, fill: "forwards" });
      return;
    }
    burst.current?.animate(BURST, { duration: BURST_MS, easing: EASE_OUT, fill: "forwards" });
    words.current?.animate(teaseIn(-6), { duration: BOOM_MS, easing: SPRING, fill: "forwards" });
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

  const wordsTop = balloon === 0 ? cloud.top - 50 : cloud.bottom + 4;
  return (
    <div className="die-bang" aria-hidden="true">
      <div ref={burst} className="die-bang__burst" style={{ left: die[0], top: die[1] }}>
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
      <div ref={chips} className="die-bang__chips" style={{ left: die[0], top: die[1] }}>
        {Array.from({ length: CHIPS }, (_, i) => (
          <span key={i} className="die-bang__chip" />
        ))}
      </div>
      <div
        ref={words}
        className="die-tease die-bang__words"
        lang={i18n.language}
        style={{ left: Math.max(8, die[0] - 150), top: wordsTop }}
      >
        {t(($) => $.kyotoSeika.tease.boom)}
      </div>
    </div>
  );
}

/** Manga's emotion marks (漫符) on a balloon whose die keeps rolling: a sweat drop, an anger vein. */
export function BalloonMarks({
  mood,
  spec,
  reduced,
}: {
  mood: DieMood;
  spec: BalloonSpec;
  reduced: boolean;
}) {
  const sweat = useRef<HTMLSpanElement>(null);
  const anger = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (mood.sweat && !reduced)
      sweat.current?.animate(
        [
          { opacity: 0, scale: 0.2 },
          { opacity: 1, scale: 1 },
        ],
        {
          duration: 300,
          easing: SPRING,
        },
      );
  }, [mood.sweat, reduced]);
  useEffect(() => {
    if (mood.anger && !reduced)
      anger.current?.animate(
        [
          { opacity: 0, scale: 0.2 },
          { opacity: 1, scale: 1 },
        ],
        {
          duration: 300,
          easing: SPRING,
        },
      );
  }, [mood.anger, reduced]);
  return (
    <>
      {mood.sweat && (
        <span
          ref={sweat}
          className="balloon-mark balloon-mark--sweat"
          style={{ left: spec.w * 0.62, top: -spec.h * 0.42 }}
          aria-hidden="true"
        >
          <svg width="18" height="26" viewBox="0 0 18 26">
            <path
              className="balloon-mark__drop"
              d="M9 1 C9 1 2 11 2 16.5 A7 7 0 0 0 16 16.5 C16 11 9 1 9 1Z"
            />
            <path className="balloon-mark__shine" d="M6 15.5 Q6 12.5 8 10.5" />
          </svg>
        </span>
      )}
      {mood.anger && (
        <span
          ref={anger}
          className="balloon-mark balloon-mark--anger"
          style={{ left: spec.w * 0.3, top: -spec.h * 0.92 }}
          aria-hidden="true"
        >
          <svg width="30" height="30" viewBox="0 0 30 30">
            <path d="M12 3 Q13 10 4 12" />
            <path d="M18 3 Q17 10 26 12" />
            <path d="M12 27 Q13 20 4 18" />
            <path d="M18 27 Q17 20 26 18" />
          </svg>
        </span>
      )}
    </>
  );
}
