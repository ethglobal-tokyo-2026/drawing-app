// @vitest-environment happy-dom
import type { Tickets, TicketShop as Shop } from "@drawing-app/api/client";
import { act, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { getJpycBalance, getTicketPayments, signTicketPayment } from "../payments/jpyc";
import { PaymentFailed } from "../payments/paymentErrors";
import { OutOfTickets } from "./OutOfTickets";
import { formatRefillTime } from "./refill";
import { ReserveTicketCheckout } from "./ReserveTicketCheckout";
import { StartDrawing } from "./StartDrawing";
import {
  addUnaddedPurchases,
  keepUnaddedPurchase,
  readUnaddedPurchasesAgain,
  unaddedPurchasesFor,
} from "./unaddedPurchases";
import { useTickets } from "./useTickets";

vi.mock("../payments/jpyc", () => ({
  getJpycBalance: vi.fn(),
  getTicketPayments: vi.fn(),
  signTicketPayment: vi.fn(),
}));
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
    const dialog = document.querySelector("[role=dialog]");
    const described = dialog?.getAttribute("aria-describedby")?.split(" ") ?? [];
    expect(described.map((id) => document.getElementById(id)?.textContent)).toContain(
      "You have 4 reserve tickets.",
    );
    expect(buttonNamed("Use a reserve ticket")?.classList.contains("key--blue")).toBe(true);
    click("Use a reserve ticket");
    expect(onStart).toHaveBeenCalledWith("reserve");
    click("Buy reserve tickets");
    expect(onShop).toHaveBeenCalledOnce();
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

/** The payment signed with TX_DIGEST, which Sui answers as `send` does: by default, it ran. */
const signed = (send: () => Promise<void> = () => Promise.resolve()) => ({
  digest: TX_DIGEST,
  send: vi.fn(send),
});

describe("ReserveTicketCheckout", () => {
  const checkout = () => <ReserveTicketCheckout onDraw={onDraw} onClose={onBoard} />;

  /** The payments this phone keeps for you until their tickets are added. */
  const kept = () => unaddedPurchasesFor("me").map((p) => p.digest);

  it("keeps a payment whose answer from Sui never came, and asks the server for its tickets all the same", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const payment = signed(() => {
      // Kept before Sui is asked to run it.
      expect(kept()).toEqual([TX_DIGEST]);
      return Promise.reject(new TypeError("Failed to fetch"));
    });
    vi.mocked(signTicketPayment).mockResolvedValue(payment);
    const bought = vi.fn(() => Promise.resolve(tickets(3, 1)));
    const api = emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought });
    await render(checkout(), api);
    await settle(500);
    click("Pay");
    await settle(500);
    expect(payment.send).toHaveBeenCalledOnce();
    expect(bought).toHaveBeenCalledWith({ tickets: 1, txDigest: TX_DIGEST });
    expect(title()).toBe("1 reserve ticket added");
    expect(kept()).toEqual([]);
  });

  it("opens Tickets not added yet, never a failed payment, when Sui's confirmation is slow and the server doesn't see the payment yet", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.mocked(signTicketPayment).mockResolvedValue(
      signed(() => Promise.reject(new DOMException("The operation timed out.", "TimeoutError"))),
    );
    const bought = vi.fn(() => Promise.reject(new ApiError(409, { error: "payment_not_landed" })));
    await render(
      checkout(),
      emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought }),
    );
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    expect(document.body.textContent).not.toContain("Payment didn’t go through");
    // Kept, so asking again later can still add them.
    expect(kept()).toEqual([TX_DIGEST]);
  });

  it("lets go of a payment Sui ran and failed, and says nothing was spent", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(signTicketPayment).mockResolvedValue(
      signed(() => Promise.reject(new PaymentFailed(TX_DIGEST, "Sui ran it, and it failed."))),
    );
    const bought = vi.fn();
    await render(
      checkout(),
      emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought }),
    );
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    // One catalog line for the known failure; Sui's own words are fine print, copyable.
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Sui ran the payment, but it failed, so no JPYC was spent.",
    );
    expect(document.querySelector(".copyable-fine-print__text")?.textContent).toBe(
      "Sui ran it, and it failed.",
    );
    expect(bought).not.toHaveBeenCalled();
    expect(kept()).toEqual([]);
  });

  beforeEach(() => {
    localStorage.clear();
    readUnaddedPurchasesAgain();
    setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET });
    vi.mocked(getJpycBalance).mockResolvedValue(1000n * JPYC);
    vi.mocked(signTicketPayment).mockResolvedValue(signed());
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
    // The half-width yen sign, Mona Sans's own, though Node's ICU (like Chromium's) writes the full-width ￥.
    expect(document.querySelector(".reserve-checkout__balance strong")?.textContent).toBe("¥1,000");
  });

  it("pays the chosen pack's JPYC from the Sui wallet, and shows the tickets the server added", async () => {
    const bought = vi.fn(() => Promise.resolve(tickets(3, 4)));
    const api = emptyApi({
      tickets: () => Promise.resolve(tickets(3, 1)),
      ticketShop: () => Promise.resolve(SHOP),
      buyTickets: bought,
    });
    await render(checkout(), api);
    await settle(500);
    click("3 tickets");
    click("Pay");
    await settle(2000);
    expect(title()).toBe("3 reserve tickets added");
    // One reserve ticket, its badge on the new total.
    expect(document.querySelectorAll(".ticket-stub")).toHaveLength(1);
    expect(document.querySelector(".ticket-stub__badge")?.textContent).toBe("×4");
    expect(signTicketPayment).toHaveBeenCalledWith(expect.anything(), SHOP.payment, 270n * JPYC);
    expect(bought).toHaveBeenCalledWith({ tickets: 3, txDigest: TX_DIGEST });
    expect(kept()).toEqual([]);
    expect(buttonNamed("Draw")?.getAttribute("aria-label")).toContain("4 reserve tickets");
    click("Draw");
    expect(onDraw).toHaveBeenCalledOnce();
  });

  it("won't pay a pack the wallet's JPYC can't cover, and says what to do instead", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(150n * JPYC);
    await render(checkout(), emptyApi({ ticketShop: () => Promise.resolve(SHOP) }));
    await settle(500);
    const line = () => document.querySelector(".reserve-checkout__short")?.textContent;
    expect(line()).toBeUndefined();
    click("3 tickets");
    expect(buttonNamed("Pay")?.disabled).toBe(true);
    expect(line()).toBe(
      "Not enough balance for this pack. Pick a smaller one, or add JPYC to your Sui account.",
    );
    click("Pay");
    expect(signTicketPayment).not.toHaveBeenCalled();
  });

  it("says to add JPYC when the balance covers no pack at all", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(50n * JPYC);
    await render(checkout(), emptyApi({ ticketShop: () => Promise.resolve(SHOP) }));
    await settle(500);
    expect(buttonNamed("Pay")?.disabled).toBe(true);
    expect(document.querySelector(".reserve-checkout__short")?.textContent).toBe(
      "Not enough balance for this pack. Add JPYC to your Sui account to buy it.",
    );
  });

  it("opens the ticket purchases Sui lists under the ENS name, a page at a time", async () => {
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
    await render(checkout(), emptyApi({ ticketShop: () => Promise.resolve(SHOP) }));
    await settle(500);
    expect(getTicketPayments).not.toHaveBeenCalled();
    // The button says what it opens, not only whose name it carries.
    expect(buttonNamed("you.croquis.eth")?.textContent).toContain("Purchases");
    click("you.croquis.eth");
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

  it("goes back to the packs when the payment itself fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(signTicketPayment).mockRejectedValue(
      new Error("Sui didn’t answer the payment in time."),
    );
    await render(checkout(), emptyApi({ ticketShop: () => Promise.resolve(SHOP) }));
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Payment didn’t go through");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Something went wrong, so nothing was paid. Try again.",
    );
    expect(document.querySelector(".copyable-fine-print__text")?.textContent).toBe(
      "Sui didn’t answer the payment in time.",
    );
    click("Back to the packs");
    expect(title()).toBe("Pick a pack");
  });

  it("asks again for the tickets a payment bought when the server didn't add them, and never pays twice", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const write = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText: write },
      configurable: true,
    });
    const bought = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sui didn’t answer."))
      .mockResolvedValueOnce(tickets(3, 1));
    const api = emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought });
    await render(checkout(), api);
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    expect(kept()).toEqual([TX_DIGEST]);
    // The payment's ID is fine print under the key, never in the alert.
    expect(document.querySelector("[role=alert]")?.textContent).not.toContain(TX_DIGEST);
    expect(document.querySelector(".reserve-checkout__digest")?.textContent).toBe(TX_DIGEST);
    // The way back to the packs is only a quiet link, under the key that asks again.
    expect(buttonNamed("Back to the packs")?.classList.contains("label-btn--quiet")).toBe(true);
    click("Copy");
    await settle(0);
    expect(write).toHaveBeenCalledWith(TX_DIGEST);
    expect(buttonNamed("Copied")).toBeDefined();
    click("Add the tickets");
    await settle(500);
    expect(title()).toBe("1 reserve ticket added");
    expect(bought).toHaveBeenCalledTimes(2);
    expect(bought).toHaveBeenLastCalledWith({ tickets: 1, txDigest: TX_DIGEST });
    expect(signTicketPayment).toHaveBeenCalledOnce();
    expect(kept()).toEqual([]);
  });

  it("opens on a kept payment whose tickets weren't added, after the card was closed, and asks for them at once", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const bought = vi
      .fn()
      .mockRejectedValueOnce(new Error("Sui didn’t answer."))
      .mockRejectedValueOnce(new ApiError(502, { error: "sui_unavailable" }))
      .mockResolvedValueOnce(tickets(3, 3));
    const api = emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought });
    await render(checkout(), api);
    await settle(500);
    click("3 tickets");
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    click("Not now");
    expect(onBoard).toHaveBeenCalledOnce();
    view?.unmount();

    // The app opens again, and the checkout with it: on the payment, never on the packs.
    readUnaddedPurchasesAgain();
    view = renderWithApi(checkout(), api);
    expect(title()).toBe("Tickets not added yet");
    expect(document.querySelector(".reserve-checkout__digest")?.textContent).toBe(TX_DIGEST);
    expect(buttonNamed("Adding…")?.getAttribute("aria-busy")).toBe("true");
    await settle(500);
    expect(bought).toHaveBeenCalledTimes(2);
    expect(document.querySelector("[role=alert]")?.textContent).toContain(
      "Sui didn't answer. Your tickets weren't added yet; try again.",
    );
    expect(kept()).toEqual([TX_DIGEST]);

    click("Add the tickets");
    await settle(500);
    expect(title()).toBe("3 reserve tickets added");
    // The phone kept what it cost, too.
    expect(document.body.textContent).toContain("Paid ¥270 in JPYC.");
    expect(bought).toHaveBeenCalledTimes(3);
    expect(bought).toHaveBeenLastCalledWith({ tickets: 3, txDigest: TX_DIGEST });
    expect(signTicketPayment).toHaveBeenCalledOnce();
    expect(kept()).toEqual([]);
  });

  it("leaves a payment whose tickets weren't added for the packs, still kept, so it never blocks buying", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const api = emptyApi({
      ticketShop: () => Promise.resolve(SHOP),
      buyTickets: () => Promise.reject(new ApiError(502, { error: "sui_unavailable" })),
    });
    await render(checkout(), api);
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    click("Back to the packs");
    expect(title()).toBe("Pick a pack");
    expect(buttonNamed("Pay ¥100")?.disabled).toBe(false);
    expect(kept()).toEqual([TX_DIGEST]);
  });

  it("says once, with the server's reason and the payment's ID, when the server refuses a payment for good", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const refusal = new ApiError(402, {
      error: "payment_short",
      detail: `txDigest: ${TX_DIGEST}`,
    });
    const bought = vi
      .fn()
      .mockRejectedValueOnce(new ApiError(502, { error: "sui_unavailable" }))
      .mockRejectedValueOnce(refusal);
    const api = emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought });
    await render(checkout(), api);
    await settle(500);
    click("Pay");
    await settle(500);
    expect(title()).toBe("Tickets not added yet");
    click("Add the tickets");
    await settle(500);
    expect(title()).toBe("Tickets can’t be added");
    // The card turned over under the key that was pressed, so its own key takes focus.
    expect(document.activeElement?.textContent).toBe("Back to the packs");
    expect(document.querySelector("[role=alert]")?.textContent).toBe(
      "Asking again won’t add them. The payment was short.",
    );
    expect(document.querySelector(".reserve-checkout__digest")?.textContent).toBe(TX_DIGEST);
    expect(buttonNamed("Copy")).toBeDefined();
    // Names who to send the ID to.
    expect(document.querySelector(".out-of-tickets__note")?.textContent).toContain(
      "Croquis Official account",
    );
    expect(buttonNamed("Add the tickets")).toBeUndefined();
    // Refused for good, so it's no longer kept or asked for again.
    expect(kept()).toEqual([]);
    click("Back to the packs");
    expect(title()).toBe("Pick a pack");
    expect(bought).toHaveBeenCalledTimes(2);
  });

  it("says once, as it opens, why the server refused a kept payment while it was closed", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.spyOn(console, "warn").mockImplementation(() => {});
    keepUnaddedPurchase("me", { digest: TX_DIGEST, tickets: 3, priceYen: 270, paidAt: 0 });
    const bought = vi.fn(() =>
      Promise.reject(
        new ApiError(422, { error: "payment_not_found", detail: "no such transaction" }),
      ),
    );
    const api = emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets: bought });
    // The app's own ask, as it opened, met the refusal.
    await addUnaddedPurchases(api, "me");
    await render(checkout(), api);
    expect(title()).toBe("Tickets can’t be added");
    expect(document.querySelector("[role=alert]")?.textContent).toContain(
      "That payment didn't reach the ticket shop.",
    );
    expect(kept()).toEqual([]);
    view?.unmount();

    await render(checkout(), api);
    expect(title()).toBe("Pick a pack");
    expect(bought).toHaveBeenCalledOnce();
  });
});
