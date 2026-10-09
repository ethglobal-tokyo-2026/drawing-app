import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import {
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type RefObject,
} from "react";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { useReducedMotion } from "../ui/useReducedMotion";
import {
  beadShape,
  pencilLoop,
  TIGHT_TYPE,
  TYPE,
  wordSizePx,
  type Box,
  type DealLayout,
  type Fit,
  type PlacedBalloon,
} from "./balloonGeometry";
import { PICKS, type Deal } from "./deal";
import {
  ARRIVE,
  BOIL,
  CLOUD_ARRIVE,
  CLOUD_SQUASH,
  driftKeyframes,
  FLOAT,
  ROLL,
  BOOM_MS,
  COUNT_MS,
  TEASE_MS,
  WORD_IN,
  WORD_OUT,
  WORD_STAMP,
} from "./dealMotion";
import { DieBang, TeaseLine } from "./DieTeasing";
import { CHARRED_AT_ROLL, dieMood } from "./dieMood";
import { charCount } from "./subjectList";
import { spokenSubject } from "./spokenSubject";
import { SubjectReroll } from "./SubjectReroll";
import { SubjectWord } from "./SubjectWord";
import "./subject-balloons.css";

const onVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/**
 * A cloud: the white, and the pen line over it in each boil frame, one showing at a time, in an SVG
 * the size of `box`. `phase` shifts the boil, in frames, so no two clouds flick in step.
 */
function Inked({
  white,
  inks,
  box,
  phase,
}: {
  white: string;
  inks: readonly string[];
  box: Box;
  phase: number;
}) {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${width} ${height}`}
      width={width}
      height={height}
      style={{ left: box.minX, top: box.minY }}
      aria-hidden="true"
    >
      <path className="shape-fill" d={white} />
      {inks.map((ink, frame) => (
        <path
          key={frame}
          className="shape-ink"
          d={ink}
          style={{ animationDelay: `${-(frame + phase) * BOIL.frameMs}ms` }}
        />
      ))}
    </svg>
  );
}

/** A seeded drift, looping for good while `on`, held while the page is hidden. */
function useDrift(
  el: RefObject<HTMLElement | null>,
  seed: number,
  ms: number,
  on: boolean,
  still: boolean,
) {
  const motion = useRef<Animation | null>(null);
  useEffect(() => {
    if (!on) return;
    const playing = el.current?.animate(driftKeyframes(seed, FLOAT.cloud), {
      duration: ms,
      iterations: Infinity,
    });
    motion.current = playing ?? null;
    // Cancelling rejects `finished` with an AbortError: that's the cancel asked for, not a failure.
    playing?.finished.catch(() => {});
    return () => {
      playing?.cancel();
      motion.current = null;
    };
  }, [el, seed, ms, on]);
  useEffect(() => {
    if (still) motion.current?.pause();
    else motion.current?.play();
  }, [still]);
}

const SVG = "http://www.w3.org/2000/svg";
/** The puffs a roll blows out of a cloud: a few sizes, drawn once. */
const PUFFS = [6, 7.5, 9, 11].map((r, i) => ({ r, ...beadShape(r, 61 + i) }));

/** Small puffs burst from a rolled cloud's middle and drift up; random by design, so drawn outside React. */
function puff(layer: HTMLElement) {
  for (let i = 0; i < ROLL.puffs; i++) {
    const { r, white, ink } = PUFFS[Math.floor(Math.random() * PUFFS.length)];
    const size = 2 * r + 6;
    const el = document.createElementNS(SVG, "svg");
    el.setAttribute("class", "subject-puff");
    el.setAttribute("viewBox", `${-size / 2} ${-size / 2} ${size} ${size}`);
    el.setAttribute("width", String(size));
    el.setAttribute("height", String(size));
    el.setAttribute("aria-hidden", "true");
    for (const [className, d] of [
      ["subject-puff__white", white],
      ["subject-puff__ink", ink],
    ]) {
      const path = document.createElementNS(SVG, "path");
      path.setAttribute("class", className);
      path.setAttribute("d", d);
      el.append(path);
    }
    el.style.margin = `${-size / 2}px 0 0 ${-size / 2}px`;
    el.style.left = `${(Math.random() - 0.5) * 40}px`;
    el.style.top = `${(Math.random() - 0.5) * 24}px`;
    layer.append(el);
    const drift = `${(Math.random() - 0.5) * 70}px ${-20 - Math.random() * 30}px`;
    const motion = el.animate(
      [
        { opacity: 1, scale: 0.6, translate: "0 0" },
        { opacity: 0, scale: 1.4, translate: drift },
      ],
      { duration: ROLL.puffMs, easing: EASE_OUT },
    );
    motion.onfinish = () => el.remove();
    motion.oncancel = () => el.remove();
  }
}

/** The pencil loop's room round the word it circles, in px. */
const LOOP_ROOM = { x: 9, y: 5 };

interface BalloonProps {
  place: number;
  placed: PlacedBalloon;
  fit: Fit;
  subject: KyotoSeikaSubject;
  picked: boolean;
  /** Two others are picked: this one takes no pick until one is unpicked. */
  locked: boolean;
  onPick: (place: number) => void;
  reduced: boolean;
  /** It drifts once it has arrived; a picture of the deal holds still. */
  drifts: boolean;
  /** The page is hidden: the drift holds. */
  still: boolean;
}

/**
 * One thought cloud, a toggle that picks its subject: it arrives, drifts, puffs one word out and the
 * next in at a roll, and a pick circles its word in pencil.
 */
function SubjectBalloon({
  place,
  placed,
  fit,
  subject,
  picked,
  locked,
  onPick,
  reduced,
  drifts,
  still,
}: BalloonProps) {
  const { spec } = placed;
  const float = useRef<HTMLDivElement>(null);
  const cloud = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  // A rolled word puffs out before the next comes in, so the screen lags the deal by that long.
  const [shown, setShown] = useState(subject);
  const visible = reduced ? subject : shown;

  useDrift(float, FLOAT.seeds[place], FLOAT.periodMs[place], drifts && !reduced, still);

  useEffect(() => {
    if (reduced) return;
    const start = ARRIVE.firstMs + place * ARRIVE.staggerMs;
    const fill = "backwards";
    cloud.current?.animate(CLOUD_ARRIVE, {
      duration: ARRIVE.cloudMs,
      delay: start + ARRIVE.cloudAfterMs,
      easing: EASE_OUT,
      fill,
    });
    words.current?.animate(WORD_STAMP, {
      duration: ARRIVE.wordMs,
      delay: start + ARRIVE.wordAfterMs,
      easing: EASE_OUT,
      fill,
    });
  }, [place, reduced]);

  useEffect(() => {
    if (reduced || subject === shown) return;
    cloud.current?.animate(CLOUD_SQUASH, { duration: ROLL.cloudMs, easing: EASE_OUT });
    if (float.current) puff(float.current);
    // The word in holds its end, over the word out's: the browser drops each once it's replaced.
    const fill = "forwards";
    words.current?.animate(WORD_OUT, { duration: ROLL.wordOutMs, easing: EASE_OUT, fill });
    const swap = setTimeout(() => {
      setShown(subject);
      words.current?.animate(WORD_IN, { duration: ROLL.wordInMs, easing: EASE_OUT, fill });
    }, ROLL.wordOutMs);
    return () => clearTimeout(swap);
  }, [subject, shown, reduced]);

  const type = fit === "roomy" ? TYPE : TIGHT_TYPE;
  const size = wordSizePx(visible.ja, fit, spec.w);
  // The loop rings the word as set, and the reading over it, never wider than the word area.
  const loop = {
    rx: Math.min(spec.w / 2, (charCount(visible.ja) * size) / 2) + LOOP_ROOM.x,
    ry: spec.h / 2 + LOOP_ROOM.y,
  };
  const style = {
    left: placed.center.x,
    top: placed.center.y,
    rotate: `${spec.tilt}deg`,
    "--boil-frame": `${BOIL.frameMs}ms`,
    "--gap": `${type.gapPx}px`,
    "--reading": `${type.readingPx}px`,
  } as CSSProperties;
  const half = { w: spec.w / 2 + spec.lobe, h: spec.h / 2 + spec.padY };
  return (
    <div
      className={`subject-balloon ${picked ? "is-picked" : ""} ${locked ? "is-locked" : ""}`}
      style={style}
    >
      <div ref={float} className="subject-balloon__float">
        <div ref={cloud} className="subject-balloon__cloud">
          <Inked
            white={placed.whitePath}
            inks={placed.cloud.inks}
            box={placed.cloudBox}
            phase={place / 2}
          />
        </div>
        <div
          ref={words}
          className="subject-balloon__words"
          style={{ left: -spec.w / 2, top: -spec.h / 2, width: spec.w, height: spec.h }}
        >
          <div className="subject-balloon__word" style={{ fontSize: size }}>
            <SubjectWord subject={visible} />
          </div>
        </div>
        {picked && (
          <svg
            key={visible.ja}
            className="subject-balloon__loop"
            viewBox={`${-half.w} ${-half.h} ${half.w * 2} ${half.h * 2}`}
            width={half.w * 2}
            height={half.h * 2}
            style={{ left: -half.w, top: -half.h }}
            aria-hidden="true"
          >
            <path d={pencilLoop(loop.rx, loop.ry, spec.seed)} pathLength={1} />
          </svg>
        )}
      </div>
      <button
        type="button"
        className="subject-balloon__pick"
        style={{ left: -half.w, top: -half.h, width: half.w * 2, height: half.h * 2 }}
        aria-label={spokenSubject(subject)}
        aria-pressed={picked}
        aria-disabled={locked || undefined}
        onClick={() => {
          if (!locked) onPick(place);
        }}
      />
    </div>
  );
}

interface Props {
  deal: Deal;
  layout: DealLayout;
  onRoll: () => void;
  onPick: (place: number) => void;
  /** A picture of the deal, as Kyoto Seika Practice Mode's help shows it: the clouds arrive, then neither drift nor boil. */
  picture?: boolean;
}

/** The die's line, or its countdown's number, from the roll that earned it. */
interface Tease {
  rolls: number;
  text: string;
  count: boolean;
}

/**
 * The Kyoto Seika Subjects dealt for a fresh sheet, one of each kind in five manga thought clouds,
 * each a toggle that picks it, and one die that deals the ones not picked again. Each subject a roll
 * deals is read out.
 */
export function SubjectBalloons({ deal, layout, onRoll, onPick, picture = false }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const hidden = useSyncExternalStore(onVisibility, () => document.hidden);

  // Each subject a roll deals is read out, with any line the roll earns. A roll too many teases,
  // counts down, and at last blows the die up, at once.
  const [lastDeal, setLastDeal] = useState(deal);
  const [said, setSaid] = useState("");
  const [tease, setTease] = useState<Tease | null>(null);
  const [bang, setBang] = useState(false);
  if (deal !== lastDeal) {
    setLastDeal(deal);
    if (deal.rolls > lastDeal.rolls) {
      const { line, countdown } = dieMood(deal.rolls);
      const dealt = deal.subjects
        .filter((subject, place) => subject !== lastDeal.subjects[place])
        .map(({ ja, en }) => t(($) => $.kyotoSeika.balloons.subject, { word: ja, english: en }));
      const lineSaid = line ? t(($) => $.kyotoSeika.tease[line]) : null;
      const blewUp = deal.rolls === CHARRED_AT_ROLL;
      const after = blewUp ? t(($) => $.kyotoSeika.balloons.charred) : lineSaid;
      setSaid([...dealt, ...(after ? [after] : [])].join(" "));
      setTease(
        lineSaid
          ? { rolls: deal.rolls, text: lineSaid, count: false }
          : countdown !== null
            ? { rolls: deal.rolls, text: String(countdown), count: true }
            : null,
      );
      if (blewUp && !reduced) setBang(true);
    }
  }

  // The line peels off by itself; a new one replaces it sooner.
  useEffect(() => {
    if (!tease) return;
    const clear = setTimeout(() => setTease(null), tease.count ? COUNT_MS : TEASE_MS);
    return () => clearTimeout(clear);
  }, [tease]);

  // The bang goes off with the roll that blows the die up, and clears once it has played.
  useEffect(() => {
    if (!bang) return;
    const gone = setTimeout(() => setBang(false), BOOM_MS);
    return () => clearTimeout(gone);
  }, [bang]);
  const clouds = useRef<HTMLDivElement>(null);
  const full = deal.picked.length >= PICKS;

  return (
    <div
      className={`subject-balloons ${hidden ? "is-still" : ""} ${picture ? "is-picture" : ""}`}
      role="group"
      aria-label={t(($) => $.kyotoSeika.balloons.label)}
    >
      <div ref={clouds} className="subject-balloons__clouds">
        {deal.subjects.map((subject, place) => {
          const placed = layout.balloons[place];
          if (!placed) return null;
          const picked = deal.picked.includes(place);
          return (
            <SubjectBalloon
              key={place}
              place={place}
              placed={placed}
              fit={layout.fit}
              subject={subject}
              picked={picked}
              locked={full && !picked}
              onPick={onPick}
              reduced={reduced}
              drifts={!picture}
              still={hidden}
            />
          );
        })}
      </div>
      {tease && (
        <TeaseLine
          key={tease.rolls}
          layout={layout}
          text={tease.text}
          count={tease.count}
          reduced={reduced}
        />
      )}
      {bang && <DieBang layout={layout} balloonEl={() => clouds.current} />}
      <SubjectReroll rolls={deal.rolls} box={layout.reroll} reduced={reduced} onRoll={onRoll} />
      <p className="visually-hidden" role="status">
        {said}
      </p>
    </div>
  );
}
