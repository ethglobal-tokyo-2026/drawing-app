// @vitest-environment happy-dom
import type { TicketShop as Shop, Tickets } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { getTicketPayments } from "../payments/jpyc";
import { useTickets } from "../tickets/useTickets";
import { ToastProvider } from "../ui/ToastProvider";
import { ShopScreen } from "./ShopScreen";

vi.mock("../payments/jpyc", () => ({ getTicketPayments: vi.fn() }));
// The shelves' swatches paint on canvases, which happy-dom doesn't draw.
vi.mock("./FinishPreview", () => ({ FinishPreview: () => null }));
vi.mock("./BrushStrokeSample", () => ({ BrushStrokeSample: () => null }));

const SUI_WALLET = `0x${"1".repeat(64)}`;
/** The purchases button carries the wallet's address, shortened. */
const SHORT_ADDRESS = "0x1111…1111";
/** 1 JPYC in base units. */
const JPYC = 1_000_000n;
const PACK: Shop["packs"][number] = {
  tickets: 3,
  priceYen: 270,
  discountPercent: 10,
  priceJpyc: String(270n * JPYC),
};
const SHOP: Shop = {
  packs: [PACK],
  payment: {
    network: "testnet",
    coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
    decimals: 6,
    paymentPackage: `0x${"b".repeat(64)}`,
    vault: `0x${"c".repeat(64)}`,
  },
};

/** Stands in for the checkout over the Shop: buys PACK. */
function Purchase() {
  const { buyer } = useTickets();
  return (
    <button
      type="button"
      onClick={() =>
        void buyer.buyTickets({ purchaseId: 1, digest: "D".repeat(44), signature: "c2lnbmVk" })
      }
    >
      Buy the pack
    </button>
  );
}

let view: ReturnType<typeof renderWithApi> | undefined;
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(name));
const click = (name: string) => act(() => buttonNamed(name)?.click());
/** Lets the API and Sui answer. */
const settle = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const rows = () => [...document.querySelectorAll(".ticket-purchases a")].map((a) => a.textContent);

beforeEach(() => {
  vi.useFakeTimers();
  setPrivyStatus({ state: "signing-in" });
  localStorage.clear();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ShopScreen", () => {
  it("leads reserve tickets with their name, holds your count over Buy, and says Coming soon once", async () => {
    view = renderWithApi(
      <ShopScreen onBuyReserveTickets={() => {}} />,
      emptyApi({
        tickets: () => Promise.resolve({ ...FRESH_TICKETS, reserveLeft: 2 }),
        ticketShop: () => Promise.resolve(SHOP),
      }),
    );
    await settle();
    // The section's heading, lines and keys in reading order, whichever box each sits in.
    const lines = [
      ...(document.querySelector(".reserve-hero")?.querySelectorAll("h2, p, button") ?? []),
    ].map((el) => el.textContent ?? "");
    const at = (text: string) => lines.findIndex((line) => line.includes(text));
    expect(at("Reserve tickets")).toBeGreaterThan(-1);
    expect(at("Reserve tickets")).toBeLessThan(at("You have"));
    expect(at("You have")).toBeLessThan(at("Buy reserve tickets"));
    expect(document.body.textContent?.split("Coming soon")).toHaveLength(2);
  });

  it("lists your ticket purchases from Sui under the reserve tickets, and reads them again after a purchase", async () => {
    vi.mocked(getTicketPayments).mockResolvedValue({
      payments: [{ digest: "D".repeat(44), paidAt: Date.now(), amount: BigInt(PACK.priceJpyc) }],
      cursor: null,
    });
    view = renderWithApi(
      <>
        <ShopScreen onBuyReserveTickets={() => {}} />
        <Purchase />
      </>,
      emptyApi({
        ticketShop: () => Promise.resolve(SHOP),
        buyTickets: () =>
          Promise.resolve({
            ...FRESH_TICKETS,
            reserveLeft: FRESH_TICKETS.reserveLeft + PACK.tickets,
          }),
      }),
    );
    await settle();
    expect(buttonNamed(SHORT_ADDRESS)).toBeUndefined();

    act(() => setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET }));
    click(SHORT_ADDRESS);
    await settle();
    expect(getTicketPayments).toHaveBeenCalledWith(SUI_WALLET, SHOP.payment, null);
    expect(rows()).toEqual([expect.stringContaining(`${PACK.tickets} tickets`)]);

    click("Buy the pack");
    await settle();
    expect(rows()).toEqual([]);
    click(SHORT_ADDRESS);
    await settle();
    expect(getTicketPayments).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(1);
  });

  it("offers Deposit once your Sui address is known, which holds that address up", async () => {
    view = renderWithApi(
      <ToastProvider>
        <ShopScreen onBuyReserveTickets={() => {}} />
      </ToastProvider>,
      emptyApi({ ticketShop: () => Promise.resolve(SHOP) }),
    );
    await settle();
    expect(buttonNamed("Deposit")).toBeUndefined();

    act(() => setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET }));
    click("Deposit");
    expect(document.querySelector("[role=dialog] .address-dialog__address")?.textContent).toBe(
      SUI_WALLET,
    );
  });

  it("says when your tickets didn't load, instead of reading as if you hold none, and loads them again", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const tickets = vi
      .fn<() => Promise<Tickets>>()
      .mockRejectedValueOnce(new ApiError(500, { error: "internal_error" }))
      .mockResolvedValue({ ...FRESH_TICKETS, reserveLeft: 2 });
    view = renderWithApi(
      <ShopScreen onBuyReserveTickets={() => {}} />,
      emptyApi({ tickets, ticketShop: () => Promise.resolve(SHOP) }),
    );
    await settle();
    const alert = () => document.querySelector(".reserve-hero [role=alert]")?.textContent;
    expect(alert()).toContain("Couldn’t load your tickets");
    expect(document.querySelector(".reserve-hero__held:not([role=alert])")).toBeNull();

    click("Try again");
    await settle();
    expect(alert()).toBeUndefined();
    expect(document.querySelector(".reserve-hero__held")?.textContent).toContain("×2");
  });
});
