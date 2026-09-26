import { useCallback, useRef, useSyncExternalStore } from "react";
import { readTickets, subscribeTickets, writeTickets } from "./ticketStorage";
import {
  addPaid,
  current,
  linkSticker,
  nextRefill,
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
  const spent = useRef<SpentTicket | null>(null);

  /** Spends a ticket; false when there are none left. */
  const use = useCallback((): boolean => {
    const next = spend(current(readTickets(), new Date()));
    if (!next) return false;
    writeTickets(next.state);
    spent.current = next.spent;
    return true;
  }, []);

  const add = useCallback((n: number) => {
    writeTickets(addPaid(current(readTickets(), new Date()), n));
  }, []);

  /** Records the sticker that the last spent ticket became. */
  const linkToSticker = useCallback((stickerId: string) => {
    if (!spent.current) return;
    writeTickets(linkSticker(current(readTickets(), new Date()), spent.current, stickerId));
    spent.current = null;
  }, []);

  return {
    left: ticketsLeft(state),
    refillAt: nextRefill(new Date()),
    use,
    add,
    linkSticker: linkToSticker,
  };
}
