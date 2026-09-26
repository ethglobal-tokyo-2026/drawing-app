// @vitest-environment happy-dom
import type { Tickets } from "@drawing-app/api/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { FRESH_TICKETS, renderWithApi } from "../api/testing";
import { DrawKeyTickets } from "./DrawKeyTickets";
import { formatRefillTime } from "./refill";

const REFILL = new Date(Date.UTC(2026, 8, 26, 15));

/** Tickets with `daily` daily tickets and `reserve` reserve tickets left. */
const tickets = (daily: number, reserve: number): Tickets => ({
  ...FRESH_TICKETS,
  dailyLeft: daily,
  reserveLeft: reserve,
  nextRefillAt: REFILL.toISOString(),
  usedToday: Array.from({ length: 3 - daily }, (_, i) => ({
    id: i + 1,
    dayIndex: i,
    kind: "daily" as const,
    sticker: null,
  })),
});

let view: ReturnType<typeof renderWithApi> | undefined;
/** Opens the board's key on `state`, as a return to the board does. */
const open = (state: Tickets) => {
  view?.unmount();
  view = renderWithApi(<DrawKeyTickets tickets={state} />);
};
/** The tickets change while the key is up. */
const change = (state: Tickets) => view?.rerender(<DrawKeyTickets tickets={state} />);
/** Each ticket, back to front, as its kind and print. */
const shown = () =>
  [...document.querySelectorAll(".draw-key-ticket")].map((ticket) => {
    const kind = ["daily", "reserve", "backing"].find((k) =>
      ticket.classList.contains(`draw-key-ticket--${k}`),
    );
    return `${kind} ${ticket.querySelector(".draw-key-ticket__print")?.textContent}`;
  });
const popping = () => document.querySelectorAll(".reserve-star__body.is-popping").length;

beforeEach(() => {
  // happy-dom lays nothing out; each ticket's paper is drawn to its print's width.
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(48);
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.restoreAllMocks();
});

describe("DrawKeyTickets", () => {
  // First: the key remembers, for the whole app open, where it last showed a reserve ticket.
  it("pops the reserve ticket's star when it first shows or comes to the front, not on every return", () => {
    open(tickets(2, 0));
    expect(popping()).toBe(0);
    // Bought: the reserve ticket shows behind the daily one.
    change(tickets(2, 5));
    expect(popping()).toBe(1);
    // Back on the board with nothing changed.
    open(tickets(2, 5));
    expect(popping()).toBe(0);
    // The daily tickets are used, so the reserve ticket comes to the front.
    change(tickets(0, 5));
    expect(popping()).toBe(1);
    open(tickets(0, 4));
    expect(popping()).toBe(0);
  });

  it("shows the tickets the next drawing can use, and never a zero", () => {
    open(tickets(3, 0));
    expect(shown()).toEqual(["daily ×3"]);
    open(tickets(1, 12));
    expect(shown()).toEqual(["reserve ×12", "daily ×1"]);
    open(tickets(0, 5));
    expect(shown()).toEqual(["reserve ×5"]);
    open(tickets(0, 0));
    expect(shown()).toEqual([`backing ${formatRefillTime(REFILL)}`]);
  });

  it("is paper behind the key: hidden from screen readers, and never a control", () => {
    open(tickets(2, 5));
    const slot = document.querySelector(".draw-key-tickets");
    expect(slot?.getAttribute("aria-hidden")).toBe("true");
    expect(slot?.querySelector("button, a, [tabindex]")).toBeNull();
  });
});
