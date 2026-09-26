import type { TicketKind, Tickets } from "@drawing-app/api/client";
import { i18next } from "../i18n/i18n";
import { TICKET_DAY_UTC_OFFSET_MS } from "./config";

export type { TicketKind, Tickets };

/** One of the day's daily tickets; a used one carries the cut outline of the sticker it became. */
export type DailyTicket = { used: false } | { used: true; outline?: string };

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

/** The day's daily tickets in the order they're used. */
export function dailyTickets(t: Tickets): DailyTicket[] {
  const used = t.usedToday.filter((use) => use.kind === "daily");
  return Array.from({ length: t.dailyPerDay }, (_, i): DailyTicket => {
    const use = used.at(i);
    if (!use) return { used: false };
    return use.sticker ? { used: true, outline: use.sticker.outline } : { used: true };
  });
}

/** Screen-reader text for both counts, such as "2 daily tickets and 5 reserve tickets". */
export function describeTickets(t: Tickets): string {
  return i18next.t(($) => $.tickets.summary.dailyAndReserve, {
    daily: i18next.t(($) => $.tickets.summary.daily, { count: t.dailyLeft }),
    reserve: i18next.t(($) => $.tickets.summary.reserve, { count: t.reserveLeft }),
  });
}
