import { describe, expect, it } from "vitest";
import { DAILY_TICKETS_PER_DAY as DAILY } from "./config";
import {
  addReserve,
  current,
  dailyLeft,
  dailyTickets,
  linkSticker,
  nextKind,
  nextRefill,
  refund,
  spend,
  ticketDay,
  ticketsLeft,
  type SpentTicket,
  type TicketState,
} from "./tickets";

/** A moment in UTC; Tokyo is 9 hours ahead, so 15:00 UTC is Tokyo's midnight. */
const utc = (d: number, h: number, m = 0) => new Date(Date.UTC(2026, 8, d, h, m));

/** Spends the next ticket, which the test expects to be there. */
const spendOne = (s: TicketState): { state: TicketState; spent: SpentTicket } => {
  const kind = nextKind(s);
  const next = kind && spend(s, kind);
  if (!next) throw new Error("expected a ticket to spend");
  return next;
};

const spendMany = (s: TicketState, n: number): TicketState => {
  for (let i = 0; i < n; i++) s = spendOne(s).state;
  return s;
};

describe("tickets", () => {
  it("starts each ticket day at midnight in Tokyo, wherever the device is", () => {
    expect(ticketDay(utc(24, 14, 59))).toBe("2026-09-24");
    expect(ticketDay(utc(24, 15))).toBe("2026-09-25");
  });

  it("finds the next Tokyo midnight", () => {
    expect(nextRefill(utc(24, 14, 59))).toEqual(utc(24, 15));
    expect(nextRefill(utc(24, 15))).toEqual(utc(25, 15));
    expect(nextRefill(utc(30, 16))).toEqual(new Date(Date.UTC(2026, 9, 1, 15)));
  });

  it("spends daily tickets before reserve ones, then runs out", () => {
    let s = addReserve(current(null, utc(24, 1)), 1);
    expect(spend(s, "reserve")).toBeNull();
    s = spendMany(s, DAILY);
    expect(dailyLeft(s)).toBe(0);
    expect(spend(s, "daily")).toBeNull();
    s = spendOne(s).state;
    expect(s.reserve).toBe(0);
    expect(ticketsLeft(s)).toBe(0);
    expect(nextKind(s)).toBeNull();
  });

  it("refills daily tickets at Tokyo midnight but keeps reserve ones", () => {
    let s = spendMany(addReserve(current(null, utc(24, 10)), 3), DAILY + 1);
    expect(ticketsLeft(current(s, utc(24, 14, 59)))).toBe(2);
    s = current(s, utc(24, 15));
    expect(ticketsLeft(s)).toBe(DAILY + 2);
    expect(dailyTickets(s).some((t) => t.used)).toBe(false);
  });

  it("links a spent ticket to the sticker it became; an abandoned drawing keeps none", () => {
    const abandoned = spendOne(current(null, utc(24, 1)));
    const sealed = spendOne(abandoned.state);
    const [first, second, ...rest] = dailyTickets(
      linkSticker(sealed.state, sealed.spent, "sunset"),
    );
    expect(first).toEqual({ used: true });
    expect(second).toEqual({ used: true, stickerId: "sunset" });
    expect(rest.some((t) => t.used)).toBe(false);
  });

  it("doesn't link a ticket spent before the refill to the new day's tickets", () => {
    const { state, spent } = spendOne(current(null, utc(24, 14, 58)));
    const nextDay = spendOne(current(state, utc(24, 15, 2))).state;
    expect(linkSticker(nextDay, spent, "late")).toEqual(nextDay);
  });

  it("gives back a lost drawing's ticket, daily or reserve, but not one that became a sticker", () => {
    const daily = spendOne(current(null, utc(24, 1)));
    const dailyBack = refund(daily.state, daily.spent);
    expect(dailyBack && ticketsLeft(dailyBack)).toBe(DAILY);
    const reserve = spendOne(spendMany(addReserve(current(null, utc(24, 1)), 1), DAILY));
    const reserveBack = refund(reserve.state, reserve.spent);
    expect(reserveBack && ticketsLeft(reserveBack)).toBe(1);
    expect(refund(linkSticker(daily.state, daily.spent, "sunset"), daily.spent)).toBeNull();
  });

  it("gives nothing back for a ticket spent before the refill", () => {
    const { state, spent } = spendOne(current(null, utc(24, 14, 58)));
    expect(refund(current(state, utc(24, 15, 2)), spent)).toBeNull();
  });

  it("shows only the day's daily tickets, even after reserve ones are used", () => {
    const s = spendMany(addReserve(current(null, utc(24, 1)), 2), DAILY + 2);
    expect(dailyTickets(s)).toHaveLength(DAILY);
    expect(dailyTickets(s).every((t) => t.used)).toBe(true);
  });
});
