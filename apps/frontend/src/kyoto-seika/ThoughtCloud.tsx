import { useEffect, useMemo, useRef, type Ref } from "react";
import { EASE_OUT } from "../ui/easing";
import { beadShape, type Bead, type Box } from "./balloonGeometry";
import { ARRIVE, BOIL, CLOUD_ARRIVE } from "./dealMotion";
import "./subject-balloons.css";

/**
 * A cloud: the white, and the pen line over it in each boil frame, one showing at a time, in an SVG
 * the size of `box`. `phase` shifts the boil, in frames, so no two clouds flick in step. `line` is the
 * pen line's opacity: a cloud fades its line, never its white.
 */
export function Inked({
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

/** How a trail's bubbles pop in: each this long, each this long after the one before. */
interface TrailPace {
  ms: number;
  staggerMs: number;
}

/**
 * The thought trail: bubbles from a cloud toward its thinker, still while the clouds drift. They pop
 * in from the smallest, as a thought rises, before the clouds arrive.
 */
export function ThoughtTrail({
  trail,
  reduced,
  pace = { ms: ARRIVE.cloudMs, staggerMs: ARRIVE.staggerMs },
}: {
  trail: readonly Bead[];
  reduced: boolean;
  pace?: TrailPace;
}) {
  const layer = useRef<SVGSVGElement>(null);
  const drawings = useMemo(() => trail.map((bead, i) => beadShape(bead.r, 90 + i)), [trail]);
  const { ms, staggerMs } = pace;
  useEffect(() => {
    if (reduced) return;
    [...(layer.current?.children ?? [])].toReversed().forEach((bead, i) =>
      bead.animate(CLOUD_ARRIVE, {
        duration: ms,
        delay: i * staggerMs,
        easing: EASE_OUT,
        fill: "backwards",
      }),
    );
  }, [reduced, ms, staggerMs]);
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
