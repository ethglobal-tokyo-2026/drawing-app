import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type Ref,
  type RefObject,
} from "react";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { useReducedMotion } from "../ui/useReducedMotion";
import {
  beadShape,
  cloudShape,
  TIGHT_TYPE,
  TYPE,
  wordSizePx,
  type Bead,
  type Box,
  type DealLayout,
  type Fit,
  type PlacedBalloon,
  type Pt,
} from "./balloonGeometry";
import { PICKS, type Deal } from "./deal";
import {
  ARRIVE,
  BOIL,
  CLOUD_ARRIVE,
  cloudPop,
  driftKeyframes,
  FADED,
  FLOAT,
  POOL,
  SPRING,
  BOOM_MS,
  COUNT_MS,
  TEASE_MS,
  WORD_STAMP,
  type CloudPop,
  type Motion,
} from "./dealMotion";
import { DieBang, TeaseLine } from "./DieTeasing";
import { CHARRED_AT_ROLL, dieMood } from "./dieMood";
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
 * the size of `box`. `phase` shifts the boil, in frames, so no two clouds flick in step. `line` is the
 * pen line's opacity: a cloud fades its line, never its white.
 */
function Inked({
  white,
  inks,
  box,
  phase,
  line = 1,
  ref,
}: {
  white: string;
  inks: readonly string[];
  box: Box;
  phase: number;
  line?: number;
  ref?: Ref<SVGSVGElement>;
}) {
  const width = box.maxX - box.minX;
  const height = box.maxY - box.minY;
  return (
    <svg
      ref={ref}
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
          style={{ animationDelay: `${-(frame + phase) * BOIL.frameMs}ms`, opacity: line }}
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

/** How an element looks this instant, mid-arrival or at rest. */
type Look = Pick<CSSProperties, "scale" | "rotate" | "opacity">;
const lookOf = (el: HTMLElement | null): Look | null => {
  if (!el) return null;
  const { scale, rotate, opacity } = getComputedStyle(el);
  return { scale, rotate, opacity };
};

/** A cloud a roll dealt again, as it pops: the subject it held, and how it and its word looked then. */
interface Pop {
  id: number;
  was: KyotoSeikaSubject;
  motion: CloudPop;
  cloud: Look | null;
  word: Look | null;
}

const play = (el: Element | null | undefined, { keyframes, timing }: Motion) =>
  el?.animate(keyframes, timing);

/** A bead's square, round its middle, with room for its pen line. */
const beadSize = (r: number) => 2 * r + 6;

interface PoppedProps {
  pop: Pop;
  placed: PlacedBalloon;
  /** The cloud's pen line, once per boil frame, as the cloud itself is inked. */
  inks: readonly string[];
  fit: Fit;
  phase: number;
  onGone: (id: number) => void;
}

/**
 * The old cloud over the new one, popping: it and its word swell from the look they had at the roll
 * and are gone, then every other lobe of its pen line bursts off as a rim, and beads spray off it.
 */
function PoppedCloud({ pop, placed, inks, fit, phase, onGone }: PoppedProps) {
  const swell = useRef<HTMLDivElement>(null);
  const wordSwell = useRef<HTMLDivElement>(null);
  const rim = useRef<SVGSVGElement>(null);
  const spray = useRef<HTMLDivElement>(null);
  const beads = useMemo(
    () => pop.motion.beads.map((bead) => ({ ...bead, ...beadShape(bead.r, bead.seed) })),
    [pop],
  );

  // Before paint, so the swell is under way from the pop's first frame.
  useLayoutEffect(() => {
    const { motion } = pop;
    const played = [
      play(swell.current, motion.swell),
      play(wordSwell.current, motion.swell),
      ...motion.rim.map((piece, i) => play(rim.current?.children[i], piece.motion)),
      ...motion.beads.map((bead, i) => play(spray.current?.children[i], bead.motion)),
    ].filter((played) => played !== undefined);
    // Cancelling rejects `finished` with an AbortError: that's the cancel asked for, not a failure.
    Promise.all(played.map((motion) => motion.finished)).then(
      () => onGone(pop.id),
      () => {},
    );
    return () => played.forEach((motion) => motion.cancel());
  }, [pop, onGone]);

  const { spec } = placed;
  const box = placed.cloudBox;
  return (
    <div className="subject-pop" aria-hidden="true">
      <div className="subject-pop__look" style={pop.cloud ?? undefined}>
        <div ref={swell} className="subject-pop__part">
          <Inked white={placed.whitePath} inks={inks} box={box} phase={phase} />
        </div>
        <svg
          ref={rim}
          className="subject-pop__rim"
          viewBox={`${box.minX} ${box.minY} ${box.maxX - box.minX} ${box.maxY - box.minY}`}
          width={box.maxX - box.minX}
          height={box.maxY - box.minY}
          style={{ left: box.minX, top: box.minY }}
        >
          {pop.motion.rim.map(({ d }, i) => (
            <path key={i} d={d} />
          ))}
        </svg>
        <div ref={spray} className="subject-pop__part">
          {beads.map(({ r, at, white, ink }, i) => {
            const size = beadSize(r);
            return (
              <svg
                key={i}
                className="subject-pop__bead"
                viewBox={`${-size / 2} ${-size / 2} ${size} ${size}`}
                width={size}
                height={size}
                style={{ left: at.x - size / 2, top: at.y - size / 2 }}
              >
                <path className="subject-puff__white" d={white} />
                <path className="subject-puff__ink" d={ink} />
              </svg>
            );
          })}
        </div>
      </div>
      <div
        className="subject-balloon__words"
        style={{ left: -spec.w / 2, top: -spec.h / 2, width: spec.w, height: spec.h, ...pop.word }}
      >
        <div
          ref={wordSwell}
          className="subject-balloon__word"
          style={{ fontSize: wordSizePx(pop.was.ja, fit, spec.w) }}
        >
          <SubjectWord subject={pop.was} />
        </div>
      </div>
    </div>
  );
}

/**
 * Where a click landed in a cloud's own frame, through the cloud's drawn SVG, drift and lean included.
 * A key press clicks at detail 0, with no point, so it lands in the cloud's middle.
 */
function clickedAt(
  cloud: SVGSVGElement | null,
  click: { detail: number; clientX: number; clientY: number },
): Pt {
  const toCloud = click.detail > 0 ? cloud?.getScreenCTM()?.inverse() : null;
  if (!toCloud) return { x: 0, y: 0 };
  const { a, b, c, d, e, f } = toCloud;
  return {
    x: a * click.clientX + c * click.clientY + e,
    y: b * click.clientX + d * click.clientY + f,
  };
}

/** How far a pool of ink from `at` spreads to cover all of `box`: to its farthest corner. */
const poolReach = (box: Box, at: Pt) =>
  Math.max(
    ...[box.minX, box.maxX].flatMap((x) =>
      [box.minY, box.maxY].map((y) => Math.hypot(x - at.x, y - at.y)),
    ),
  );

/** A pool of ink round `at` as a clip for a layer whose top-left sits at `corner`, in the cloud's frame. */
const poolClip = (at: Pt, reach: number, corner: Pt) =>
  `circle(${reach}px at ${at.x - corner.x}px ${at.y - corner.y}px)`;

interface BalloonProps {
  place: number;
  placed: PlacedBalloon;
  fit: Fit;
  subject: KyotoSeikaSubject;
  /** The rolls that dealt the deal: a cloud dealt again pops, seeded by its roll. */
  rolls: number;
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
 * One thought cloud, a toggle that picks its subject: it arrives, drifts, pops at a roll as a new one
 * puffs up in its place, and a pick inks it solid from where it was tapped, its word lettered white.
 */
function SubjectBalloon({
  place,
  placed,
  fit,
  subject,
  rolls,
  picked,
  locked,
  onPick,
  reduced,
  drifts,
  still,
}: BalloonProps) {
  const { spec } = placed;
  const box = placed.cloudBox;
  const { inks } = useMemo(() => cloudShape(spec), [spec]);
  const float = useRef<HTMLDivElement>(null);
  const cloud = useRef<HTMLDivElement>(null);
  const drawnCloud = useRef<SVGSVGElement>(null);
  const ink = useRef<SVGSVGElement>(null);
  const words = useRef<HTMLDivElement>(null);
  const lettered = useRef<HTMLDivElement>(null);

  // Where the last pick or unpick landed: its ink pools out from there, or drains back into it.
  const tapped = useRef<Pt>({ x: 0, y: 0 });
  // An unpicked cloud keeps its ink until it has drained.
  const [draining, setDraining] = useState(false);
  const [wasPicked, setWasPicked] = useState(picked);
  if (picked !== wasPicked) {
    setWasPicked(picked);
    setDraining(!picked && !reduced);
  }
  const inked = picked || draining;

  // Before paint, so a new pick's ink never shows whole for a frame before it pools.
  const pooled = useRef(picked);
  useLayoutEffect(() => {
    if (pooled.current === picked) return;
    pooled.current = picked;
    if (reduced) return;
    const at = tapped.current;
    const reach = poolReach(box, at);
    const [from, to] = picked ? [0, reach] : [reach, 0];
    const timing: KeyframeAnimationOptions = picked
      ? { duration: POOL.inMs, easing: EASE_OUT }
      : { duration: POOL.drainMs, easing: POOL.drainEase, fill: "forwards" };
    const layers = [
      { layer: ink.current, corner: { x: box.minX, y: box.minY } },
      { layer: lettered.current, corner: { x: -spec.w / 2, y: -spec.h / 2 } },
    ];
    const played = layers.map(({ layer, corner }) =>
      layer?.animate({ clipPath: [poolClip(at, from, corner), poolClip(at, to, corner)] }, timing),
    );
    // Drained, or cut short by a pick or a new layout, the ink goes. Cancelling rejects `finished`
    // with an AbortError: that's the cancel asked for, not a failure.
    const settle = picked ? () => {} : () => setDraining(false);
    for (const motion of played) motion?.finished.then(settle, settle);
    return () => played.forEach((motion) => motion?.cancel());
  }, [picked, reduced, box, spec.w, spec.h]);

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
      easing: SPRING,
      fill,
    });
  }, [place, reduced]);

  // A roll pops the cloud it deals again, from wherever the last roll's arrival had got to, and the new
  // cloud and word arrive in its place: the new word is in the page at once, hidden until it stamps in.
  const [pops, setPops] = useState<readonly Pop[]>([]);
  const dealt = useRef(subject);
  const popped = useRef(0);
  const arriving = useRef<readonly Animation[]>([]);
  useLayoutEffect(() => {
    const was = dealt.current;
    if (was === subject) return;
    dealt.current = subject;
    const motion = cloudPop({ white: placed.white, inks }, spec.seed, rolls, reduced);
    if (!motion) return;
    const pop = {
      id: ++popped.current,
      was,
      motion,
      cloud: lookOf(cloud.current),
      word: lookOf(words.current),
    };
    for (const arrival of arriving.current) arrival.cancel();
    arriving.current = [play(cloud.current, motion.cloud), play(words.current, motion.word)].filter(
      (arrival) => arrival !== undefined,
    );
    setPops((now) => [...now, pop]);
  }, [subject, rolls, spec.seed, placed.white, inks, reduced]);
  const gone = useCallback((id: number) => setPops((now) => now.filter((p) => p.id !== id)), []);

  const type = fit === "roomy" ? TYPE : TIGHT_TYPE;
  // Waiting, it fades its pen line and word only, never its white or the parts a roll animates, so
  // no cloud behind shows through it and its pop plays at full strength.
  const inkOpacity = locked ? FADED : 1;
  const word = { fontSize: wordSizePx(subject.ja, fit, spec.w), opacity: inkOpacity };
  const style = {
    left: placed.center.x,
    top: placed.center.y,
    zIndex: placed.stack,
    rotate: `${spec.tilt}deg`,
    "--boil-frame": `${BOIL.frameMs}ms`,
    "--gap": `${type.gapPx}px`,
    "--reading": `${type.readingPx}px`,
  } as CSSProperties;
  const half = { w: spec.w / 2 + spec.lobe, h: spec.h / 2 + spec.padY };
  return (
    <div className="subject-balloon" style={style}>
      <div ref={float} className="subject-balloon__float">
        <div ref={cloud} className="subject-balloon__cloud">
          <Inked
            ref={drawnCloud}
            white={placed.whitePath}
            inks={inks}
            box={box}
            phase={place / 2}
            line={inkOpacity}
          />
          {inked && (
            <svg
              ref={ink}
              className="subject-balloon__ink"
              viewBox={`${box.minX} ${box.minY} ${box.maxX - box.minX} ${box.maxY - box.minY}`}
              width={box.maxX - box.minX}
              height={box.maxY - box.minY}
              style={{ left: box.minX, top: box.minY }}
              aria-hidden="true"
            >
              <path d={placed.whitePath} />
            </svg>
          )}
        </div>
        <div
          ref={words}
          className="subject-balloon__words"
          style={{ left: -spec.w / 2, top: -spec.h / 2, width: spec.w, height: spec.h }}
        >
          <div className="subject-balloon__word" style={word}>
            <SubjectWord subject={subject} />
          </div>
          {inked && (
            <div ref={lettered} className="subject-balloon__lettered" aria-hidden="true">
              <div className="subject-balloon__word" style={word}>
                <SubjectWord subject={subject} />
              </div>
            </div>
          )}
        </div>
        {pops.map((pop) => (
          <PoppedCloud
            key={pop.id}
            pop={pop}
            placed={placed}
            inks={inks}
            fit={fit}
            phase={place / 2}
            onGone={gone}
          />
        ))}
      </div>
      <button
        type="button"
        className="subject-balloon__pick"
        style={{ left: -half.w, top: -half.h, width: half.w * 2, height: half.h * 2 }}
        aria-label={spokenSubject(subject)}
        aria-pressed={picked}
        aria-disabled={locked || undefined}
        onClick={(event) => {
          if (locked) return;
          tapped.current = clickedAt(drawnCloud.current, event);
          onPick(place);
        }}
      >
        {/* The cloud's own white takes the tap, so all of it picks, lobes and corners too. */}
        <svg
          viewBox={`${box.minX} ${box.minY} ${box.maxX - box.minX} ${box.maxY - box.minY}`}
          width={box.maxX - box.minX}
          height={box.maxY - box.minY}
          style={{ left: box.minX + half.w, top: box.minY + half.h }}
          aria-hidden="true"
        >
          <path d={placed.whitePath} />
        </svg>
      </button>
    </div>
  );
}

/**
 * The thought trail: three bubbles from the cluster toward the artist, still while the clouds drift.
 * They pop in from the smallest, as a thought rises, before the clouds arrive.
 */
function ThoughtTrail({ trail, reduced }: { trail: readonly Bead[]; reduced: boolean }) {
  const layer = useRef<SVGSVGElement>(null);
  const drawings = useMemo(() => trail.map((bead, i) => beadShape(bead.r, 90 + i)), [trail]);
  useEffect(() => {
    if (reduced) return;
    [...(layer.current?.children ?? [])].toReversed().forEach((bead, i) =>
      bead.animate(CLOUD_ARRIVE, {
        duration: ARRIVE.cloudMs,
        delay: i * ARRIVE.staggerMs,
        easing: EASE_OUT,
        fill: "backwards",
      }),
    );
  }, [reduced]);
  return (
    <svg ref={layer} className="subject-trail" aria-hidden="true">
      {trail.map((bead, i) => (
        <g key={i} transform={`translate(${bead.x} ${bead.y})`}>
          <path className="subject-puff__white" d={drawings[i].white} />
          <path className="subject-puff__ink" d={drawings[i].ink} />
        </g>
      ))}
    </svg>
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
        <ThoughtTrail trail={layout.trail} reduced={reduced} />
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
              rolls={deal.rolls}
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
