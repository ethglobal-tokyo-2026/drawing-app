// @vitest-environment happy-dom
import type { Tickets } from "@drawing-app/api/client";
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { OutOfTickets } from "./OutOfTickets";
import { StartDrawing } from "./StartDrawing";
import { TicketShop } from "./TicketShop";
import { useTickets } from "./useTickets";

const onBoard = vi.fn();
const onShop = vi.fn();
const onStart = vi.fn();
const onDraw = vi.fn();

const EVENING = new Date(Date.UTC(2026, 8, 25, 12, 4));
/** Tokyo's next midnight after EVENING. */
const REFILL = new Date(Date.UTC(2026, 8, 25, 15));

/** Tickets with `dailyUsed` of the day's daily tickets used and `reserve` held. */
const tickets = (dailyUsed: number, reserve: number): Tickets => ({
  ...FRESH_TICKETS,
  dailyLeft: FRESH_TICKETS.dailyPerDay - dailyUsed,
  reserveLeft: reserve,
  nextRefillAt: REFILL.toISOString(),
  usedToday: Array.from({ length: dailyUsed }, (_, i) => ({
    id: i + 1,
    dayIndex: i,
    kind: "daily" as const,
    sticker: null,
  })),
});

/** Hosts the out-of-tickets card the way the drawing screen does: up while there are no tickets. */
function Host() {
  const { tickets: loaded } = useTickets();
  const [open, setOpen] = useState(true);
  if (!loaded) return <p>loading</p>;
  if (!open) return <p>canvas</p>;
  return (
    <OutOfTickets
      tickets={loaded}
      onShop={onShop}
      onStartDrawing={() => setOpen(false)}
      onBoard={onBoard}
    />
  );
}

let view: ReturnType<typeof renderWithApi> | undefined;
const render = async (ui: React.ReactNode, api = emptyApi()) => {
  view = renderWithApi(ui, api);
  await settle(0);
};
const title = () => document.querySelector("h2")?.textContent;
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(name));
const click = (name: string) => act(() => buttonNamed(name)?.click());
/** Lets the mock wallet and the API answer. */
const settle = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
/** A server whose tickets are `now`, until a test changes them. */
const serving = (now: Tickets) => {
  const server = { tickets: now };
  return { server, api: emptyApi({ tickets: () => Promise.resolve(server.tickets) }) };
};

beforeEach(() => {
  vi.useFakeTimers({ now: EVENING });
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("OutOfTickets", () => {
  it("stays open through the refill, turns over in place, and its Draw key closes it", async () => {
    const { server, api } = serving(tickets(3, 0));
    await render(<Host />, api);
    expect(title()).toBe("Out of tickets for today");

    const nextDay = new Date(REFILL.getTime() + 86_400_000).toISOString();
    server.tickets = { ...tickets(0, 0), nextRefillAt: nextDay };
    await settle(REFILL.getTime() - EVENING.getTime() + 1_000);
    expect(title()).toBe("New tickets are here");
    click("Draw");
    expect(document.body.textContent).toContain("canvas");
  });

  it("takes the sticker-board exit on Escape, and offers the ticket shop", async () => {
    await render(<Host />, serving(tickets(3, 0)).api);
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
  const start = (state: Tickets) =>
    render(
      <StartDrawing
        tickets={state}
        minutes={3}
        note={null}
        onStart={onStart}
        onShop={onShop}
        onBoard={onBoard}
      />,
    );

  it("spends a daily ticket while there are any", async () => {
    await start(tickets(1, 4));
    click("Start drawing");
    expect(onStart).toHaveBeenCalledWith("daily");
  });

  it("asks before spending a reserve ticket once the daily ones are gone", async () => {
    await start(tickets(3, 4));
    expect(title()).toBe("Use a reserve ticket?");
    click("Use a reserve ticket");
    expect(onStart).toHaveBeenCalledWith("reserve");
  });
});

describe("TicketShop", () => {
  it("buys the chosen pack with SUI at the quote, and shows the tickets the server added", async () => {
    const bought = vi.fn(() => Promise.resolve(tickets(3, 4)));
    const api = emptyApi({
      tickets: () => Promise.resolve(tickets(3, 1)),
      ticketQuote: () =>
        Promise.resolve({
          suiYen: "300",
          quotedAt: EVENING.toISOString(),
          expiresAt: new Date(EVENING.getTime() + 60_000).toISOString(),
          packs: [
            { tickets: 1, priceYen: 100, discountPercent: 0, priceMist: "333333334" },
            { tickets: 3, priceYen: 270, discountPercent: 10, priceMist: "900000000" },
          ],
        }),
      buyTickets: bought,
    });
    await render(<TicketShop layout="card" onDraw={onDraw} onClose={onBoard} />, api);
    await settle(500);
    click("3 tickets");
    click("Pay");
    await settle(2000);
    expect(title()).toBe("3 reserve tickets added");
    expect(bought).toHaveBeenCalledWith(
      expect.objectContaining({ tickets: 3, paidMist: "900000000" }),
    );
    expect(buttonNamed("Draw")?.getAttribute("aria-label")).toContain("4 reserve tickets");
    click("Draw");
    expect(onDraw).toHaveBeenCalledOnce();
  });
});
