import { useContext, useLayoutEffect, useRef } from "react";
import type { LaminateFinish } from "./laminate";
import { LaminateActiveContext } from "./laminateActiveContext";
import {
  stickerTurn,
  mountSticker,
  refreshSticker,
  turnSticker,
  updateSticker,
  type StickerFoilMaterial,
  type StickerSurface,
} from "./stickerRenderer";
import { stickerMaterialActive } from "./stickerMaterialHandoff";
import "./sticker-material.css";
import "./crease-reveal.css";

/** The complete output shares paper, ink, laminate and foil with one pose and registered normal. */
export function StickerMaterial({
  print,
  cut,
  normal,
  height,
  maxSlope,
  normalBounds,
  foil,
  turn = 0,
  finish = "gloss",
  active: surfaceActive = true,
  onCreaseProgress,
  canRevealCrease,
  startCreaseReveal,
}: {
  print: string;
  cut: string;
  normal?: string;
  /** The drape's height, registered with its normal. */
  height?: string;
  maxSlope?: number;
  normalBounds?: StickerSurface["normalBounds"];
  foil?: StickerFoilMaterial;
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
  const active = useContext(LaminateActiveContext) && surfaceActive;
  const ref = useRef<HTMLCanvasElement>(null);
  const surface = useRef<HTMLSpanElement>(null);
  const heldTurn = useRef(turn);
  const heldActive = useRef(active);
  const heldMaterial = useRef({ print, cut, normal, height, maxSlope, normalBounds, foil, finish });
  const heldCreaseProgress = useRef(onCreaseProgress);
  const heldCreaseEligibility = useRef({ canRevealCrease, startCreaseReveal });
  useLayoutEffect(() => {
    heldCreaseEligibility.current = { canRevealCrease, startCreaseReveal };
  }, [canRevealCrease, startCreaseReveal]);
  useLayoutEffect(() => {
    heldCreaseProgress.current = onCreaseProgress;
  }, [onCreaseProgress]);
  useLayoutEffect(() => {
    heldMaterial.current = { print, cut, normal, height, maxSlope, normalBounds, foil, finish };
  }, [print, cut, normal, height, maxSlope, normalBounds, foil, finish]);
  useLayoutEffect(() => {
    heldActive.current = active;
  }, [active]);
  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const release = mountSticker(canvas, {
      print: heldMaterial.current.print,
      cut: heldMaterial.current.cut,
      normal: heldMaterial.current.normal,
      ...(heldMaterial.current.height && { height: heldMaterial.current.height }),
      ...(heldMaterial.current.maxSlope !== undefined && {
        maxSlope: heldMaterial.current.maxSlope,
      }),
      ...(heldMaterial.current.foil && { foil: heldMaterial.current.foil }),
      ...(heldMaterial.current.normalBounds && { normalBounds: heldMaterial.current.normalBounds }),
      turn: heldTurn.current,
      finish: heldMaterial.current.finish,
      active: () => stickerMaterialActive(canvas, heldActive.current),
      canRevealCrease: (normal: string) =>
        heldCreaseEligibility.current.canRevealCrease?.(normal) ?? false,
      startCreaseReveal: (normal: string) =>
        heldCreaseEligibility.current.startCreaseReveal?.(normal) ?? false,
      ...(heldCreaseProgress.current && {
        onCreaseProgress: (normal: string, progress: number) =>
          heldCreaseProgress.current?.(normal, progress),
      }),
    });
    // The retained crease frame can keep the canvas's old size while its source wrapper resizes.
    // Observe that source box so paper, foil, and cast reach the new geometry before another tilt.
    const resizes = new ResizeObserver(() => refreshSticker(canvas));
    resizes.observe(surface.current ?? canvas);
    return () => {
      resizes.disconnect();
      // A live board gesture can turn the surface before its saved placement reaches React.
      heldTurn.current = stickerTurn(canvas) ?? heldTurn.current;
      release();
    };
  }, []);
  useLayoutEffect(() => {
    if (ref.current)
      updateSticker(ref.current, {
        print,
        cut,
        normal,
        finish,
        ...(height && { height }),
        ...(maxSlope !== undefined && { maxSlope }),
        ...(foil && { foil }),
        ...(normalBounds && { normalBounds }),
      });
  }, [print, cut, normal, height, maxSlope, normalBounds, foil, finish]);
  useLayoutEffect(() => {
    heldTurn.current = turn;
    if (ref.current) turnSticker(ref.current, turn);
  }, [turn]);
  useLayoutEffect(() => {
    // Re-exposure samples the held pose even when no new light input arrives.
    if (active && ref.current) refreshSticker(ref.current);
  }, [active]);
  return (
    <span ref={surface} className="sticker-material-surface" aria-hidden="true">
      <span className="crease-reveal-frame sticker-material-bend">
        <span className="crease-reveal-content">
          <canvas
            ref={ref}
            className="sticker-material"
            data-finish={finish}
            data-foil-style={foil?.style}
            data-state="loading"
            aria-hidden="true"
          />
        </span>
      </span>
    </span>
  );
}
