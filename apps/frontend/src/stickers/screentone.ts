/**
 * The Kyoto Seika Practice Mode foil's screentone: how many tiles span the sticker's short side,
 * the CSS px a tile never shrinks under so board dots stay crisp, and each dot's radius in tiles.
 */
export const SCREENTONE = { tilesAcross: 80, minPitch: 3, dotRadius: 0.268 } as const;

/** CSS px from one screentone dot to the next on a sticker shown this big. */
export const screentonePitch = (width: number, height: number) =>
  Math.max(SCREENTONE.minPitch, Math.min(width, height) / SCREENTONE.tilesAcross);
