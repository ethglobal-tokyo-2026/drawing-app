import { FREE_TICKETS_PER_DAY, REFILL_HOUR } from "./config";

export interface TicketState {
  /** The ticket day this state belongs to (YYYY-MM-DD, starting at REFILL_HOUR). */
  day: string;
  /** Free tickets used on `day`. */
  usedFree: number;
  /** Bought tickets; they don't expire at the refill. */
  paid: number;
}

/** Ticket days run from REFILL_HOUR to REFILL_HOUR, not midnight to midnight. */
export function ticketDay(now: Date): string {
  const d = new Date(now.getTime() - REFILL_HOUR * 3600_000);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextRefill(now: Date): Date {
  const r = new Date(now);
  r.setHours(REFILL_HOUR, 0, 0, 0);
  if (r <= now) r.setDate(r.getDate() + 1);
  return r;
}

/** Rolls over to a new day's free tickets when the refill time has passed. */
export function current(state: TicketState | null, now: Date): TicketState {
  const day = ticketDay(now);
  if (!state) return { day, usedFree: 0, paid: 0 };
  return state.day === day ? state : { day, usedFree: 0, paid: state.paid };
}

function freeLeft(state: TicketState): number {
  return Math.max(0, FREE_TICKETS_PER_DAY - state.usedFree);
}

export function ticketsLeft(state: TicketState): number {
  return freeLeft(state) + state.paid;
}

/** Uses a free ticket first, then a bought one. Null when there are none. */
export function consume(state: TicketState): TicketState | null {
  if (freeLeft(state) > 0) return { ...state, usedFree: state.usedFree + 1 };
  if (state.paid > 0) return { ...state, paid: state.paid - 1 };
  return null;
}

export function addPaid(state: TicketState, n: number): TicketState {
  return { ...state, paid: state.paid + n };
}
