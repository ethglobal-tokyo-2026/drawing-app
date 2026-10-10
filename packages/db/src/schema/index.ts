import { chatMenuBatches } from "./chatMenuBatches.ts";
import { gifts } from "./gifts.ts";
import { gratitude } from "./gratitude.ts";
import { stickerPlacements } from "./stickerPlacements.ts";
import { stickers, stickerTimelapses } from "./stickers.ts";
import { suiTransactions } from "./suiTransactions.ts";
import { ticketPurchases, ticketUses } from "./tickets.ts";
import { users } from "./users.ts";
import { veiledImages } from "./veiledImages.ts";

export { escrowStatuses, giftStatuses } from "./gifts.ts";
export { suiTransactionKinds, suiTransactionOutcomes } from "./suiTransactions.ts";
export { ticketKinds } from "./tickets.ts";
export {
  chatMenuBatches,
  gifts,
  gratitude,
  stickerPlacements,
  stickers,
  stickerTimelapses,
  suiTransactions,
  ticketPurchases,
  ticketUses,
  users,
  veiledImages,
};

/** Every table: the updated_at triggers cover each one. */
export const allTables = [
  users,
  stickers,
  stickerTimelapses,
  veiledImages,
  ticketUses,
  ticketPurchases,
  stickerPlacements,
  gifts,
  gratitude,
  chatMenuBatches,
  suiTransactions,
] as const;
