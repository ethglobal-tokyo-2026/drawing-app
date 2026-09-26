// @vitest-environment happy-dom
import type { TicketShop as Shop } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { getTicketPayments } from "../payments/jpyc";
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
    reference: "tickets:me",
  },
};

/** Stands in for the checkout over the Shop: buys PACK. */
function Purchase() {
  const { tickets, set } = useTickets();
  return (
    <button
      type="button"
      onClick={() =>
        tickets && set({ ...tickets, reserveLeft: tickets.reserveLeft + PACK.tickets })
      }
    >
      Purchase
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
      emptyApi({ ticketShop: () => Promise.resolve(SHOP) }),
    );
    await settle();
    expect(buttonNamed("you.croquis.eth")).toBeUndefined();

    act(() => setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: SUI_WALLET }));
    click("you.croquis.eth");
    await settle();
    expect(getTicketPayments).toHaveBeenCalledWith(SUI_WALLET, SHOP.payment, null);
    expect(rows()).toEqual([expect.stringContaining(`${PACK.tickets} tickets`)]);

    click("Purchase");
    expect(rows()).toEqual([]);
    click("you.croquis.eth");
    await settle();
    expect(getTicketPayments).toHaveBeenCalledTimes(2);
    expect(rows()).toHaveLength(1);
  });
});
