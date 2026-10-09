import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type Ref,
  type RefObject,
} from "react";
import { problemOf } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { EASE_OUT } from "../ui/easing";
import { ErrorLine } from "../ui/ErrorLine";
import { useReducedMotion } from "../ui/useReducedMotion";
import { dealLayout, ROOM_PX, type DealInput } from "./balloonGeometry";
import { BeginKey, type BeginKeyHandle } from "./BeginKey";
import { dealKinds, pickedPair, type Deal } from "./deal";
import type { SubjectKind } from "./subjectList";
import { SubjectBalloons } from "./SubjectBalloons";
import type { SubjectListState } from "./useKyotoSeikaSheet";
import "./kyoto-seika-deal.css";

/** The pair area's width and the space the deal stands in. */
type DealSpace = Pick<DealInput, "width" | "top" | "bottom">;

/** Begin leaves: the key drops this far and fades, as the clouds tuck into the corner print. */
const LEAVE = { keyDropPx: 56, keyMs: 220, balloonsMs: 360 };

interface Props {
  /** The drawing screen, which the deal is laid out in. */
  screen: RefObject<HTMLDivElement | null>;
  list: SubjectListState;
  deal: Deal | null;
  /** The sheet's ticket use, which seats the clouds. */
  seed: number;
  /** The clock's length, which Begin starts. */
  minutes: number;
  begin: Ref<BeginKeyHandle>;
  onRoll: () => void;
  onPick: (place: number) => void;
  onBegin: () => void;
  /** Begin was pressed: the deal tucks away, then says it's gone. */
  leaving: boolean;
  onLeft: () => void;
}

/**
 * A fresh sheet's deal in Kyoto Seika Manga Expression Practice Mode: the five clouds between the
 * timer's label, Begin at the sheet's foot, or why the subjects didn't load.
 */
export function KyotoSeikaDeal({
  screen,
  list,
  deal,
  seed,
  minutes,
  begin,
  onRoll,
  onPick,
  onBegin,
  leaving,
  onLeft,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const balloons = useRef<HTMLDivElement>(null);
  const pairArea = useRef<HTMLDivElement>(null);
  const [space, setSpace] = useState<DealSpace | null>(null);
  // Begin keeps only the picked pair: the five stay on screen as they were while the deal leaves.
  const [shown, setShown] = useState(deal);
  if (!leaving && deal !== shown) setShown(deal);
  // Seated by kind, which a roll never changes, so a roll lays nothing out again.
  const subjects = list.status === "loaded" ? list.subjects : null;
  const [kinds, setKinds] = useState<readonly SubjectKind[] | null>(null);
  const dealt = subjects && shown ? dealKinds(subjects, shown) : null;
  if (dealt?.join() !== kinds?.join()) setKinds(dealt);
  const layout = useMemo(
    () =>
      space && subjects && kinds ? dealLayout({ ...space, kinds, list: subjects, seed }) : null,
    [space, subjects, kinds, seed],
  );

  useLayoutEffect(() => {
    const el = screen.current;
    const area = pairArea.current;
    if (!el || !area) return;
    const measure = () => {
      // The pair is laid out in its own area, which a large screen narrows and scales up (CSS).
      const box = area.getBoundingClientRect();
      const scale = box.width / area.offsetWidth || 1;
      // The timer's label, which keeps the start note's room while off, since a touch brings it.
      const above = el.querySelector(".timer-hint-label") ?? el.querySelector(".drawing-top");
      const below = el.querySelector(".begin-key");
      if (!above || !below) return;
      const next = {
        width: area.offsetWidth,
        top: (above.getBoundingClientRect().bottom - box.top) / scale + ROOM_PX,
        bottom: (below.getBoundingClientRect().top - box.top) / scale - ROOM_PX,
      };
      setSpace((was) =>
        was && was.width === next.width && was.top === next.top && was.bottom === next.bottom
          ? was
          : next,
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    observer.observe(area);
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
        <div ref={pairArea} className="kyoto-seika-deal__pair">
          {list.status === "failed" ? (
            <ErrorLine
              className="kyoto-seika-deal__failure"
              detail={problemOf(list.error).detail}
              onRetry={list.retry}
            >
              {t(($) => $.kyotoSeika.balloons.loadFailed)}
            </ErrorLine>
          ) : (
            shown &&
            layout &&
            list.status === "loaded" && (
              <SubjectBalloons deal={shown} layout={layout} onRoll={onRoll} onPick={onPick} />
            )
          )}
        </div>
      </div>
      <BeginKey
        ref={begin}
        minutes={minutes}
        ready={deal !== null && pickedPair(deal) !== null && list.status === "loaded"}
        onBegin={onBegin}
      />
    </>
  );
}
