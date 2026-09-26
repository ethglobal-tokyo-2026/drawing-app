import type { TicketKind, Tickets } from "@drawing-app/api/client";
import { i18next } from "../i18n/i18n";
import { TICKET_DAY_UTC_OFFSET_MS } from "./config";
import { formatRefillTime } from "./refill";

export type { TicketKind, Tickets };

/** One of the day's daily tickets; a used one carries the cut outline of the sticker it became. */
export type DailyTicket = { used: false } | { used: true; outline?: string };

/**
 * What the ticket art shows, the same on every surface: the tickets the next drawing can use. A zero never shows.
 * `reserve` is how many reserve tickets are held, 0 for none.
 */
export type TicketView =
  /** Daily tickets are left, so they lead: the day's stubs, and any reserve tickets as one ticket with its count. */
  | { show: "daily"; daily: number; stubs: DailyTicket[]; reserve: number }
  /** The daily tickets are used: the day's slots go, and one reserve ticket with its count takes their place. */
  | { show: "reserve"; reserve: number }
  /** Nothing left: the day's used stubs, until the refill. */
  | { show: "none"; stubs: DailyTicket[]; reserve: 0; refillAt: Date };

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

export const ticketsLeft = (t: Tickets) => t.dailyLeft + t.reserveLeft;

/** The kind the next spend takes: daily tickets first. Null when there are none. */
export function nextKind(t: Tickets): TicketKind | null {
  if (t.dailyLeft > 0) return "daily";
  return t.reserveLeft > 0 ? "reserve" : null;
}

/**
 * The day's daily tickets, fresh first, then the used ones newest first. A spend turns the last fresh stub into a used
 * one where it lies, so no stub moves.
 */
function dailyStubs(t: Tickets): DailyTicket[] {
  const used = t.usedToday
    .filter((use) => use.kind === "daily")
    .map((use): DailyTicket =>
      use.sticker ? { used: true, outline: use.sticker.outline } : { used: true },
    )
    .reverse();
  const fresh = Math.max(0, t.dailyPerDay - used.length);
  return [...Array.from({ length: fresh }, (): DailyTicket => ({ used: false })), ...used];
}

/** The one rule for the ticket art: see TicketView. */
export function ticketView(t: Tickets): TicketView {
  if (t.dailyLeft > 0) {
    return { show: "daily", daily: t.dailyLeft, stubs: dailyStubs(t), reserve: t.reserveLeft };
  }
  if (t.reserveLeft > 0) return { show: "reserve", reserve: t.reserveLeft };
  return { show: "none", stubs: dailyStubs(t), reserve: 0, refillAt: new Date(t.nextRefillAt) };
}

/**
 * The same tickets in words, for screen readers: "2 daily tickets left", "2 daily tickets and 5 reserve tickets
 * left", "5 reserve tickets left", or "no tickets until 12:00 AM".
 */
export function describeTickets(t: Tickets): string {
  const view = ticketView(t);
  if (view.show === "none") {
    return i18next.t(($) => $.tickets.summary.none, { time: formatRefillTime(view.refillAt) });
  }
  const reserve = i18next.t(($) => $.tickets.summary.reserve, { count: view.reserve });
  if (view.show === "reserve")
    return i18next.t(($) => $.tickets.summary.left, { tickets: reserve });
  const daily = i18next.t(($) => $.tickets.summary.daily, { count: view.daily });
  return view.reserve > 0
    ? i18next.t(($) => $.tickets.summary.dailyAndReserve, { daily, reserve })
    : i18next.t(($) => $.tickets.summary.left, { tickets: daily });
}
