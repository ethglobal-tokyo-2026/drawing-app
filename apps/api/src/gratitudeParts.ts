/** A combo, with who its gratitude can go to. */
interface Combo {
  giverId: string;
  /** The sticker's Original Artist. */
  artistId: string;
  total: number;
  /** The combo's Original Artist Gratitude Share. */
  share: number;
}

/**
 * Who a combo's gratitude went to: its gift's giver gets the total less any Original Artist Gratitude
 * Share (Direct), and the sticker's Original Artist gets the share (Residual).
 */
export const gratitudeParts = ({ giverId, artistId, total, share }: Combo) =>
  [
    { personId: giverId, part: "direct", value: total - share },
    { personId: artistId, part: "residual", value: share },
  ] as const;
