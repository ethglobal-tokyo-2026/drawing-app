// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { REFILL_HOUR } from "./config";
import { OutOfTickets } from "./OutOfTickets";
import { ticketDay } from "./tickets";
import { useTickets } from "./useTickets";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const onBoard = vi.fn();

/** Hosts the card the way the drawing screen does: up while there are no tickets, or held after a purchase. */
function Host() {
  const tickets = useTickets();
  const [hold, setHold] = useState(false);
  if (tickets.left > 0 && !hold) return <p>canvas</p>;
  return (
    <OutOfTickets
      refillAt={tickets.refillAt}
      onTicketsBought={(n) => {
        setHold(true);
        tickets.add(n);
      }}
      onStartDrawing={() => setHold(false)}
      onBoard={onBoard}
    />
  );
}

let host: HTMLDivElement;
let root: Root;

/** Opens the card at `now`, with the day's free tickets all used. */
function openAt(now: Date) {
  vi.setSystemTime(now);
  const used = { day: ticketDay(now), uses: [{}, {}, {}], paid: 0 };
  localStorage.setItem("draw.tickets", JSON.stringify(used));
  act(() => root.render(<Host />));
}

const title = () => document.querySelector("h2")?.textContent;
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent === name);

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  localStorage.clear();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("OutOfTickets", () => {
  it("stays open through the refill, turns over in place, and its Draw key closes it", () => {
    openAt(new Date(2026, 8, 26, REFILL_HOUR - 1, 59, 30));
    expect(title()).toBe("Out of tickets for today");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(title()).toBe("New tickets are here");
    act(() => buttonNamed("Draw")?.click());
    expect(host.textContent).toBe("canvas");
  });

  it("takes the sticker-board exit on Escape", () => {
    openAt(new Date(2026, 8, 25, 21, 4));
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onBoard).toHaveBeenCalledOnce();
  });
});
