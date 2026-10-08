import { useEffect, useLayoutEffect, useRef, useState, type Ref, type RefObject } from "react";
import { problemOf } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { useReducedMotion } from "../ui/useReducedMotion";
import { pairLayout, ROOM_PX, type PairLayout } from "./balloonGeometry";
import { BeginKey, type BeginKeyHandle } from "./BeginKey";
import type { Balloon, Deal } from "./deal";
import { SubjectBalloons } from "./SubjectBalloons";
import type { SubjectListState } from "./useKyotoSeikaSheet";
import "./kyoto-seika-deal.css";

/** Begin leaves: the key drops this far and fades, as the balloons tuck into the corner print. */
const LEAVE = { keyDropPx: 56, keyMs: 220, balloonsMs: 360 };

interface Props {
  /** The drawing screen, which the pair is laid out in. */
  screen: RefObject<HTMLDivElement | null>;
  list: SubjectListState;
  deal: Deal | null;
  /** The clock's length, which Begin starts. */
  minutes: number;
  begin: Ref<BeginKeyHandle>;
  onRoll: (balloon: Balloon) => void;
  onBegin: () => void;
  /** Begin was pressed: the deal tucks away, then says it's gone. */
  leaving: boolean;
  onLeft: () => void;
}

/**
 * A fresh sheet's deal in Kyoto Seika Manga Expression Practice Mode: the two balloons between the
 * timer's label and the task over Begin, Begin at the sheet's foot, or why the subjects didn't load.
 */
export function KyotoSeikaDeal({
  screen,
  list,
  deal,
  minutes,
  begin,
  onRoll,
  onBegin,
  leaving,
  onLeft,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const balloons = useRef<HTMLDivElement>(null);
  const [layout, setLayout] = useState<PairLayout | null>(null);

  useLayoutEffect(() => {
    const el = screen.current;
    if (!el) return;
    const measure = () => {
      const box = el.getBoundingClientRect();
      // The timer's label, which keeps the start note's room while off, since a touch brings it.
      const above = el.querySelector(".timer-hint-label") ?? el.querySelector(".drawing-top");
      // Begin with the task line over it.
      const below = el.querySelector(".begin-key");
      if (!above || !below) return;
      setLayout(
        pairLayout({
          width: box.width,
          top: above.getBoundingClientRect().bottom - box.top + ROOM_PX,
          bottom: below.getBoundingClientRect().top - box.top - ROOM_PX,
        }),
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [screen]);

  const left = useRef(onLeft);
  useEffect(() => {
    left.current = onLeft;
  });
  useEffect(() => {
    if (!leaving) return;
    if (reduced) {
      left.current();
      return;
    }
    screen.current?.querySelector(".begin-key")?.animate(
      [
        // Begin sits centered by its own translate, which the drop keeps.
        { translate: "-50% 0", opacity: 1 },
        { translate: `-50% ${LEAVE.keyDropPx}px`, opacity: 0 },
      ],
      { duration: LEAVE.keyMs, easing: EASE_OUT, fill: "forwards" },
    );
    balloons.current?.animate(
      [
        { scale: 1, opacity: 1 },
        { scale: 0.3, opacity: 0 },
      ],
      { duration: LEAVE.balloonsMs, easing: EASE_OUT, fill: "forwards" },
    );
    // The deal unmounts once it has left, which ends its animations.
    const done = setTimeout(() => left.current(), LEAVE.balloonsMs);
    return () => clearTimeout(done);
  }, [leaving, reduced, screen]);

  return (
    <>
      <div ref={balloons} className="kyoto-seika-deal">
        {list.status === "failed" ? (
          <ErrorLine
            className="kyoto-seika-deal__failure"
            detail={problemOf(list.error).detail}
            onRetry={list.retry}
          >
            {t(($) => $.kyotoSeika.balloons.loadFailed)}
          </ErrorLine>
        ) : (
          deal &&
          layout &&
          list.status === "loaded" && (
            <SubjectBalloons deal={deal} layout={layout} onRoll={onRoll} />
          )
        )}
      </div>
      <BeginKey
        ref={begin}
        minutes={minutes}
        ready={deal !== null && list.status === "loaded"}
        onBegin={onBegin}
      />
    </>
  );
}
