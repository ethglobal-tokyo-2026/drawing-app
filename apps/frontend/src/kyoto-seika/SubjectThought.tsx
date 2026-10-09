import { useEffect, useMemo, useRef, type CSSProperties } from "react";
import { currentLanguage } from "../i18n/i18n";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { cloudShape, type PairSize, type Pt } from "./balloonGeometry";
import { ARRIVE, BOIL, CLOUD_ARRIVE, PEEK, SPRING, WORD_STAMP } from "./dealMotion";
import { SubjectWord } from "./SubjectWord";
import { Inked, ThoughtTrail } from "./ThoughtCloud";
import { thoughtLayout, type Pair } from "./thoughtLayout";
import "./subject-thought.css";

interface Props {
  subjects: Pair;
  /** A peek over a board's sticker, which plays and goes, or the sticker detail's, which stays. */
  size: PairSize;
  /** The way from the clouds to the sticker, which the trail runs. */
  toward: Pt;
  reduced: boolean;
  /** Where it sits on a board, by its top-left; the detail's sits in its column. */
  at?: Pt;
  /** A peek has played and faded. */
  onDone?: () => void;
}

/**
 * The subjects a sticker drawn in Kyoto Seika Practice Mode was dealt, in the deal's thought clouds
 * with a trail of bubbles back to it. Hidden from screen readers, which hear the pair in the sticker's
 * name or the detail's line instead.
 */
export function SubjectThought({ subjects, size, toward, reduced, at, onDone }: Props) {
  // Rendered again as the language changes, so the words follow it.
  useTranslation();
  const english = currentLanguage() === "en";
  const { x, y } = toward;
  const layout = useMemo(
    () => thoughtLayout(subjects, size, { x, y }, english),
    [subjects, size, x, y, english],
  );
  const inks = useMemo(() => layout.balloons.map((b) => cloudShape(b.spec).inks), [layout]);
  const root = useRef<HTMLDivElement>(null);
  const puffs = useRef<(HTMLDivElement | null)[]>([]);
  const words = useRef<(HTMLDivElement | null)[]>([]);
  const peek = size === "peek";
  const done = useRef(onDone);
  useEffect(() => {
    done.current = onDone;
  });

  useEffect(() => {
    const played: Animation[] = [];
    const play = (
      el: Element | null | undefined,
      keyframes: Keyframe[],
      timing: KeyframeAnimationOptions,
    ) => {
      const motion = el?.animate(keyframes, timing);
      if (!motion) return undefined;
      played.push(motion);
      // Cancelling rejects `finished` with an AbortError: that's the cancel asked for, not a failure.
      motion.finished.catch(() => {});
      return motion;
    };
    let shown: number;
    if (reduced) {
      shown = PEEK.reducedInMs;
      play(root.current, [{ opacity: 0 }, { opacity: 1 }], {
        duration: shown,
        easing: EASE_OUT,
        fill: "backwards",
      });
    } else {
      const pace = peek
        ? {
            first: PEEK.cloudAfterMs,
            stagger: PEEK.cloudStaggerMs,
            cloud: PEEK.cloudMs,
            wordAfter: PEEK.wordAfterMs - PEEK.cloudAfterMs,
            word: PEEK.wordMs,
          }
        : {
            first: ARRIVE.firstMs,
            stagger: ARRIVE.staggerMs,
            cloud: ARRIVE.cloudMs,
            wordAfter: ARRIVE.wordAfterMs,
            word: ARRIVE.wordMs,
          };
      shown = 0;
      layout.balloons.forEach((_, i) => {
        const start = pace.first + i * pace.stagger;
        play(puffs.current[i], CLOUD_ARRIVE, {
          duration: pace.cloud,
          delay: start,
          easing: EASE_OUT,
          fill: "backwards",
        });
        play(words.current[i], WORD_STAMP, {
          duration: pace.word,
          delay: start + pace.wordAfter,
          easing: SPRING,
          fill: "backwards",
        });
        shown = Math.max(shown, start + pace.cloud, start + pace.wordAfter + pace.word);
      });
    }
    if (peek) {
      const fade = play(root.current, [{ opacity: 1 }, { opacity: 0 }], {
        duration: PEEK.fadeMs,
        delay: shown + PEEK.holdMs,
        fill: "forwards",
      });
      fade?.finished.then(
        () => done.current?.(),
        () => {},
      );
    }
    return () => played.forEach((motion) => motion.cancel());
  }, [layout, peek, reduced]);

  const style = {
    width: layout.w,
    height: layout.h,
    "--boil-frame": `${BOIL.frameMs}ms`,
    ...(at && { left: at.x, top: at.y }),
  } as CSSProperties;
  return (
    <div
      ref={root}
      className={`subject-thought subject-thought--${size} ${peek && !reduced ? "" : "is-still"}`}
      style={style}
      aria-hidden="true"
    >
      <ThoughtTrail
        trail={layout.trail}
        reduced={reduced}
        {...(peek && { pace: { ms: PEEK.beadMs, staggerMs: PEEK.beadStaggerMs } })}
      />
      {layout.balloons.map((placed, i) => {
        const { spec } = placed;
        const subject = subjects[i];
        return (
          <div
            key={i}
            className="subject-thought__cloud"
            style={{ left: placed.center.x, top: placed.center.y, rotate: `${spec.tilt}deg` }}
          >
            <div ref={(el) => void (puffs.current[i] = el)} className="subject-thought__puff">
              <Inked white={placed.whitePath} inks={inks[i]} box={placed.cloudBox} phase={i / 2} />
            </div>
            <div
              ref={(el) => void (words.current[i] = el)}
              className={`subject-thought__words ${english ? "is-english" : ""}`}
              style={{
                left: -spec.w / 2,
                top: -spec.h / 2,
                width: spec.w,
                height: spec.h,
                fontSize: placed.fontPx,
              }}
            >
              {english ? (
                placed.lines.map((line, n) => (
                  <span key={n} className="subject-thought__line">
                    {line}
                  </span>
                ))
              ) : size === "detail" ? (
                <SubjectWord subject={subject} />
              ) : (
                <span lang="ja">{subject.ja}</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
