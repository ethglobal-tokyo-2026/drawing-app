import { DAILY_TICKETS_PER_DAY, TICKET_DAY_UTC_OFFSET_MS } from "./config";

export type TicketKind = "daily" | "reserve";

export interface TicketUse {
  /** The sticker this ticket became. Absent while its drawing is in progress, and for good when it was abandoned. */
  stickerId?: string;
}

export interface TicketState {
  /** The ticket day this state belongs to (YYYY-MM-DD, Tokyo time). */
  day: string;
  /** Tickets used on `day`, oldest first. Daily tickets go first, so the first DAILY_TICKETS_PER_DAY are the daily ones. */
  uses: TicketUse[];
  /** Reserve tickets not used yet; they don't expire at the refill. */
  reserve: number;
}

/** Where a spent ticket sits, so the sticker it becomes can be linked to it at seal. */
export interface SpentTicket {
  day: string;
  index: number;
}

/** One of the day's daily tickets. */
export type DailyTicket = { used: false } | { used: true; stickerId?: string };

/** The Tokyo calendar date `now` falls on. */
export function ticketDay(now: Date): string {
  return new Date(now.getTime() + TICKET_DAY_UTC_OFFSET_MS).toISOString().slice(0, 10);
}

/** The next midnight in Tokyo. */
export function nextRefill(now: Date): Date {
  const tokyo = new Date(now.getTime() + TICKET_DAY_UTC_OFFSET_MS);
  const midnight = Date.UTC(tokyo.getUTCFullYear(), tokyo.getUTCMonth(), tokyo.getUTCDate() + 1);
  return new Date(midnight - TICKET_DAY_UTC_OFFSET_MS);
}

/** Rolls over to a new day's daily tickets when the refill time has passed. */
export function current(state: TicketState | null, now: Date): TicketState {
  const day = ticketDay(now);
  if (!state) return { day, uses: [], reserve: 0 };
  return state.day === day ? state : { day, uses: [], reserve: state.reserve };
}

export const dailyLeft = (state: TicketState) =>
  Math.max(0, DAILY_TICKETS_PER_DAY - state.uses.length);

export const ticketsLeft = (state: TicketState) => dailyLeft(state) + state.reserve;

/** The kind the next spend takes: daily tickets first. Null when there are none. */
export function nextKind(state: TicketState): TicketKind | null {
  if (dailyLeft(state) > 0) return "daily";
  return state.reserve > 0 ? "reserve" : null;
}

/**
 * Spends the next ticket, only if it's the kind the person agreed to, so a daily ticket going
 * unnoticed never turns into a reserve one. Null otherwise.
 */
export function spend(
  state: TicketState,
  kind: TicketKind,
): { state: TicketState; spent: SpentTicket } | null {
  if (nextKind(state) !== kind) return null;
  return {
    state: {
      ...state,
      uses: [...state.uses, {}],
      reserve: kind === "reserve" ? state.reserve - 1 : state.reserve,
    },
    spent: { day: state.day, index: state.uses.length },
  };
}

export function addReserve(state: TicketState, n: number): TicketState {
  return { ...state, reserve: state.reserve + n };
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

/**
 * Gives back a spent ticket whose drawing was lost. Null when there's nothing to give back: the
 * ticket became a sticker, or it was spent on an earlier ticket day.
 */
export function refund(state: TicketState, spent: SpentTicket): TicketState | null {
  const use = spent.day === state.day ? state.uses.at(spent.index) : undefined;
  if (!use || use.stickerId !== undefined) return null;
  // Uses past the daily ones are reserve. While there are any, taking a use out leaves the daily ones
  // all used, so the ticket comes back as a reserve one.
  const reserveBack = state.uses.length > DAILY_TICKETS_PER_DAY ? 1 : 0;
  return {
    ...state,
    uses: state.uses.filter((_, i) => i !== spent.index),
    reserve: state.reserve + reserveBack,
  };
}

/** The day's daily tickets in the order they're used. */
export function dailyTickets(state: TicketState): DailyTicket[] {
  return Array.from({ length: DAILY_TICKETS_PER_DAY }, (_, i): DailyTicket => {
    const use = state.uses.at(i);
    if (!use) return { used: false };
    return use.stickerId === undefined ? { used: true } : { used: true, stickerId: use.stickerId };
  });
}

/** Screen-reader text for both counts, such as "2 daily tickets and 5 reserve tickets". */
export function describeTickets(state: TicketState): string {
  const n = (count: number, kind: TicketKind) =>
    `${count} ${kind} ${count === 1 ? "ticket" : "tickets"}`;
  return `${n(dailyLeft(state), "daily")} and ${n(state.reserve, "reserve")}`;
}
