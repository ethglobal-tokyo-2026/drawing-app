/** The room the Settings peek keeps clear beneath the stats' last paper, in px. */
const PEEK_GAP = 8;

/**
 * Whether the stats end above the band of the cork's foot that the Settings peek takes, `shown` px
 * tall. When they don't, the peek would ride over their last papers, Flip back among them.
 */
export const statsClearPeek = (corkHeight: number, statsBottom: number, shown: number) =>
  statsBottom + PEEK_GAP <= corkHeight - shown;
