import { describe, expect, it } from "vitest";
import {
  addPaid,
  consume,
  current,
  nextRefill,
  ticketDay,
  ticketsLeft,
  type TicketState,
} from "./tickets";

// Local-time dates; REFILL_HOUR is 4.
const at = (d: number, h: number, m = 0) => new Date(2026, 8, d, h, m);

/** Spends a ticket that the test expects to be there. */
const spend = (s: TicketState): TicketState => {
  const next = consume(s);
  if (!next) throw new Error("expected a ticket to spend");
  return next;
};

describe("tickets", () => {
  it("starts each ticket day at 4:00, not midnight", () => {
    expect(ticketDay(at(24, 3, 59))).toBe("2026-09-23");
    expect(ticketDay(at(24, 4, 0))).toBe("2026-09-24");
  });

  it("gives 3 free tickets a day, then runs out", () => {
    let s = current(null, at(24, 10));
    for (let i = 0; i < 3; i++) s = spend(s);
    expect(ticketsLeft(s)).toBe(0);
    expect(consume(s)).toBeNull();
  });

  it("refills free tickets after 4:00 but keeps bought ones", () => {
    let s = current(null, at(24, 22));
    for (let i = 0; i < 3; i++) s = spend(s);
    s = addPaid(s, 3);
    s = spend(s); // uses a paid one: 2 paid left
    expect(ticketsLeft(current(s, at(25, 3)))).toBe(2);
    expect(ticketsLeft(current(s, at(25, 4)))).toBe(5);
  });

  it("uses free tickets before bought ones", () => {
    const s = spend(addPaid(current(null, at(24, 10)), 3));
    expect(s.usedFree).toBe(1);
    expect(s.paid).toBe(3);
  });

  it("finds the next refill time", () => {
    expect(nextRefill(at(24, 22)).getTime()).toBe(at(25, 4).getTime());
    expect(nextRefill(at(24, 2)).getTime()).toBe(at(24, 4).getTime());
  });
});
