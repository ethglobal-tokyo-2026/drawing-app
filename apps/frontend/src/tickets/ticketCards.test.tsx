// @vitest-environment happy-dom
import type { Tickets, TicketShop as Shop } from "@drawing-app/api/client";
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { getJpycBalance, payForTickets } from "../payments/jpyc";
import { OutOfTickets } from "./OutOfTickets";
import { StartDrawing } from "./StartDrawing";
import { TicketShop } from "./TicketShop";
import { useTickets } from "./useTickets";

vi.mock("../payments/jpyc", () => ({ getJpycBalance: vi.fn(), payForTickets: vi.fn() }));
vi.mock("../identity/suiSigner", () => ({ waitForSuiSigner: () => Promise.resolve({}) }));

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

  it("keeps the key's face while the ticket is on its way: busy, not disabled", async () => {
    await render(
      <StartDrawing
        tickets={tickets(1, 0)}
        minutes={3}
        busy
        note={null}
        onStart={onStart}
        onShop={onShop}
        onBoard={onBoard}
      />,
    );
    const key = buttonNamed("Start drawing");
    expect(key?.disabled).toBe(false);
    expect(key?.getAttribute("aria-busy")).toBe("true");
    // The press skips it, so a second tap doesn't press; start() ignores the click itself.
    expect(key?.getAttribute("aria-disabled")).toBe("true");
  });

  it("drops away once the ticket is spent, then lets go", async () => {
    const onLeft = vi.fn();
    await render(
      <StartDrawing
        tickets={tickets(1, 0)}
        minutes={3}
        leaving
        onLeft={onLeft}
        note={null}
        onStart={onStart}
        onShop={onShop}
        onBoard={onBoard}
      />,
    );
    const root = document.querySelector(".out-of-tickets");
    expect(root?.classList.contains("is-leaving")).toBe(true);
    // The sheet under it takes the taps.
    expect(root?.hasAttribute("inert")).toBe(true);
    const card = document.querySelector(".out-of-tickets__card");
    act(() => {
      card?.dispatchEvent(
        new AnimationEvent("animationend", { animationName: "out-of-tickets-drop", bubbles: true }),
      );
    });
    expect(onLeft).toHaveBeenCalledOnce();
  });
});

const SUI_WALLET = `0x${"1".repeat(64)}`;
const TX_DIGEST = "D".repeat(44);
/** 1 JPYC in base units. */
const JPYC = 1_000_000n;

/** Two packs, paid in a made-up JPYC. */
const SHOP: Shop = {
  packs: [
    { tickets: 1, priceYen: 100, discountPercent: 0, priceJpyc: String(100n * JPYC) },
    { tickets: 3, priceYen: 270, discountPercent: 10, priceJpyc: String(270n * JPYC) },
  ],
  payment: {
    network: "testnet",
    coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
    decimals: 6,
    paymentPackage: `0x${"b".repeat(64)}`,
    vault: `0x${"c".repeat(64)}`,
    reference: "tickets:me",
  },
};

describe("TicketShop", () => {
  beforeEach(() => {
    setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET });
    vi.mocked(getJpycBalance).mockResolvedValue(1000n * JPYC);
    vi.mocked(payForTickets).mockResolvedValue(TX_DIGEST);
  });

  it("outlines the balance and the packs until the wallet and the shop are in", async () => {
    const api = emptyApi({
      ticketShop: () => new Promise((resolve) => setTimeout(() => resolve(SHOP), 1000)),
    });
    await render(<TicketShop layout="page" onDraw={onDraw} />, api);
    const skeletons = () => document.querySelectorAll(".skeleton").length;
    expect(skeletons()).toBeGreaterThan(1);
    expect(document.querySelector(".ticket-shop__packs [role=status]")?.textContent).toBe(
      "Getting today’s prices…",
    );
    await settle(3000);
    expect(skeletons()).toBe(0);
    expect(document.querySelector(".ticket-shop__wallet strong")?.textContent).toBe("￥1,000");
  });

  it("pays the chosen pack's JPYC from the Sui wallet, and shows the tickets the server added", async () => {
    const bought = vi.fn(() => Promise.resolve(tickets(3, 4)));
    const api = emptyApi({
      tickets: () => Promise.resolve(tickets(3, 1)),
      ticketShop: () => Promise.resolve(SHOP),
      buyTickets: bought,
    });
    await render(<TicketShop layout="card" onDraw={onDraw} onClose={onBoard} />, api);
    await settle(500);
    click("3 tickets");
    click("Pay");
    await settle(2000);
    expect(title()).toBe("3 reserve tickets added");
    expect(payForTickets).toHaveBeenCalledWith(expect.anything(), SHOP.payment, 270n * JPYC);
    expect(bought).toHaveBeenCalledWith({ tickets: 3, txDigest: TX_DIGEST });
    expect(buttonNamed("Draw")?.getAttribute("aria-label")).toContain("4 reserve tickets");
    click("Draw");
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("won't pay a pack the wallet's JPYC can't cover", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(150n * JPYC);
    await render(
      <TicketShop layout="page" onDraw={onDraw} />,
      emptyApi({ ticketShop: () => Promise.resolve(SHOP) }),
    );
    await settle(500);
    click("3 tickets");
    expect(buttonNamed("Not enough JPYC")?.disabled).toBe(true);
    expect(payForTickets).not.toHaveBeenCalled();
  });

  it("names the payment that went through when the server didn't add its tickets", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const api = emptyApi({
      ticketShop: () => Promise.resolve(SHOP),
      buyTickets: () => Promise.reject(new Error("sui_unavailable")),
    });
    await render(<TicketShop layout="page" onDraw={onDraw} />, api);
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    expect(document.querySelector("[role=alert]")?.textContent).toContain(TX_DIGEST);
  });
});
