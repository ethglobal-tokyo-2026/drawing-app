import { useCallback, useSyncExternalStore } from "react";
import { readTickets, subscribeTickets, writeTickets } from "./ticketStorage";
import {
  addPaid,
  current,
  linkSticker,
  nextRefill,
  refund,
  spend,
  ticketsLeft,
  type SpentTicket,
  type TicketState,
} from "./tickets";

/**
 * Today's tickets. The 4:00 refill is read at render time instead of pushed by a
 * timer, so an open out-of-tickets card can turn over in place; everything else
 * sees the new tickets on its next render.
 */
export function useTicketState(): TicketState {
  return current(useSyncExternalStore(subscribeTickets, readTickets), new Date());
}

/** Saves the ticket day as of now, so every reader, the card's host included, sees a refill the card has shown. */
export function pickUpRefill(): void {
  writeTickets(current(readTickets(), new Date()));
}

export function useTickets() {
  const state = useTicketState();

  /** Spends a ticket; null when there are none left. */
  const use = useCallback((): SpentTicket | null => {
    const next = spend(current(readTickets(), new Date()));
    if (!next) return null;
    writeTickets(next.state);
    return next.spent;
  }, []);

  const add = useCallback((n: number) => {
    writeTickets(addPaid(current(readTickets(), new Date()), n));
  }, []);

  /** Records the sticker a spent ticket became. */
  const linkToSticker = useCallback((spent: SpentTicket, stickerId: string) => {
    writeTickets(linkSticker(current(readTickets(), new Date()), spent, stickerId));
  }, []);

  /** Gives back a spent ticket whose drawing was lost; false when there was nothing to give back. */
  const giveBack = useCallback((spent: SpentTicket): boolean => {
    const next = refund(current(readTickets(), new Date()), spent);
    if (next) writeTickets(next);
    return next !== null;
  }, []);

  return {
    left: ticketsLeft(state),
    refillAt: nextRefill(new Date()),
    use,
    add,
    linkSticker: linkToSticker,
    giveBack,
  };
}
