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
  TIGHT_TYPE,
  TYPE,
  wordSizePx,
  type Box,
  type PairLayout,
  type PlacedBalloon,
} from "./balloonGeometry";
import type { Balloon, Deal } from "./deal";
import {
  ARRIVE,
  BEADS_ARRIVE,
  BOIL,
  CLOUD_ARRIVE,
  CLOUD_SQUASH,
  driftKeyframes,
  FLOAT,
  type DriftReach,
  ROLL,
  SPRING,
  BOOM_MS,
  COUNT_MS,
  TEASE_MS,
  WORD_IN,
  WORD_OUT,
  WORD_STAMP,
} from "./dealMotion";
import { DieBang, TeaseLine } from "./DieTeasing";
import { CHARRED_AT_ROLL, dieMood } from "./dieMood";
import { SMOKE_WISPS } from "./dieArt";
import { SubjectReroll, Wisp } from "./SubjectReroll";
import { SubjectWord } from "./SubjectWord";
import "./subject-balloons.css";

const BALLOONS = [0, 1] as const satisfies readonly Balloon[];

const onVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/**
 * A cloud or its bubbles: the white, and the pen line over it in each boil frame, one showing at a
 * time, in an SVG the size of `box`. `phase` shifts the boil, in frames, so two clouds never flick in step.
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
  reach: DriftReach,
  ms: number,
  on: boolean,
  still: boolean,
) {
  const motion = useRef<Animation | null>(null);
  useEffect(() => {
    if (!on) return;
    const playing = el.current?.animate(driftKeyframes(seed, reach), {
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
  }, [el, seed, reach, ms, on]);
  useEffect(() => {
    if (still) motion.current?.pause();
    else motion.current?.play();
  }, [still]);
}

const SVG = "http://www.w3.org/2000/svg";
/** The puffs a roll blows out of a cloud, inked like its bubbles: a few sizes, drawn once. */
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

interface BalloonProps {
  balloon: Balloon;
  placed: PlacedBalloon;
  tight: boolean;
  subject: KyotoSeikaSubject;
  /** Its die blew up: smoke rises from it. */
  charred: boolean;
  wrap: (el: HTMLDivElement | null) => void;
  reduced: boolean;
  /** The page is hidden: the drift holds. */
  still: boolean;
}

/** One thought cloud: it arrives, drifts, and puffs one word out and the next in at a roll. */
function SubjectBalloon({
  balloon,
  placed,
  tight,
  subject,
  charred,
  wrap,
  reduced,
  still,
}: BalloonProps) {
  const { spec } = placed;
  const float = useRef<HTMLDivElement>(null);
  const cloud = useRef<HTMLDivElement>(null);
  const beads = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  // A rolled word puffs out before the next comes in, so the screen lags the deal by that long.
  const [shown, setShown] = useState(subject);
  const visible = reduced ? subject : shown;

  // The cloud drifts on its own seeded track, and its bubbles a little more on theirs.
  const seed = FLOAT.seeds[balloon];
  useDrift(float, seed, FLOAT.cloud, FLOAT.periodMs[balloon], !reduced, still);
  useDrift(beads, seed + 1, FLOAT.beads, FLOAT.beadsPeriodMs[balloon], !reduced, still);

  useEffect(() => {
    if (reduced) return;
    const start = ARRIVE.firstMs + balloon * ARRIVE.staggerMs;
    const fill = "backwards";
    beads.current?.animate(BEADS_ARRIVE, {
      duration: ARRIVE.beadsMs,
      delay: start,
      easing: SPRING,
      fill,
    });
    cloud.current?.animate(CLOUD_ARRIVE, {
      duration: ARRIVE.cloudMs,
      delay: start + ARRIVE.cloudAfterMs,
      easing: EASE_OUT,
      fill,
    });
    words.current?.animate(WORD_STAMP, {
      duration: ARRIVE.wordMs,
      delay: start + ARRIVE.wordAfterMs,
      easing: SPRING,
      fill,
    });
  }, [balloon, reduced]);

  useEffect(() => {
    if (reduced || subject === shown) return;
    cloud.current?.animate(CLOUD_SQUASH, { duration: ROLL.cloudMs, easing: EASE_OUT });
    if (float.current) puff(float.current);
    // The word in holds its end, over the word out's: the browser drops each once it's replaced.
    const fill = "forwards";
    words.current?.animate(WORD_OUT, { duration: ROLL.wordOutMs, easing: EASE_OUT, fill });
    const swap = setTimeout(() => {
      setShown(subject);
      words.current?.animate(WORD_IN, { duration: ROLL.wordInMs, easing: SPRING, fill });
    }, ROLL.wordOutMs);
    return () => clearTimeout(swap);
  }, [subject, shown, reduced]);

  const type = tight ? TIGHT_TYPE : TYPE;
  const style = {
    left: placed.center.x,
    top: placed.center.y,
    rotate: `${spec.tilt}deg`,
    "--boil-frame": `${BOIL.frameMs}ms`,
    "--gap": `${type.gapPx}px`,
    "--reading": `${type.readingPx}px`,
  } as CSSProperties;
  return (
    <div ref={wrap} className="subject-balloon" style={style}>
      <div ref={float} className="subject-balloon__float">
        <div ref={beads} className="subject-balloon__beads">
          <Inked
            white={placed.beadsWhite}
            inks={placed.beadsInks}
            box={placed.beadsBox}
            phase={balloon / 2}
          />
        </div>
        <div ref={cloud} className="subject-balloon__cloud">
          <Inked
            white={placed.whitePath}
            inks={placed.cloud.inks}
            box={placed.cloudBox}
            phase={balloon / 2}
          />
        </div>
        <div
          ref={words}
          className="subject-balloon__words"
          style={{ left: -spec.w / 2, top: -spec.h / 2, width: spec.w, height: spec.h }}
        >
          <div
            className="subject-balloon__word"
            style={{ fontSize: wordSizePx(visible.ja, tight) }}
          >
            <SubjectWord subject={visible} />
          </div>
        </div>
        {charred &&
          !reduced &&
          placed.smoke.map((from, i) => (
            <div
              key={i}
              className="subject-balloon__smoke"
              style={{ left: from.x, top: from.y }}
              aria-hidden="true"
            >
              <Wisp d={SMOKE_WISPS[i + 1]} at={0} after={i * 0.9} />
            </div>
          ))}
      </div>
    </div>
  );
}

interface Props {
  deal: Deal;
  layout: PairLayout;
  onRoll: (balloon: Balloon) => void;
}

/** A die's line, or its countdown's number, from the roll that earned it. */
interface Tease {
  rolls: number;
  text: string;
  count: boolean;
}

/**
 * The Kyoto Seika Subjects dealt for a fresh sheet, in two manga thought balloons, each with its own
 * die. The dice come after the balloons, in reading order, and each new subject is read out.
 */
export function SubjectBalloons({ deal, layout, onRoll }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const hidden = useSyncExternalStore(onVisibility, () => document.hidden);

  // Each subject a roll deals is read out, with any line the roll earns; the first deal is read with
  // the group. A roll too many teases, counts down, and at last blows its die up, at once.
  const [lastDeal, setLastDeal] = useState(deal);
  const [said, setSaid] = useState("");
  const [teases, setTeases] = useState<readonly [Tease | null, Tease | null]>([null, null]);
  const [bang, setBang] = useState<Balloon | null>(null);
  if (deal !== lastDeal) {
    setLastDeal(deal);
    const rolled = BALLOONS.find((balloon) => deal.rolls[balloon] > lastDeal.rolls[balloon]);
    if (rolled !== undefined) {
      const rolls = deal.rolls[rolled];
      const { line, countdown } = dieMood(rolls);
      const { ja, en } = deal.subjects[rolled];
      const subject = t(($) => $.kyotoSeika.balloons.subject, { word: ja, english: en });
      const lineSaid = line ? t(($) => $.kyotoSeika.tease[line]) : null;
      const blewUp = rolls === CHARRED_AT_ROLL;
      const after = blewUp ? t(($) => $.kyotoSeika.balloons.charred) : lineSaid;
      setSaid(after ? `${subject} ${after}` : subject);
      const tease: Tease | null = lineSaid
        ? { rolls, text: lineSaid, count: false }
        : countdown !== null
          ? { rolls, text: String(countdown), count: true }
          : null;
      setTeases((now) => (rolled === 0 ? [tease, now[1]] : [now[0], tease]));
      if (blewUp && !reduced) setBang(rolled);
    }
  }

  // Each line peels off by itself; a new one replaces it sooner.
  useEffect(() => {
    const timers = BALLOONS.flatMap((balloon) => {
      const tease = teases[balloon];
      if (!tease) return [];
      const clear = () =>
        setTeases((now) =>
          now[balloon] !== tease ? now : balloon === 0 ? [null, now[1]] : [now[0], null],
        );
      return [setTimeout(clear, tease.count ? COUNT_MS : TEASE_MS)];
    });
    return () => timers.forEach(clearTimeout);
  }, [teases]);

  // The bang goes off with the roll that blows the die up, and clears once it has played.
  useEffect(() => {
    if (bang === null) return;
    const gone = setTimeout(() => setBang(null), BOOM_MS);
    return () => clearTimeout(gone);
  }, [bang]);
  const wraps = useRef<[HTMLDivElement | null, HTMLDivElement | null]>([null, null]);

  return (
    <div
      className={`subject-balloons ${hidden ? "is-still" : ""}`}
      role="group"
      aria-label={t(($) => $.kyotoSeika.balloons.label)}
    >
      {BALLOONS.map((balloon) => (
        <SubjectBalloon
          key={balloon}
          balloon={balloon}
          placed={layout.balloons[balloon]}
          tight={layout.tight}
          subject={deal.subjects[balloon]}
          charred={dieMood(deal.rolls[balloon]).charred}
          wrap={(el) => {
            wraps.current[balloon] = el;
          }}
          reduced={reduced}
          still={hidden}
        />
      ))}
      {BALLOONS.map((balloon) => {
        const tease = teases[balloon];
        return (
          tease && (
            <TeaseLine
              key={`${balloon}-${tease.rolls}`}
              balloon={balloon}
              layout={layout}
              text={tease.text}
              count={tease.count}
              reduced={reduced}
            />
          )
        );
      })}
      {bang !== null && (
        <DieBang balloon={bang} layout={layout} balloonEl={() => wraps.current[bang]} />
      )}
      {BALLOONS.map((balloon) => (
        <SubjectReroll
          key={balloon}
          balloon={balloon}
          subject={deal.subjects[balloon]}
          rolls={deal.rolls[balloon]}
          box={layout.balloons[balloon].reroll}
          reduced={reduced}
          onRoll={onRoll}
        />
      ))}
      <p className="visually-hidden" role="status">
        {said}
      </p>
    </div>
  );
}
