import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
} from "react";
import { DiceFive, DiceFour } from "../icons";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { useReducedMotion } from "../ui/useReducedMotion";
import {
  balloonShapes,
  shapesBox,
  TIGHT_TYPE,
  TYPE,
  wordSizePx,
  type PairLayout,
  type Shape,
} from "./balloonGeometry";
import type { Balloon, Deal } from "./deal";
import {
  ARRIVE,
  BEADS_ARRIVE,
  CLOUD_ARRIVE,
  CLOUD_SQUASH,
  DIE_TUMBLE,
  ROLL,
  SPRING,
  BOOM_DELAY_MS,
  BOOM_MS,
  COUNT_MS,
  TEASE_MS,
  WORD_IN,
  WORD_OUT,
  WORD_STAMP,
} from "./dealMotion";
import { BalloonMarks, DieBang, TeaseLine } from "./DieTeasing";
import { CHARRED_AT_ROLL, dieMood } from "./dieMood";
import { SubjectWord } from "./SubjectWord";
import "./subject-balloons.css";

const BALLOONS = [0, 1] as const satisfies readonly Balloon[];
/** The Ink edge round the clouds and beads, in px. */
const EDGE_PX = 2.25;

const onVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

/** A cloud or its beads: each shape in Ink, grown by the edge, under the same shapes in Canvas white. */
function Shapes({ shapes, pad }: { shapes: readonly Shape[]; pad: number }) {
  const box = shapesBox(shapes, pad);
  const layer = (className: string, grow: number) => (
    <g className={className}>
      {shapes.map((s, i) =>
        s.kind === "circle" ? (
          <circle key={i} cx={s.x} cy={s.y} r={s.r + grow} />
        ) : (
          <ellipse key={i} cx={s.x} cy={s.y} rx={s.rx + grow} ry={s.ry + grow} />
        ),
      )}
    </g>
  );
  return (
    <svg
      viewBox={`${box.minX} ${box.minY} ${box.width} ${box.height}`}
      width={box.width}
      height={box.height}
      style={{ left: box.minX, top: box.minY }}
      aria-hidden="true"
    >
      {layer("shape-edge", EDGE_PX)}
      {layer("shape-fill", 0)}
    </svg>
  );
}

/** Small puffs of smoke burst from a rolled balloon's middle and drift up; random by design, so drawn outside React. */
function puff(layer: HTMLElement) {
  for (let i = 0; i < ROLL.puffs; i++) {
    const size = 12 + Math.random() * 12;
    const el = document.createElement("span");
    el.className = "subject-puff";
    el.style.width = el.style.height = `${size}px`;
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
  subject: KyotoSeikaSubject;
  rolls: number;
  wrap: (el: HTMLDivElement | null) => void;
  layout: PairLayout;
  reduced: boolean;
}

/** One thought balloon: it arrives, floats, and puffs one word out and the next in at a roll. */
function SubjectBalloon({ balloon, subject, rolls, wrap, layout, reduced }: BalloonProps) {
  const mood = dieMood(rolls);
  const spec = layout.specs[balloon];
  const [cx, cy] = layout.centers[balloon];
  const toward = layout.towards[balloon];
  const shapes = useMemo(() => balloonShapes(spec, toward), [spec, toward]);
  const float = useRef<HTMLDivElement>(null);
  const cloud = useRef<HTMLDivElement>(null);
  const beads = useRef<HTMLDivElement>(null);
  const words = useRef<HTMLDivElement>(null);
  // A rolled word puffs out before the next comes in, so the screen lags the deal by that long.
  const [shown, setShown] = useState(subject);
  const visible = reduced ? subject : shown;

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
  }, [subject, shown, reduced, spec]);

  const type = layout.tight ? TIGHT_TYPE : TYPE;
  const style = {
    left: cx,
    top: cy,
    rotate: `${spec.tilt}deg`,
    "--bob": `${spec.bobMs}ms`,
    "--gap": `${type.gapPx}px`,
    "--reading": `${type.readingPx}px`,
    "--english": `${type.englishPx}px`,
  } as CSSProperties;
  return (
    <div
      ref={wrap}
      className={`subject-balloon ${mood.shiver ? "is-shivering" : ""}`}
      style={style}
    >
      <div ref={float} className="subject-balloon__float">
        <BalloonMarks mood={mood} spec={spec} reduced={reduced} />
        <div ref={beads} className="subject-balloon__beads">
          <Shapes shapes={shapes.beads} pad={4} />
        </div>
        <div ref={cloud} className="subject-balloon__cloud">
          <Shapes shapes={shapes.body} pad={8} />
        </div>
        <div
          ref={words}
          className="subject-balloon__words"
          style={{ left: -spec.w / 2, top: -spec.h / 2, width: spec.w, height: spec.h }}
        >
          <div
            className="subject-balloon__word"
            style={{ fontSize: wordSizePx(visible.ja, layout.tight) }}
          >
            <SubjectWord subject={visible} />
          </div>
          <div className="subject-balloon__english" lang="en">
            {visible.en}
          </div>
        </div>
      </div>
    </div>
  );
}

interface DieProps {
  balloon: Balloon;
  subject: KyotoSeikaSubject;
  rolls: number;
  layout: PairLayout;
  reduced: boolean;
  onRoll: (balloon: Balloon) => void;
}

/** A balloon's die: a roll deals that balloon a new subject, until rolling too often blows it up. */
function SubjectDie({ balloon, subject, rolls, layout, reduced, onRoll }: DieProps) {
  const { t } = useTranslation();
  const face = useRef<HTMLSpanElement>(null);
  const rolled = useRef(rolls);
  useEffect(() => {
    if (rolls > rolled.current && !reduced)
      face.current?.animate(DIE_TUMBLE, { duration: ROLL.dieMs, easing: EASE_OUT });
    rolled.current = rolls;
  }, [rolls, reduced]);
  const { charred, smoking } = dieMood(rolls);
  const [cx, cy] = layout.centers[balloon];
  const [dx, dy] = layout.specs[balloon].die;
  const Die = balloon === 0 ? DiceFive : DiceFour;
  return (
    <button
      type="button"
      className={`subject-die ${charred ? "is-charred" : ""}`}
      style={{ left: cx + dx, top: cy + dy }}
      aria-label={
        charred
          ? t(($) => $.kyotoSeika.balloons.charred)
          : t(($) => $.kyotoSeika.balloons.roll, { word: subject.ja, english: subject.en })
      }
      aria-disabled={charred || undefined}
      onClick={() => {
        if (!charred) onRoll(balloon);
      }}
    >
      <span ref={face} className="subject-die__face">
        <Die className="subject-die__pips" weight="bold" aria-hidden focusable="false" />
        {charred && (
          <svg className="subject-die__crack" viewBox="0 0 34 34" aria-hidden="true">
            <path d="M9 6 L14 13 L11 18 L17 24" />
            <path d="M14 13 L21 11 L25 16" />
            <path d="M17 24 L23 27" />
          </svg>
        )}
      </span>
      {smoking && (
        <svg className="subject-die__wisp" viewBox="0 0 14 30" aria-hidden="true">
          <path d="M7 29 C2 23 12 19 7 13 C3 8 10 5 8 1" />
        </svg>
      )}
    </button>
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
  // the group. A roll too many teases, counts down, and at last blows its die up.
  const [lastDeal, setLastDeal] = useState(deal);
  const [said, setSaid] = useState("");
  const [teases, setTeases] = useState<readonly [Tease | null, Tease | null]>([null, null]);
  const [bang, setBang] = useState<{ balloon: Balloon; armed: boolean } | null>(null);
  if (deal !== lastDeal) {
    setLastDeal(deal);
    const rolled = BALLOONS.find((balloon) => deal.rolls[balloon] > lastDeal.rolls[balloon]);
    if (rolled !== undefined) {
      const rolls = deal.rolls[rolled];
      const { line, countdown } = dieMood(rolls);
      const { ja, en } = deal.subjects[rolled];
      const subject = t(($) => $.kyotoSeika.balloons.subject, { word: ja, english: en });
      const lineSaid = line ? t(($) => $.kyotoSeika.tease[line]) : null;
      setSaid(lineSaid ? `${subject} ${lineSaid}` : subject);
      const tease: Tease | null = lineSaid
        ? { rolls, text: lineSaid, count: false }
        : countdown !== null
          ? { rolls, text: String(countdown), count: true }
          : null;
      setTeases((now) => (rolled === 0 ? [tease, now[1]] : [now[0], tease]));
      if (rolls === CHARRED_AT_ROLL) setBang({ balloon: rolled, armed: false });
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

  // The bang goes off a beat after the roll that chars the die, and says the subject stays.
  useEffect(() => {
    if (!bang) return;
    if (!bang.armed) {
      const goesOff = setTimeout(() => {
        setBang({ ...bang, armed: true });
        setSaid(t(($) => $.kyotoSeika.balloons.charred));
      }, BOOM_DELAY_MS);
      return () => clearTimeout(goesOff);
    }
    const gone = setTimeout(() => setBang(null), BOOM_MS);
    return () => clearTimeout(gone);
  }, [bang, t]);
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
          subject={deal.subjects[balloon]}
          rolls={deal.rolls[balloon]}
          wrap={(el) => {
            wraps.current[balloon] = el;
          }}
          layout={layout}
          reduced={reduced}
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
      {bang?.armed && (
        <DieBang
          balloon={bang.balloon}
          layout={layout}
          reduced={reduced}
          balloonEl={() => wraps.current[bang.balloon]}
        />
      )}
      {BALLOONS.map((balloon) => (
        <SubjectDie
          key={balloon}
          balloon={balloon}
          subject={deal.subjects[balloon]}
          rolls={deal.rolls[balloon]}
          layout={layout}
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
