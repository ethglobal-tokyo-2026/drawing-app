import { FREE_TICKETS_PER_DAY, REFILL_HOUR } from "./config";

export interface TicketUse {
  /** The sticker this ticket became. Absent while its drawing is in progress, and for good when it was abandoned. */
  stickerId?: string;
}

export interface TicketState {
  /** The ticket day this state belongs to (YYYY-MM-DD, starting at REFILL_HOUR local time). */
  day: string;
  /** Tickets used on `day`, oldest first. Free tickets go first, so the first FREE_TICKETS_PER_DAY are the free ones. */
  uses: TicketUse[];
  /** Bought tickets not used yet; they don't expire at the refill. */
  paid: number;
}

/** Where a spent ticket sits, so the sticker it becomes can be linked to it at seal. */
export interface SpentTicket {
  day: string;
  index: number;
}

/** One of the day's free tickets. */
export type DailyTicket = { used: false } | { used: true; stickerId?: string };

const ymd = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Ticket days run from REFILL_HOUR to REFILL_HOUR local time, not midnight to midnight. */
export function ticketDay(now: Date): string {
  const d = new Date(now);
  // Stepping back a calendar day (not a fixed 24h) keeps DST days right.
  if (d.getHours() < REFILL_HOUR) d.setDate(d.getDate() - 1);
  return ymd(d);
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
  if (!state) return { day, uses: [], paid: 0 };
  return state.day === day ? state : { day, uses: [], paid: state.paid };
}

export function ticketsLeft(state: TicketState): number {
  return Math.max(0, FREE_TICKETS_PER_DAY - state.uses.length) + state.paid;
}

/** Uses a free ticket first, then a bought one. Null when there are none. */
export function spend(state: TicketState): { state: TicketState; spent: SpentTicket } | null {
  const free = state.uses.length < FREE_TICKETS_PER_DAY;
  if (!free && state.paid <= 0) return null;
  return {
    state: { ...state, uses: [...state.uses, {}], paid: free ? state.paid : state.paid - 1 },
    spent: { day: state.day, index: state.uses.length },
  };
}

export function addPaid(state: TicketState, n: number): TicketState {
  return { ...state, paid: state.paid + n };
}

/** Records the sticker a spent ticket became. A ticket from an earlier ticket day is gone, so nothing changes. */
export function linkSticker(
  state: TicketState,
  spent: SpentTicket,
  stickerId: string,
): TicketState {
  if (spent.day !== state.day || spent.index >= state.uses.length) return state;
  const uses = state.uses.map((u, i) => (i === spent.index ? { stickerId } : u));
  return { ...state, uses };
}

/** The day's free tickets in the order they're used. */
export function dailyTickets(state: TicketState): DailyTicket[] {
  return Array.from({ length: FREE_TICKETS_PER_DAY }, (_, i): DailyTicket => {
    const use = state.uses.at(i);
    if (!use) return { used: false };
    return use.stickerId === undefined ? { used: true } : { used: true, stickerId: use.stickerId };
  });
}
