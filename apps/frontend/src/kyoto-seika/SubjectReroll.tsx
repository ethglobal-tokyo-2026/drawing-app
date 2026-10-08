import type { KyotoSeikaSubject } from "@drawing-app/api/client";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { useTranslation } from "../i18n/react";
import type { Box } from "./balloonGeometry";
import type { Balloon } from "./deal";
import { DIE_TUMBLE, ROLL, SHAKE, TUMBLE_EASE } from "./dealMotion";
import { brokenDieDrawing, dieDrawing, dieFace, SMOKE_WISPS } from "./dieArt";
import { dieMood } from "./dieMood";
import "./subject-reroll.css";

/** A wisp of smoke rising and fading on a loop, `at` px across from where it starts and `after` s late. */
export function Wisp({ d, at, after }: { d: string; at: number; after: number }) {
  return (
    <svg
      className="smoke-wisp"
      viewBox="-8 -30 16 32"
      width="16"
      height="32"
      style={{ left: at - 8, animationDelay: `${-after}s` }}
    >
      <path d={d} />
    </svg>
  );
}

/** A roll's コロッ pops just over its die, this far in from the reroll's right end and up from its top. */
const SOUND_LEFT_PX = 34;
const SOUND_UP_PX = 15;

interface Props {
  balloon: Balloon;
  /** The subject a roll would replace. */
  subject: KyotoSeikaSubject;
  rolls: number;
  /** The die and its lettering, on the screen. */
  box: Box;
  reduced: boolean;
  onRoll: (balloon: Balloon) => void;
}

/**
 * A cloud's reroll, fixed on the sheet under the cloud's right edge however the cloud drifts: a die
 * inked in the cloud's own pen, beside hand lettering, as one button that deals the cloud another
 * subject, until rolling too often blows the die up.
 */
export function SubjectReroll({ balloon, subject, rolls, box, reduced, onRoll }: Props) {
  const { t } = useTranslation();
  const die = useRef<HTMLSpanElement>(null);
  const { charred, smoking, shake } = dieMood(rolls);
  const shaking = !reduced && shake > 0;

  // Each roll that lands, rather than blows the die up, pops its コロッ beside the die.
  const [landed, setLanded] = useState(rolls);
  const [sound, setSound] = useState<number | null>(null);
  if (rolls !== landed) {
    setLanded(rolls);
    setSound(rolls > landed && !reduced && !charred ? rolls : null);
  }
  useEffect(() => {
    if (sound === null) return;
    die.current?.animate(DIE_TUMBLE, { duration: ROLL.dieMs, easing: TUMBLE_EASE });
    const gone = setTimeout(() => setSound(null), ROLL.soundMs);
    return () => clearTimeout(gone);
  }, [sound]);

  const face = dieFace(balloon, rolls);
  const broken = charred ? brokenDieDrawing(balloon, face) : null;
  const drawing = broken ?? dieDrawing(balloon, face);
  return (
    <>
      <button
        type="button"
        className={`subject-reroll ${charred ? "is-broken" : ""} ${shaking ? "is-shaking" : ""}`}
        style={
          {
            left: box.minX,
            top: box.minY,
            width: box.maxX - box.minX,
            height: box.maxY - box.minY,
            "--shake-px": `${SHAKE.maxPx * shake}px`,
            "--shake-deg": `${SHAKE.maxDeg * shake}deg`,
            "--shake-ms": `${SHAKE.slowMs - (SHAKE.slowMs - SHAKE.fastMs) * shake}ms`,
          } as CSSProperties
        }
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
        <span className="subject-reroll__label">{t(($) => $.kyotoSeika.balloons.reroll)}</span>
        <span ref={die} className="subject-reroll__die">
          <svg viewBox="-16 -16 32 32" width="32" height="32" aria-hidden="true">
            {broken && <path className="subject-reroll__shards" d={broken.shards} />}
            <path className="subject-reroll__face" d={drawing.white} />
            <path className="subject-reroll__pips" d={drawing.pips} />
            {broken && <path className="subject-reroll__cracks" d={broken.cracks} />}
            <path className="subject-reroll__ink" d={drawing.ink} />
          </svg>
          {smoking && !reduced && (
            <span className="subject-reroll__smoke" aria-hidden="true">
              {SMOKE_WISPS.slice(0, charred ? 2 : 1).map((wisp, i) => (
                <Wisp key={i} d={wisp} at={i * 9 - (charred ? 4 : 0)} after={i * 1.1} />
              ))}
            </span>
          )}
        </span>
      </button>
      {sound !== null && (
        <span
          key={sound}
          className="subject-reroll__sound"
          style={{
            left: box.maxX - SOUND_LEFT_PX,
            top: box.minY - SOUND_UP_PX,
            animationDuration: `${ROLL.soundMs}ms`,
          }}
          aria-hidden="true"
        >
          {t(($) => $.kyotoSeika.balloons.rollSound)}
        </span>
      )}
    </>
  );
}
