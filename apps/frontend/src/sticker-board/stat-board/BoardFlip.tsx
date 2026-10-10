import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react";
import { useReducedMotion } from "../../ui/useReducedMotion";
import "./board-flip.css";
import { RestingSide, type BoardSide } from "./restingSide";

interface Props {
  /** The stat board faces out, rather than the Sticker Board. */
  turned: boolean;
  front: ReactNode;
  back: ReactNode;
  /** A tap mid-turn asks for the side the board is leaving; setting `turned` to it runs the turn back. */
  onTurnedChange: (turned: boolean) => void;
  /** The board has landed, on the side `turned` names. */
  onTurnEnd?: (turned: boolean) => void;
  /** Focused when the board lands with its front out. */
  frontFocus?: RefObject<HTMLElement | null>;
  /** Focused when the board lands on its stat board. */
  backFocus?: RefObject<HTMLElement | null>;
}

const TURN_MS = 640;

// Lifted off the wall a little, turned on its long axis, and set down past flat so it settles back.
const TURN: Keyframe[] = [
  { transform: "rotateY(0deg) scale(1)", easing: "cubic-bezier(.45,0,.75,.45)" },
  { transform: "rotateY(90deg) scale(.92)", offset: 0.44, easing: "cubic-bezier(.25,.6,.35,1)" },
  { transform: "rotateY(184deg) scale(1.005)", offset: 0.84, easing: "cubic-bezier(.16,1,.3,1)" },
  { transform: "rotateY(180deg) scale(1)" },
];
const FRONT_SHADE: Keyframe[] = [{ opacity: 0 }, { opacity: 0.5, offset: 0.44 }, { opacity: 0.5 }];
const REAR_SHADE: Keyframe[] = [
  { opacity: 0.5 },
  { opacity: 0.5, offset: 0.44 },
  { opacity: 0, offset: 0.8 },
  { opacity: 0 },
];

// Landing and unmounting cancel the turn, which rejects `finished`; anything else is a real failure.
function reportUnlessCancelled(error: unknown) {
  if (error instanceof DOMException && error.name === "AbortError") return;
  console.error("The board's turn failed", error);
}

/**
 * Turns the Sticker Board over to its stat board and back. The face turning away goes inert as
 * the turn starts, and the front comes back out of inert as it lands; a tap mid-turn runs it back
 * from wherever it is. Reduced motion crossfades.
 */
export function BoardFlip({
  turned,
  front,
  back,
  onTurnedChange,
  onTurnEnd,
  frontFocus,
  backFocus,
}: Props) {
  const flip = useRef<HTMLDivElement>(null);
  const frontShade = useRef<HTMLElement>(null);
  const rearShade = useRef<HTMLElement>(null);
  const running = useRef<Animation[]>([]);
  // The side the board rests on, or is turning toward.
  const heading = useRef(turned);
  // Set anew by every landing, even on the side it left, so the landing's focus follows its render.
  const [landed, setLanded] = useState<{ side: BoardSide }>({ side: turned ? "back" : "front" });
  const resting = landed.side;
  // Focused once the landing's render has lifted inert from the face it lands on.
  const landingFocus = useRef<RefObject<HTMLElement | null> | undefined>(undefined);
  const reduced = useReducedMotion();
  // The turn lands after later renders, so it reads their props.
  const latest = useRef({ turned, onTurnEnd, frontFocus, backFocus });
  useLayoutEffect(() => {
    latest.current = { turned, onTurnEnd, frontFocus, backFocus };
  });

  // Before paint, so the first frame of a turn is its first keyframe rather than the side it's headed to.
  useLayoutEffect(() => {
    if (turned === heading.current) return;
    heading.current = turned;
    if (running.current.length) {
      for (const animation of running.current) animation.reverse();
      return;
    }
    const land = () => {
      for (const animation of running.current) animation.cancel();
      running.current = [];
      const now = latest.current;
      landingFocus.current = now.turned ? now.backFocus : now.frontFocus;
      setLanded({ side: now.turned ? "back" : "front" });
      now.onTurnEnd?.(now.turned);
    };
    const board = flip.current;
    if (reduced || !board || !frontShade.current || !rearShade.current) {
      land();
      return;
    }
    const timing: KeyframeAnimationOptions = {
      duration: TURN_MS,
      fill: "both",
      direction: turned ? "normal" : "reverse",
    };
    const turn = board.animate(TURN, timing);
    running.current = [
      turn,
      frontShade.current.animate(FRONT_SHADE, timing),
      rearShade.current.animate(REAR_SHADE, timing),
    ];
    turn.finished.then(land, reportUnlessCancelled);
  }, [turned, reduced]);

  useLayoutEffect(() => {
    const target = landingFocus.current;
    landingFocus.current = undefined;
    const board = flip.current;
    if (!target || !board) return;
    if (target.current) {
      target.current.focus({ preventScroll: true });
      return;
    }
    // The face may still be loading its code, as the stat board does on its first turn: what it
    // focuses takes focus as it mounts, unless focus has gone somewhere else meanwhile.
    const mounted = new MutationObserver(() => {
      if (!target.current) return;
      mounted.disconnect();
      const active = document.activeElement;
      if (!active || active === document.body || board.contains(active))
        target.current.focus({ preventScroll: true });
    });
    mounted.observe(board, { childList: true, subtree: true });
    return () => mounted.disconnect();
  }, [landed]);

  useEffect(
    () => () => {
      for (const animation of running.current) animation.cancel();
    },
    [],
  );

  return (
    <div
      className={["board-turn", turned && "is-turned", reduced && "is-calm"]
        .filter(Boolean)
        .join(" ")}
      onClickCapture={(e) => {
        if (!running.current.length) return;
        e.stopPropagation();
        e.preventDefault();
        onTurnedChange(!turned);
      }}
    >
      <RestingSide value={resting}>
        <div className="board-flip" ref={flip}>
          {/* Turning back, the front stays inert until it lands: lifting inert restyles every sticker,
              which costs the turn's first frame. Rested out of sight, it's away until it lands again. */}
          <div
            className="board-front"
            inert={turned || resting === "back"}
            data-away={resting === "back" ? "" : undefined}
          >
            {front}
            <i className="board-shade" ref={frontShade} aria-hidden />
          </div>
          <div className="board-rear" inert={!turned}>
            {back}
            <i className="board-shade" ref={rearShade} aria-hidden />
          </div>
        </div>
      </RestingSide>
    </div>
  );
}
