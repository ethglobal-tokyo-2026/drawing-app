import { useCallback, useSyncExternalStore } from "react";
import { readTickets, subscribeTickets, writeTickets } from "./ticketStorage";
import {
  addReserve,
  current,
  dailyLeft,
  linkSticker,
  nextKind,
  nextRefill,
  refund,
  spend,
  ticketsLeft,
  type SpentTicket,
  type TicketKind,
  type TicketState,
} from "./tickets";

/**
 * Today's tickets. The midnight refill is read at render time instead of pushed by a
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

/** Adds bought reserve tickets. */
export function addReserveTickets(n: number): void {
  writeTickets(addReserve(current(readTickets(), new Date()), n));
}

export function useTickets() {
  const state = useTicketState();

  /** Spends a ticket of the kind the person agreed to; null when the next ticket isn't that kind. */
  const use = useCallback((kind: TicketKind): SpentTicket | null => {
    const next = spend(current(readTickets(), new Date()), kind);
    if (!next) return null;
    writeTickets(next.state);
    return next.spent;
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
    dailyLeft: dailyLeft(state),
    reserveLeft: state.reserve,
    nextKind: nextKind(state),
    refillAt: nextRefill(new Date()),
    use,
    linkSticker: linkToSticker,
    giveBack,
  };
}
