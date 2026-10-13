import { useLayoutEffect, useRef } from "react";
import {
  laminateTurn,
  mountLaminate,
  refreshLaminate,
  turnLaminate,
  type LaminateFinish,
} from "./laminateRenderer";
import "./sticker-laminate.css";

/** The printed paper and its clear film share one cut, independent of ink coverage. */
export function StickerLaminate({
  print,
  cut,
  normal,
  turn = 0,
  finish = "gloss",
  active = true,
}: {
  print: string;
  cut: string;
  normal?: string;
  turn?: number;
  finish?: LaminateFinish;
  /** An exposed surface draws; a covered one retains its last snapshot. */
  active?: boolean;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const heldTurn = useRef(turn);
  const heldActive = useRef(active);
  useLayoutEffect(() => {
    heldActive.current = active;
  }, [active]);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const release = mountLaminate(canvas, {
      print,
      cut,
      normal,
      turn: heldTurn.current,
      finish,
      active: () => heldActive.current,
    });
    return () => {
      // A live board gesture can turn the surface before its saved placement reaches React.
      heldTurn.current = laminateTurn(canvas) ?? heldTurn.current;
      release();
    };
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
    <canvas
      ref={ref}
      className="sticker-laminate"
      data-finish={finish}
      data-state="loading"
      aria-hidden="true"
    />
  );
}
