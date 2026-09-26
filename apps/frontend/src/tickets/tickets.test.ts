import { describe, expect, it } from "vitest";
import { FREE_TICKETS_PER_DAY as FREE, REFILL_HOUR } from "./config";
import {
  addPaid,
  current,
  dailyTickets,
  linkSticker,
  nextRefill,
  refund,
  spend,
  ticketDay,
  ticketsLeft,
  type SpentTicket,
  type TicketState,
} from "./tickets";

// Local-time dates.
const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m);

/** Spends a ticket that the test expects to be there. */
const spendOne = (s: TicketState): { state: TicketState; spent: SpentTicket } => {
  const next = spend(s);
  if (!next) throw new Error("expected a ticket to spend");
  return next;
};

const spendMany = (s: TicketState, n: number): TicketState => {
  for (let i = 0; i < n; i++) s = spendOne(s).state;
  return s;
};

describe("tickets", () => {
  it("starts each ticket day at the refill hour, not midnight", () => {
    expect(ticketDay(at(24, REFILL_HOUR - 1, 59))).toBe("2026-09-23");
    expect(ticketDay(at(24, REFILL_HOUR))).toBe("2026-09-24");
  });

  it("finds the next refill time", () => {
    expect(nextRefill(at(24, 22))).toEqual(at(25, REFILL_HOUR));
    expect(nextRefill(at(24, REFILL_HOUR - 1))).toEqual(at(24, REFILL_HOUR));
    expect(nextRefill(at(24, REFILL_HOUR))).toEqual(at(25, REFILL_HOUR));
  });

  it("spends free tickets before bought ones, then runs out", () => {
    let s = spendMany(addPaid(current(null, at(24, 10)), 1), FREE);
    expect(s.paid).toBe(1);
    expect(ticketsLeft(s)).toBe(1);
    s = spendOne(s).state;
    expect(ticketsLeft(s)).toBe(0);
    expect(spend(s)).toBeNull();
  });

  it("refills free tickets at the refill hour but keeps bought ones", () => {
    let s = spendMany(addPaid(current(null, at(24, 22)), 3), FREE + 1);
    expect(ticketsLeft(current(s, at(25, REFILL_HOUR - 1)))).toBe(2);
    s = current(s, at(25, REFILL_HOUR));
    expect(ticketsLeft(s)).toBe(FREE + 2);
    expect(dailyTickets(s).some((t) => t.used)).toBe(false);
  });

  it("links a spent ticket to the sticker it became; an abandoned drawing keeps none", () => {
    const abandoned = spendOne(current(null, at(24, 10)));
    const sealed = spendOne(abandoned.state);
    const [first, second, ...rest] = dailyTickets(
      linkSticker(sealed.state, sealed.spent, "sunset"),
    );
    expect(first).toEqual({ used: true });
    expect(second).toEqual({ used: true, stickerId: "sunset" });
    expect(rest.some((t) => t.used)).toBe(false);
  });

  it("doesn't link a ticket spent before the refill to the new day's tickets", () => {
    const { state, spent } = spendOne(current(null, at(24, REFILL_HOUR - 1, 58)));
    const nextDay = spendOne(current(state, at(24, REFILL_HOUR, 2))).state;
    expect(linkSticker(nextDay, spent, "late")).toEqual(nextDay);
  });

  it("gives back a lost drawing's ticket, free or bought, but not one that became a sticker", () => {
    const free = spendOne(current(null, at(24, 10)));
    const freeBack = refund(free.state, free.spent);
    expect(freeBack && ticketsLeft(freeBack)).toBe(FREE);
    const bought = spendOne(spendMany(addPaid(current(null, at(24, 10)), 1), FREE));
    const boughtBack = refund(bought.state, bought.spent);
    expect(boughtBack && ticketsLeft(boughtBack)).toBe(1);
    expect(refund(linkSticker(free.state, free.spent, "sunset"), free.spent)).toBeNull();
  });

  it("gives nothing back for a ticket spent before the refill", () => {
    const { state, spent } = spendOne(current(null, at(24, REFILL_HOUR - 1, 58)));
    expect(refund(current(state, at(24, REFILL_HOUR, 2)), spent)).toBeNull();
  });

  it("shows only the day's free tickets, even after bought ones are used", () => {
    const s = spendMany(addPaid(current(null, at(24, 10)), 2), FREE + 2);
    expect(dailyTickets(s)).toHaveLength(FREE);
    expect(dailyTickets(s).every((t) => t.used)).toBe(true);
  });
});
