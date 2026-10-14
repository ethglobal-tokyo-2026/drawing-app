import { useContext, useLayoutEffect, useRef } from "react";
import { LaminateActiveContext } from "./laminateActiveContext";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";
import { prepareStickerFoil } from "./prepareStickerFoil";
import "./sticker-foil.css";

/** A still fallback and cast, registered to the complete material's authoritative outer coverage. */
export function StickerFoil({
  material,
  cut,
  active: surfaceActive = true,
}: {
  material: StickerFoilMaterial;
  cut: string;
  active?: boolean;
}) {
  // A covered board prepares no coverage for its foil, as it renders no material.
  const active = useContext(LaminateActiveContext) && surfaceActive;
  const ref = useRef<HTMLSpanElement>(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    return prepareStickerFoil(element, material, cut, () => active);
  }, [material, cut, active]);
  return (
    <span
      ref={ref}
      className={`sticker-foil sticker-foil--${material.size} sticker-foil--${material.style}`}
      aria-hidden="true"
    >
      <span className="sticker-foil__cast" />
      <span className="sticker-foil__band" />
    </span>
  );
}
