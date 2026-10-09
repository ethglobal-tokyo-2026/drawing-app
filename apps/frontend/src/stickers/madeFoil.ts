/**
 * The foil that marks how a sticker was made, whoever holds it, or null for none: pink on an 18+
 * sticker, winning over the Kyoto Seika Practice Mode foil on one drawn in that mode.
 */
export const madeFoil = ({ nsfw, kyotoSeika }: { nsfw: boolean; kyotoSeika: boolean }) =>
  nsfw ? ("pink" as const) : kyotoSeika ? ("kyoto-seika" as const) : null;
