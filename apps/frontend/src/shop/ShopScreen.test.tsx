// @vitest-environment happy-dom
import type { TicketShop as Shop, Tickets } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { getTicketPayments } from "../payments/jpyc";
import {
  addUnaddedPurchases,
  keepUnaddedPurchase,
  readUnaddedPurchasesAgain,
} from "../tickets/unaddedPurchases";
import { useTickets } from "../tickets/useTickets";
import { ShopScreen } from "./ShopScreen";

vi.mock("../payments/jpyc", () => ({ getTicketPayments: vi.fn() }));
// The shelves' swatches paint on canvases, which happy-dom doesn't draw.
vi.mock("./FinishPreview", () => ({ FinishPreview: () => null }));
vi.mock("./BrushStrokeSample", () => ({ BrushStrokeSample: () => null }));

const SUI_WALLET = `0x${"1".repeat(64)}`;
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
      onClick={() => void buyer.buyTickets({ purchaseId: 1, txDigest: "D".repeat(44) })}
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
  readUnaddedPurchasesAgain();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("ShopScreen", () => {
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
    expect(buttonNamed("you.croquis.eth")).toBeUndefined();

    act(() => setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET }));
    click("you.croquis.eth");
    await settle();
    expect(getTicketPayments).toHaveBeenCalledWith(SUI_WALLET, SHOP.payment, null);
    expect(rows()).toEqual([expect.stringContaining(`${PACK.tickets} tickets`)]);

    click("Buy the pack");
    await settle();
    expect(rows()).toEqual([]);
    click("you.croquis.eth");
    await settle();
    expect(getTicketPayments).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(1);
  });

  describe("a payment whose tickets weren't added", () => {
    const kept = {
      purchaseId: 1,
      digest: "D".repeat(44),
      tickets: 3,
      priceYen: 270,
      paidAt: Date.now(),
    };
    const strip = () => document.querySelector<HTMLButtonElement>(".unadded-strip");

    beforeEach(() => {
      vi.spyOn(console, "warn").mockImplementation(() => {});
      vi.spyOn(console, "error").mockImplementation(() => {});
      keepUnaddedPurchase("me", kept);
    });

    const render = async (buyTickets: () => Promise<Tickets>, onBuy = () => {}) => {
      const api = emptyApi({ ticketShop: () => Promise.resolve(SHOP), buyTickets });
      view = renderWithApi(<ShopScreen onBuyReserveTickets={onBuy} />, api);
      await settle();
      return api;
    };

    it("shows on the Shop until the server adds them, and opens the checkout", async () => {
      const onBuy = vi.fn();
      const api = await render(
        () => Promise.reject(new ApiError(502, { error: "sui_unavailable" })),
        onBuy,
      );
      expect(strip()?.textContent).toContain("Tickets not added yet");
      expect(strip()?.textContent).toContain("3 tickets, ¥270");
      act(() => strip()?.click());
      expect(onBuy).toHaveBeenCalledOnce();

      // The server answers this time, wherever the ask comes from.
      vi.spyOn(api, "buyTickets").mockResolvedValue({ ...FRESH_TICKETS, reserveLeft: 3 });
      await act(() => addUnaddedPurchases(api, "me"));
      expect(strip()).toBeNull();
    });

    it("says they can't be added once the server refuses the payment for good", async () => {
      await render(() => Promise.reject(new ApiError(422, { error: "payment_not_found" })));
      expect(strip()?.textContent).toContain("Tickets can’t be added");
      expect(strip()?.textContent).not.toContain("Tap to add them");
    });
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
