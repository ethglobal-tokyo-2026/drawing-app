import { useLayoutEffect, useRef } from "react";
import {
  laminateTurn,
  mountLaminate,
  refreshLaminate,
  turnLaminate,
  updateLaminate,
  type LaminateFinish,
} from "./laminateRenderer";
import "./sticker-laminate.css";
import "./crease-reveal.css";

/** The printed paper and its clear film share one cut, independent of ink coverage. */
export function StickerLaminate({
  print,
  cut,
  normal,
  turn = 0,
  finish = "gloss",
  active = true,
  onCreaseProgress,
  canRevealCrease,
  startCreaseReveal,
}: {
  print: string;
  cut: string;
  normal?: string;
  turn?: number;
  finish?: LaminateFinish;
  /** An exposed surface draws; a covered one retains its last snapshot. */
  active?: boolean;
  /** Paint follows the same ready normal and diagonal progress as the reflected bend. */
  onCreaseProgress?: (normal: string, progress: number) => void;
  /** Whether the accepted normal belongs to an explicit placement awaiting its reveal. */
  canRevealCrease?: (normal: string) => boolean;
  /** Consumes that placement after the first valid real snapshot copy. */
  startCreaseReveal?: (normal: string) => boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const heldTurn = useRef(turn);
  const heldActive = useRef(active);
  const heldMaterial = useRef({ print, cut, normal, finish });
  const heldCreaseProgress = useRef(onCreaseProgress);
  const heldCreaseEligibility = useRef({ canRevealCrease, startCreaseReveal });
  useLayoutEffect(() => {
    heldCreaseEligibility.current = { canRevealCrease, startCreaseReveal };
  }, [canRevealCrease, startCreaseReveal]);
  useLayoutEffect(() => {
    heldCreaseProgress.current = onCreaseProgress;
  }, [onCreaseProgress]);
  useLayoutEffect(() => {
    heldMaterial.current = { print, cut, normal, finish };
  }, [print, cut, normal, finish]);
  useLayoutEffect(() => {
    heldActive.current = active;
  }, [active]);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const release = mountLaminate(canvas, {
      print: heldMaterial.current.print,
      cut: heldMaterial.current.cut,
      normal: heldMaterial.current.normal,
      turn: heldTurn.current,
      finish: heldMaterial.current.finish,
      active: () => heldActive.current,
      canRevealCrease: (normal: string) =>
        heldCreaseEligibility.current.canRevealCrease?.(normal) ?? false,
      startCreaseReveal: (normal: string) =>
        heldCreaseEligibility.current.startCreaseReveal?.(normal) ?? false,
      ...(heldCreaseProgress.current && {
        onCreaseProgress: (normal: string, progress: number) =>
          heldCreaseProgress.current?.(normal, progress),
      }),
    });
    return () => {
      // A live board gesture can turn the surface before its saved placement reaches React.
      heldTurn.current = laminateTurn(canvas) ?? heldTurn.current;
      release();
    };
  }, []);
  useLayoutEffect(() => {
    if (ref.current) updateLaminate(ref.current, { print, cut, normal, finish });
  }, [print, cut, normal, finish]);
  useLayoutEffect(() => {
    heldTurn.current = turn;
    if (ref.current) turnLaminate(ref.current, turn);
  }, [turn]);
  useLayoutEffect(() => {
    // Re-exposure samples the held pose even when no new light input arrives.
    if (active && ref.current) refreshLaminate(ref.current);
  }, [active]);
  return (
    <span className="sticker-laminate-surface" aria-hidden="true">
      <span className="crease-reveal-frame sticker-laminate-bend">
        <span className="crease-reveal-content">
          <canvas
            ref={ref}
            className="sticker-laminate"
            data-finish={finish}
            data-state="loading"
            aria-hidden="true"
          />
        </span>
      </span>
    </span>
  );
}
