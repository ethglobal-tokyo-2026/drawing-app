import { useLayoutEffect, useRef } from "react";
import { laminateTurn, mountLaminate, turnLaminate, type LaminateFinish } from "./laminateRenderer";
import "./sticker-laminate.css";

/** The printed paper and its clear film share one cut, independent of ink coverage. */
export function StickerLaminate({
  print,
  cut,
  normal,
  turn = 0,
  finish = "gloss",
}: {
  print: string;
  cut: string;
  normal?: string;
  turn?: number;
  finish?: LaminateFinish;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const heldTurn = useRef(turn);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const release = mountLaminate(canvas, { print, cut, normal, turn: heldTurn.current, finish });
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
