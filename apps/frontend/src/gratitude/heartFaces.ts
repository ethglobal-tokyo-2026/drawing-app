import type { Tier } from "./combo";

export type HeartFaceName = "none" | "dots" | "shy" | "hearts" | "over" | "bliss" | "wide" | "limp";

/** What the heart's face layers show. */
export interface HeartFace {
  face: HeartFaceName;
  blush: 0 | 1 | 2;
  sweat: boolean;
  /** The boiling outline. */
  ink: boolean;
  /** The nosebleed. */
  nose: boolean;
  pale: boolean;
}

/** オーバーヒート's nosebleed waits until the tier is well under way. */
const NOSEBLEED_FROM_TOTAL = 1800;

/**
 * The heart's face for a tier, blank before the catch. Low intensity keeps each tier's face but
 * spares it the boiling outline, the full blush and the nosebleed.
 */
export function heartFaceFor(tier: Tier | null, intensity: number, total: number): HeartFace {
  const calm: HeartFace = {
    face: "none",
    blush: 0,
    sweat: false,
    ink: false,
    nose: false,
    pale: false,
  };
  const ink = intensity >= 0.15;
  const blush = intensity >= 0.2 ? 2 : 1;
  const nose = intensity >= 0.35;
  switch (tier) {
    case null:
      return calm;
    case 0:
      return { ...calm, face: "dots" };
    case 1:
      return { ...calm, face: "shy", blush: 1, sweat: true };
    case 2:
      return { ...calm, face: "hearts", blush: 1, sweat: true, ink };
    case 3:
      return {
        ...calm,
        face: "over",
        blush,
        sweat: true,
        ink,
        nose: nose && total >= NOSEBLEED_FROM_TOTAL,
      };
    case 4:
      return { ...calm, face: "bliss", blush, ink, nose };
  }
}
