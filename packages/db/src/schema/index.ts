import { gifts } from "./gifts.ts";
import { gratitude } from "./gratitude.ts";
import { stickerPlacements } from "./stickerPlacements.ts";
import { stickers, stickerTimelapses } from "./stickers.ts";
import { ticketPurchases, ticketUses } from "./tickets.ts";
import { users } from "./users.ts";

export { escrowStatuses, giftStatuses } from "./gifts.ts";
export { gratitudeMethods } from "./gratitude.ts";
export {
  gifts,
  gratitude,
  stickerPlacements,
  stickers,
  stickerTimelapses,
  ticketPurchases,
  ticketUses,
  users,
};

/** Every table: the updated_at triggers cover each one. */
export const allTables = [
  users,
  stickers,
  stickerTimelapses,
  ticketUses,
  ticketPurchases,
  stickerPlacements,
  gifts,
  gratitude,
] as const;
