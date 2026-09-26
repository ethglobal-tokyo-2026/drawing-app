// @vitest-environment happy-dom
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DAILY_TICKETS_PER_DAY } from "./config";
import { OutOfTickets } from "./OutOfTickets";
import { StartDrawing } from "./StartDrawing";
import { readTickets } from "./ticketStorage";
import { nextRefill, ticketDay } from "./tickets";
import { TicketShop } from "./TicketShop";
import { useTickets } from "./useTickets";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const onBoard = vi.fn();
const onShop = vi.fn();
const onStart = vi.fn();
const onDraw = vi.fn();

/** Hosts the out-of-tickets card the way the drawing screen does: up while there are no tickets. */
function Host() {
  const tickets = useTickets();
  const [open, setOpen] = useState(tickets.left === 0);
  if (!open) return <p>canvas</p>;
  return (
    <OutOfTickets
      refillAt={tickets.refillAt}
      onShop={onShop}
      onStartDrawing={() => setOpen(false)}
      onBoard={onBoard}
    />
  );
}

let host: HTMLDivElement;
let root: Root;

/** Stores tickets at `now`, with `dailyUsed` of the day's daily tickets used and `reserve` held. */
function haveTickets(now: Date, dailyUsed: number, reserve: number) {
  vi.setSystemTime(now);
  const uses = Array.from({ length: dailyUsed }, () => ({}));
  localStorage.setItem("draw.tickets", JSON.stringify({ day: ticketDay(now), uses, reserve }));
}

const render = (ui: React.ReactNode) => act(() => root.render(ui));
const title = () => document.querySelector("h2")?.textContent;
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(name));
const click = (name: string) => act(() => buttonNamed(name)?.click());
/** Lets the mock wallet and API answer. */
const settle = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const storedReserve = () => readTickets()?.reserve;

const EVENING = new Date(Date.UTC(2026, 8, 25, 12, 4));

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
    const refill = nextRefill(EVENING);
    haveTickets(new Date(refill.getTime() - 30_000), DAILY_TICKETS_PER_DAY, 0);
    render(<Host />);
    expect(title()).toBe("Out of tickets for today");
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(title()).toBe("New tickets are here");
    click("Draw");
    expect(host.textContent).toBe("canvas");
  });

  it("takes the sticker-board exit on Escape, and offers the ticket shop", () => {
    haveTickets(EVENING, DAILY_TICKETS_PER_DAY, 0);
    render(<Host />);
    click("Shop for tickets");
    expect(onShop).toHaveBeenCalledOnce();
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onBoard).toHaveBeenCalledOnce();
  });
});

describe("StartDrawing", () => {
  const start = () =>
    render(
      <StartDrawing minutes={3} note={null} onStart={onStart} onShop={onShop} onBoard={onBoard} />,
    );

  it("spends a daily ticket while there are any", () => {
    haveTickets(EVENING, 1, 4);
    start();
    click("Start drawing");
    expect(onStart).toHaveBeenCalledWith("daily");
  });

  it("asks before spending a reserve ticket once the daily ones are gone", () => {
    haveTickets(EVENING, DAILY_TICKETS_PER_DAY, 4);
    start();
    expect(title()).toBe("Use a reserve ticket?");
    click("Use a reserve ticket");
    expect(onStart).toHaveBeenCalledWith("reserve");
  });
});

describe("TicketShop", () => {
  it("buys the chosen pack with SUI and adds it to the reserve tickets", async () => {
    haveTickets(EVENING, DAILY_TICKETS_PER_DAY, 1);
    render(<TicketShop layout="card" onDraw={onDraw} onClose={onBoard} />);
    await settle(500);
    click("3 tickets");
    click("Pay");
    await settle(2000);
    expect(title()).toBe("3 reserve tickets added");
    expect(storedReserve()).toBe(4);
    click("Draw");
    expect(onDraw).toHaveBeenCalledOnce();
  });
});
