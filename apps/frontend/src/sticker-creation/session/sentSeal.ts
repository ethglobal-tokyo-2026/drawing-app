import type { Tickets } from "@drawing-app/api/client";
import { personKey, readStored, writeStored } from "../../ui/deviceStorage";

/**
 * The ticket use whose seal request went out with no answer yet, kept on this device so a reload
 * doesn't reopen a sheet the server may already have sealed: it comes back locked, for the seal key.
 * Kept per person, as the sticker in progress is, so someone else sealing here never clears it.
 */
const keyFor = (userId: string) => personKey("draw.sentSeal", userId);

export function keepSentSeal(userId: string, ticketUseId: number): void {
  writeStored(
    keyFor(userId),
    String(ticketUseId),
    `Can't note that ticket use ${ticketUseId}'s seal went out; a reload before its answer reopens the sheet`,
  );
}

export function forgetSentSeal(userId: string): void {
  writeStored(
    keyFor(userId),
    null,
    "Can't clear the note of a seal that went out from this device",
  );
}

/** Whether `userId`'s seal on `ticketUseId` went out and no answer was kept since. */
export function sealWentOut(userId: string, ticketUseId: number | null): boolean {
  if (ticketUseId === null) return false;
  const { text } = readStored(
    keyFor(userId),
    "Can't tell whether a seal went out from this device",
  );
  return text === String(ticketUseId);
}

/**
 * What the server's tickets say became of `ticketUseId`'s seal: it's a sticker, or it holds none.
 * Null when it isn't one of today's ticket uses, the only ones the tickets list.
 */
export function sentSealOutcome(
  ticketUseId: number,
  tickets: Tickets,
): "sealed" | "unsealed" | null {
  const use = tickets.usedToday.find(({ id }) => id === ticketUseId);
  if (!use) return null;
  return use.sticker ? "sealed" : "unsealed";
}
