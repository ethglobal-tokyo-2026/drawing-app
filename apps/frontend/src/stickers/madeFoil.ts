/**
 * The foil that marks how a sticker was made, whoever holds it, or null for none: pink on an 18+
 * sticker, winning over the Kyoto Seika Practice Mode foil on one drawn in that mode.
 */
export const madeFoil = ({ nsfw, kyotoSeika }: { nsfw: boolean; kyotoSeika: boolean }) =>
  nsfw ? ("pink" as const) : kyotoSeika ? ("kyoto-seika" as const) : null;

/**
 * The foil a sticker wears on a board, or null for none: the one that marks how it was made, else
 * holo when someone other than the board's owner drew it.
 */
export const boardFoil = (s: { nsfw: boolean; kyotoSeika: boolean; byOther: boolean }) =>
  madeFoil(s) ?? (s.byOther ? ("holo" as const) : null);
