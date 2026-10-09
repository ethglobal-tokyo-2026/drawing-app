// @vitest-environment happy-dom
import {
  KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
  type StartedTicketPurchase,
  type StartPurchase,
  type Tickets,
  type TicketShop as Shop,
} from "@drawing-app/api/client";
import { act, useState, type ComponentProps } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { signSponsored } from "../identity/suiSigner";
import { getJpycBalance, getTicketPayments } from "../payments/jpyc";
import { OutOfTickets } from "./OutOfTickets";
import { formatRefillTime } from "./refill";
import { ReserveTicketCheckout } from "./ReserveTicketCheckout";
import { StartDrawing } from "./StartDrawing";
import { useTickets } from "./useTickets";

vi.mock("../payments/jpyc", () => ({
  getJpycBalance: vi.fn(),
  getTicketPayments: vi.fn(),
}));
vi.mock("../identity/suiSigner", () => ({
  waitForSuiSigner: () => Promise.resolve({}),
  signSponsored: vi.fn(),
}));

const onBoard = vi.fn();
const onShop = vi.fn();
const onStart = vi.fn();
const onDraw = vi.fn();

const EVENING = new Date(Date.UTC(2026, 8, 25, 12, 4));
/** Tokyo's next midnight after EVENING. */
const REFILL = new Date(Date.UTC(2026, 8, 25, 15));

/** Tickets with `dailyUsed` of the day's `dailyPerDay` daily tickets used and `reserve` held. */
const tickets = (
  dailyUsed: number,
  reserve: number,
  dailyPerDay = FRESH_TICKETS.dailyPerDay,
): Tickets => ({
  ...FRESH_TICKETS,
  dailyPerDay,
  dailyLeft: dailyPerDay - dailyUsed,
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

  it("takes the sticker-board exit on Escape, and offers reserve tickets", async () => {
    await render(<Host />, serving(tickets(3, 0)).api);
    // The day's three used stubs, and no reserve count at zero.
    expect(document.querySelectorAll(".ticket-stub.is-used")).toHaveLength(3);
    expect(document.querySelector(".ticket-stub--reserve")).toBeNull();
    expect(document.body.textContent).not.toContain("×0");
    click("Buy reserve tickets");
    expect(onShop).toHaveBeenCalledOnce();
    act(() => {
      document.activeElement?.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
      );
    });
    expect(onBoard).toHaveBeenCalledOnce();
  });

  describe("lays out the day's stubs", () => {
    const card = (state: Tickets) => (
      <OutOfTickets tickets={state} onShop={onShop} onStartDrawing={onDraw} onBoard={onBoard} />
    );
    const art = () => document.querySelector(".out-of-tickets__art");

    it("in rows of five, at a size the card holds, on a day of Kyoto Seika Practice Mode's daily tickets", async () => {
      await render(card(tickets(6, 0, KYOTO_SEIKA_DAILY_TICKETS_PER_DAY)));
      expect(art()?.matches(".ticket-stubs--rows.ticket-stubs--medium")).toBe(true);
      expect(art()?.querySelectorAll(".ticket-stub")).toHaveLength(
        KYOTO_SEIKA_DAILY_TICKETS_PER_DAY,
      );
    });

    it("large, in one row, on a day of the standard daily tickets", async () => {
      await render(card(tickets(FRESH_TICKETS.dailyPerDay, 0)));
      expect(art()?.matches(".ticket-stubs--large:not(.ticket-stubs--rows)")).toBe(true);
    });
  });
});

describe("StartDrawing", () => {
  const card = (state: Tickets, props: Partial<ComponentProps<typeof StartDrawing>> = {}) => (
    <StartDrawing
      tickets={state}
      minutes={3}
      failure={null}
      onStart={onStart}
      onShop={onShop}
      onBoard={onBoard}
      {...props}
    />
  );
  const start = (state: Tickets, props: Partial<ComponentProps<typeof StartDrawing>> = {}) =>
    render(card(state, props));
  const REASON = "Your tickets changed. Try again.";
  /** The text of what the dialog says it's described by, for screen readers. */
  const described = () => {
    const ids = document.querySelector("[role=dialog]")?.getAttribute("aria-describedby") ?? "";
    return ids.split(" ").map((id) => document.getElementById(id)?.textContent);
  };

  it("spends a daily ticket while there are any", async () => {
    await start(tickets(1, 4));
    // The daily stubs lead, fresh first; the reserve tickets are one small ticket and its count.
    const stubs = [...document.querySelectorAll(".ticket-stubs--large .ticket-stub")];
    expect(stubs.map((s) => s.classList.contains("is-fresh"))).toEqual([true, true, false]);
    expect(document.querySelector(".out-of-tickets__reserve")?.textContent).toContain("×4");
    click("Start drawing");
    expect(onStart).toHaveBeenCalledWith("daily");
  });

  it("shows no reserve count while there are no reserve tickets", async () => {
    await start(tickets(0, 0));
    expect(document.querySelector(".out-of-tickets__reserve")).toBeNull();
    expect(document.body.textContent).not.toContain("×0");
  });

  it("asks before spending a reserve ticket once the daily ones are gone, with that ticket as its art", async () => {
    await start(tickets(3, 4));
    expect(title()).toBe("Use a reserve ticket?");
    // One large reserve ticket with its count on a badge, in the daily slots' place.
    expect(document.querySelectorAll(".ticket-stub")).toHaveLength(1);
    expect(document.querySelector(".ticket-stubs--hero .ticket-stub--reserve")).not.toBeNull();
    expect(document.querySelector(".ticket-stub__badge")?.textContent).toBe("×4");
    // The line says each fact once; the count is on the badge, and in words for screen readers.
    expect(document.querySelector(".out-of-tickets__line")?.textContent).toBe(
      `Today’s daily tickets are used. New ones at ${formatRefillTime(REFILL)}.`,
    );
    expect(described()).toContain("You have 4 reserve tickets.");
    expect(buttonNamed("Use a reserve ticket")?.classList.contains("key--blue")).toBe(true);
    click("Use a reserve ticket");
    expect(onStart).toHaveBeenCalledWith("reserve");
    click("Buy reserve tickets");
    expect(onShop).toHaveBeenCalledOnce();
  });

  it("stops asking when a spend failed: it says so and why, and its key tries again", async () => {
    await start(tickets(1, 4), { failure: REASON });
    expect(title()).toBe("Couldn’t start your sticker");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(REASON);
    // The daily count and timer lines belong to the ask, so the reason is the card's one line.
    expect(document.querySelector(".out-of-tickets__line")).toBeNull();
    expect(described()).toContain(REASON);
    click("Start drawing");
    expect(onStart).toHaveBeenCalledWith("daily");
  });

  it("tries a reserve ticket again from the failed card, still saying how many there are", async () => {
    await start(tickets(3, 4), { failure: REASON });
    expect(title()).toBe("Couldn’t start your sticker");
    expect(described()).toEqual(expect.arrayContaining([REASON, "You have 4 reserve tickets."]));
    click("Use a reserve ticket");
    expect(onStart).toHaveBeenCalledWith("reserve");
  });

  it("keeps saying why while the retry is on its way and as the card drops away", async () => {
    await start(tickets(1, 0), { failure: REASON });
    // A retry clears the failure, and the card must not flip back to asking under the finger.
    view?.rerender(card(tickets(1, 0), { busy: true }));
    expect(title()).toBe("Couldn’t start your sticker");
    view?.rerender(card(tickets(1, 0), { leaving: true }));
    expect(title()).toBe("Couldn’t start your sticker");
  });

  it("asks, and never says it failed, while no spend has", async () => {
    await start(tickets(1, 0), { busy: true });
    expect(title()).toBe("Use a ticket to draw?");
    expect(document.querySelector("[role=alert]")).toBeNull();
  });

  it("keeps the key's face while the ticket is on its way: busy, not disabled", async () => {
    await start(tickets(1, 0), { busy: true });
    const key = buttonNamed("Start drawing");
    expect(key?.disabled).toBe(false);
    expect(key?.getAttribute("aria-busy")).toBe("true");
    // The press skips it, so a second tap doesn't press; start() ignores the click itself.
    expect(key?.getAttribute("aria-disabled")).toBe("true");
  });

  it("drops away once the ticket is spent, then lets go", async () => {
    const onLeft = vi.fn();
    await start(tickets(1, 0), { leaving: true, onLeft });
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
  },
};

/** The purchase the server starts for a pack of `tickets`, priced as SHOP prices it. */
const purchaseFor = (tickets: number): StartedTicketPurchase => {
  const pack = SHOP.packs.find((p) => p.tickets === tickets);
  if (!pack) throw new Error(`SHOP has no pack of ${tickets}`);
  const id = 40 + tickets;
  return {
    id,
    tickets,
    priceYen: pack.priceYen,
  };
};

/** The payment the server builds for a purchase, which the wallet signs. */
const PAYMENT = { txBytes: "AAAA", digest: TX_DIGEST, expiresAt: "2026-09-25T13:04:00.000Z" };
const SIGNATURE = "c2lnbmVk";
/** The signed payment the checkout sends for a pack of `tickets`. */
const paidFor = (tickets: number) => ({
  purchaseId: purchaseFor(tickets).id,
  digest: TX_DIGEST,
  signature: SIGNATURE,
});

/** An API serving SHOP that starts each purchase as purchaseFor does, but for `overrides`. */
const checkoutApi = (overrides: Partial<ApiClient> = {}) =>
  emptyApi({
    ticketShop: () => Promise.resolve(SHOP),
    startTicketPurchase: ({ tickets }) =>
      Promise.resolve({ purchase: purchaseFor(tickets), payment: PAYMENT }),
    ...overrides,
  });

/** SHOP as a new person sees it: the pack of 3 is their free first pack. */
const FREE_SHOP: Shop = {
  ...SHOP,
  packs: SHOP.packs.map((p) =>
    p.tickets === 3 ? { ...p, priceYen: 0, discountPercent: 100, priceJpyc: "0" } : p,
  ),
};

describe("ReserveTicketCheckout", () => {
  const checkout = () => <ReserveTicketCheckout onDraw={onDraw} onClose={onBoard} />;
  /** Renders the checkout over `api`, with its packs and balance in. */
  const open = async (api = checkoutApi()) => {
    await render(checkout(), api);
    await settle(500);
  };

  beforeEach(() => {
    localStorage.clear();
    setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET });
    vi.mocked(getJpycBalance).mockResolvedValue(1000n * JPYC);
    vi.mocked(signSponsored).mockResolvedValue({ digest: TX_DIGEST, signature: SIGNATURE });
  });

  it("starts a purchase of the chosen pack, signs the payment the server built, and shows the tickets the server added", async () => {
    const steps: string[] = [];
    const started = vi.fn(({ tickets: count }: StartPurchase) => {
      steps.push("start");
      return Promise.resolve({ purchase: purchaseFor(count), payment: PAYMENT });
    });
    vi.mocked(signSponsored).mockImplementation(() => {
      steps.push("sign");
      return Promise.resolve({ digest: TX_DIGEST, signature: SIGNATURE });
    });
    const bought = vi.fn(() => Promise.resolve(tickets(3, 4)));
    await open(
      checkoutApi({
        tickets: () => Promise.resolve(tickets(3, 1)),
        startTicketPurchase: started,
        buyTickets: bought,
      }),
    );
    click("3 tickets");
    click("Pay");
    await settle(2000);
    expect(title()).toBe("3 reserve tickets added");
    // One reserve ticket, its badge on the new total.
    expect(document.querySelectorAll(".ticket-stub")).toHaveLength(1);
    expect(document.querySelector(".ticket-stub__badge")?.textContent).toBe("×4");
    expect(steps).toEqual(["start", "sign"]);
    expect(started).toHaveBeenCalledExactlyOnceWith({
      tickets: 3,
      priceYen: purchaseFor(3).priceYen,
    });
    expect(signSponsored).toHaveBeenCalledExactlyOnceWith(PAYMENT);
    expect(bought).toHaveBeenCalledExactlyOnceWith(paidFor(3));
    expect(buttonNamed("Draw")?.getAttribute("aria-label")).toContain("4 reserve tickets");
    click("Draw");
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("shows the free first pack as Free with no discount, gives it with no JPYC and nothing to sign, then shows its price", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(0n);
    const shops = [FREE_SHOP, SHOP];
    const started = vi.fn<ApiClient["startTicketPurchase"]>(() =>
      Promise.resolve({
        purchase: { ...purchaseFor(3), priceYen: 0 },
        payment: null,
        tickets: tickets(3, 3),
      }),
    );
    await open(
      checkoutApi({
        ticketShop: () => Promise.resolve(shops.shift() ?? SHOP),
        startTicketPurchase: started,
      }),
    );
    const priceOf = (name: string) =>
      [...document.querySelectorAll("[role=radio]")]
        .find((pack) => pack.textContent?.includes(name))
        ?.querySelector(".reserve-checkout__price")?.textContent;
    expect(priceOf("3 tickets")).toBe("Free");
    click("3 tickets");
    click("Get it free");
    await settle(500);
    expect(title()).toBe("3 reserve tickets added");
    expect(document.querySelector(".ticket-stub__badge")?.textContent).toBe("×3");
    expect(document.body.textContent).not.toContain("Paid");
    expect(started).toHaveBeenCalledExactlyOnceWith({ tickets: 3, priceYen: 0 });
    expect(signSponsored).not.toHaveBeenCalled();
    click("Buy more tickets");
    expect(priceOf("3 tickets")).toContain("¥270");
  });

  it("says so when the free first pack was already had, and shows the packs' prices now", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const shops = [FREE_SHOP, SHOP];
    await open(
      checkoutApi({
        ticketShop: () => Promise.resolve(shops.shift() ?? SHOP),
        startTicketPurchase: () =>
          Promise.reject(new ApiError(409, { error: "free_pack_used", detail: "had it" })),
      }),
    );
    click("3 tickets");
    click("Get it free");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "You’ve already had your free pack.",
    );
    click("Back to the packs");
    expect(buttonNamed("Pay ¥270")).toBeDefined();
  });

  it("says nothing was paid when the purchase can't be started, and signs nothing", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await open(
      checkoutApi({
        startTicketPurchase: () => Promise.reject(new ApiError(0, { error: "network" })),
      }),
    );
    click("Pay");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Couldn’t connect. Check your connection, then try again.",
    );
    expect(signSponsored).not.toHaveBeenCalled();
  });

  it("goes back to the packs when signing fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(signSponsored).mockRejectedValue(new Error("The wallet closed."));
    const bought = vi.fn();
    await open(checkoutApi({ buyTickets: bought }));
    click("Pay");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Something went wrong, so nothing was paid. Try again.",
    );
    expect(document.querySelector(".copyable-fine-print__text")?.textContent).toBe(
      "The wallet closed.",
    );
    expect(bought).not.toHaveBeenCalled();
    click("Back to the packs");
    expect(title()).toBe("Pick a pack");
  });

  it("says why when Sui ran the payment and it failed, with Sui's words as fine print", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const failed = new ApiError(409, {
      error: "transaction_failed",
      detail: "MoveAbort(MoveLocation {}, 3)",
    });
    await open(checkoutApi({ buyTickets: () => Promise.reject(failed) }));
    click("Pay");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Sui ran it, but it failed, so nothing moved.",
    );
    expect(document.querySelector(".copyable-fine-print__text")?.textContent).toBe(
      "MoveAbort(MoveLocation {}, 3)",
    );
    expect(buttonNamed("Add the tickets")).toBeUndefined();
  });

  it("keeps the signed payment when its answer never came, and sends the same one again, never paying twice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const bought = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(503, { error: "payment_not_landed" }))
      .mockResolvedValueOnce(tickets(3, 1));
    const started = vi.fn(({ tickets: count }: StartPurchase) =>
      Promise.resolve({ purchase: purchaseFor(count), payment: PAYMENT }),
    );
    await open(checkoutApi({ buyTickets: bought, startTicketPurchase: started }));
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Adding the tickets again won’t charge you twice. Sui hasn’t answered about the payment yet.",
    );
    // The way back to the packs is only a quiet link, under the key that sends it again.
    expect(buttonNamed("Back to the packs")?.classList.contains("label-btn--quiet")).toBe(true);
    click("Add the tickets");
    await settle(500);
    expect(title()).toBe("1 reserve ticket added");
    expect(bought.mock.calls).toEqual([[paidFor(1)], [paidFor(1)]]);
    expect(started).toHaveBeenCalledOnce();
    expect(signSponsored).toHaveBeenCalledOnce();
  });

  it("leaves a payment whose answer never came for the packs, so it never blocks buying", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    await open(
      checkoutApi({ buyTickets: () => Promise.reject(new ApiError(0, { error: "network" })) }),
    );
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    click("Back to the packs");
    expect(title()).toBe("Pick a pack");
    expect(buttonNamed("Pay ¥100")?.disabled).toBe(false);
  });

  it("outlines the balance and the packs until the JPYC and the packs are in", async () => {
    const api = emptyApi({
      ticketShop: () => new Promise((resolve) => setTimeout(() => resolve(SHOP), 1000)),
    });
    await render(checkout(), api);
    const skeletons = () => document.querySelectorAll(".skeleton").length;
    expect(skeletons()).toBeGreaterThan(1);
    expect(document.querySelector(".reserve-checkout__packs [role=status]")?.textContent).toBe(
      "Getting today’s prices…",
    );
    await settle(3000);
    expect(skeletons()).toBe(0);
    // The half-width yen sign, Croquis Sans's own, though Node's ICU (like Chromium's) writes the full-width ￥.
    expect(document.querySelector(".reserve-checkout__balance strong")?.textContent).toBe("¥1,000");
  });

  it("won't pay a pack the wallet's JPYC can't cover, and says what to do instead", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(150n * JPYC);
    await render(checkout(), checkoutApi());
    await settle(500);
    const line = () => document.querySelector(".reserve-checkout__short")?.textContent;
    expect(line()).toBeUndefined();
    click("3 tickets");
    expect(buttonNamed("Pay")?.disabled).toBe(true);
    expect(line()).toBe(
      "Not enough balance for this pack. Pick a smaller one, or add JPYC to your Sui account.",
    );
    click("Pay");
    expect(signSponsored).not.toHaveBeenCalled();
  });

  it("says to add JPYC when the balance covers no pack at all", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(50n * JPYC);
    await render(checkout(), checkoutApi());
    await settle(500);
    expect(buttonNamed("Pay")?.disabled).toBe(true);
    expect(document.querySelector(".reserve-checkout__short")?.textContent).toBe(
      "Not enough balance for this pack. Add JPYC to your Sui account to buy it.",
    );
  });

  it("shows the Sui address in place when the balance is short, whole and copyable", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(50n * JPYC);
    const write = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    await render(checkout(), checkoutApi());
    await settle(500);
    expect(document.body.textContent).not.toContain(SUI_WALLET);
    click("Show my Sui address");
    expect(document.querySelector(".sui-address-reveal")?.textContent).toContain(SUI_WALLET);
    click("Copy");
    await settle(0);
    expect(write).toHaveBeenCalledWith(SUI_WALLET);
  });

  it("picks a pack as a radio group does: one tab stop, arrows move the pick and focus", async () => {
    await render(checkout(), checkoutApi());
    await settle(500);
    const radios = () => [...document.querySelectorAll<HTMLElement>("[role=radio]")];
    expect(document.querySelector("[role=radiogroup]")).not.toBeNull();
    expect(radios().map((r) => r.getAttribute("aria-checked"))).toEqual(["true", "false"]);
    expect(radios().map((r) => r.tabIndex)).toEqual([0, -1]);
    // The packs' arrival puts focus on the picked one, not on the exit it started at.
    expect(document.activeElement).toBe(radios()[0]);
    const arrow = (key: string) =>
      act(() => {
        document.activeElement?.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
      });
    arrow("ArrowDown");
    expect(radios().map((r) => r.getAttribute("aria-checked"))).toEqual(["false", "true"]);
    expect(document.activeElement).toBe(radios()[1]);
    expect(buttonNamed("Pay ¥270")).toBeDefined();
    // The last wraps to the first.
    arrow("ArrowRight");
    expect(document.activeElement).toBe(radios()[0]);
    arrow("ArrowUp");
    expect(document.activeElement).toBe(radios()[1]);
  });

  it("keeps Pay's face and focus while paying, says what it waits on, and lets the scrim close the card only after", async () => {
    let answer = (_: Tickets) => {};
    const bought = () => new Promise<Tickets>((resolve) => (answer = resolve));
    await open(checkoutApi({ buyTickets: bought }));
    act(() => buttonNamed("Pay")?.focus());
    click("Pay");
    await settle(0);
    const paying = buttonNamed("Paying…");
    // Busy, not disabled: it would sink grey and drop focus.
    expect(document.activeElement).toBe(paying);
    expect(paying?.disabled).toBe(false);
    expect(paying?.getAttribute("aria-busy")).toBe("true");
    expect(paying?.getAttribute("aria-disabled")).toBe("true");
    expect(document.querySelector(".reserve-checkout__foot [role=status]")?.textContent).toBe(
      "Adding your tickets…",
    );
    const scrim = () => document.querySelector<HTMLElement>(".out-of-tickets__scrim");
    act(() => scrim()?.click());
    expect(onBoard).not.toHaveBeenCalled();
    answer(tickets(3, 1));
    await settle(500);
    expect(title()).toBe("1 reserve ticket added");
    act(() => scrim()?.click());
    expect(onBoard).toHaveBeenCalledOnce();
  });

  it("opens the ticket purchases Sui lists under the short Sui address, a page at a time", async () => {
    const OLDER = "E".repeat(44);
    vi.mocked(getTicketPayments)
      .mockResolvedValueOnce({
        payments: [{ digest: TX_DIGEST, paidAt: EVENING.getTime(), amount: 270n * JPYC }],
        cursor: "older",
      })
      .mockResolvedValueOnce({
        payments: [{ digest: OLDER, paidAt: EVENING.getTime() - 60_000, amount: 100n * JPYC }],
        cursor: null,
      });
    await render(checkout(), checkoutApi());
    await settle(500);
    expect(getTicketPayments).not.toHaveBeenCalled();
    // The button says what it opens, not only whose name it carries.
    expect(buttonNamed("0x1111…1111")?.textContent).toContain("Purchases");
    click("0x1111…1111");
    await settle(500);
    expect(getTicketPayments).toHaveBeenCalledWith(SUI_WALLET, SHOP.payment, null);
    click("Older purchases");
    await settle(500);
    expect(getTicketPayments).toHaveBeenLastCalledWith(SUI_WALLET, SHOP.payment, "older");
    const rows = [...document.querySelectorAll<HTMLAnchorElement>(".ticket-purchases a")];
    expect(rows.map((a) => a.textContent)).toEqual([
      expect.stringContaining("3 tickets"),
      expect.stringContaining("1 ticket"),
    ]);
    expect(rows[1]?.href).toContain(OLDER);
    // A row is named by what it shows, with where it goes after it, never by its transaction ID.
    expect(rows.some((a) => a.hasAttribute("aria-label"))).toBe(false);
    expect(rows[0]?.textContent).toMatch(/3 tickets.*¥270.*Opens Suiscan/);
    expect(buttonNamed("Older purchases")).toBeUndefined();
  });
});
