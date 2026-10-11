// @vitest-environment happy-dom
import type { TicketShop } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import { setPrivyStatus } from "../identity/privy";
import { signSponsored } from "../identity/suiSigner";
import { getJpycBalance } from "../payments/jpyc";
import { ReserveTicketCheckout } from "./ReserveTicketCheckout";

vi.mock("../payments/jpyc", () => ({ getJpycBalance: vi.fn(), getTicketPayments: vi.fn() }));
vi.mock("../identity/suiSigner", () => ({
  waitForSuiSigner: () => Promise.resolve({}),
  signSponsored: vi.fn(),
}));

const OWNER = `0x${"1".repeat(64)}`;
const SHOP: TicketShop = {
  packs: [{ tickets: 1, priceYen: 100, discountPercent: 0, priceJpyc: "100" }],
  payment: {
    network: "testnet",
    coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
    decimals: 0,
    paymentPackage: `0x${"b".repeat(64)}`,
    originalPackage: `0x${"b".repeat(64)}`,
    vault: `0x${"c".repeat(64)}`,
  },
};

let view: ReturnType<typeof renderWithApi> | undefined;
const settle = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const button = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(name));

beforeEach(() => {
  vi.useFakeTimers();
  setPrivyStatus({ state: "signed-in", userId: "privy-me", suiWallet: OWNER });
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  setPrivyStatus({ state: "off" });
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("the open reserve ticket checkout", () => {
  it("updates purchase eligibility after external funding without losing the selected pack or purchasing", async () => {
    let chainBalance = 0n;
    vi.mocked(getJpycBalance).mockImplementation(() => Promise.resolve(chainBalance));
    const startTicketPurchase = vi.fn();
    const buyTickets = vi.fn();
    view = renderWithApi(
      <ReserveTicketCheckout onDraw={() => {}} onClose={() => {}} />,
      emptyApi({ ticketShop: () => Promise.resolve(SHOP), startTicketPurchase, buyTickets }),
    );
    await settle();
    expect(button("Pay ¥100")?.disabled).toBe(true);
    expect(document.querySelector("[role=radio]")?.getAttribute("aria-checked")).toBe("true");

    chainBalance = 200n;
    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("online"));
    });
    await settle();
    expect(document.querySelector(".reserve-checkout__balance strong")?.textContent).toBe("¥200");
    expect(button("Pay ¥100")?.disabled).toBe(false);
    expect(document.querySelector("[role=radio]")?.getAttribute("aria-checked")).toBe("true");
    expect(startTicketPurchase).not.toHaveBeenCalled();
    expect(buyTickets).not.toHaveBeenCalled();
    expect(signSponsored).not.toHaveBeenCalled();
    expect(getJpycBalance).toHaveBeenCalledTimes(2);
  });

  it("offers an explicit Refresh balance control without leaving the payment step", async () => {
    let chainBalance = 0n;
    vi.mocked(getJpycBalance).mockImplementation(() => Promise.resolve(chainBalance));
    view = renderWithApi(
      <ReserveTicketCheckout onDraw={() => {}} onClose={() => {}} />,
      emptyApi({ ticketShop: () => Promise.resolve(SHOP) }),
    );
    await settle();
    expect(button("Refresh balance")?.disabled).toBe(false);
    chainBalance = 200n;
    act(() => button("Refresh balance")?.click());
    await settle();
    expect(button("Pay ¥100")?.disabled).toBe(false);
    expect(document.querySelector("h2")?.textContent).toBe("Pick a pack");
  });

  it("keeps a failed balance refresh and Sui's reason visible in the open checkout", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getJpycBalance)
      .mockResolvedValueOnce(0n)
      .mockRejectedValueOnce(new Error("Sui fullnode unavailable"));
    view = renderWithApi(
      <ReserveTicketCheckout onDraw={() => {}} onClose={() => {}} />,
      emptyApi({ ticketShop: () => Promise.resolve(SHOP) }),
    );
    await settle();
    act(() => button("Refresh balance")?.click());
    await settle();
    expect(document.querySelector(".reserve-checkout__balance [role=alert]")?.textContent).toBe(
      "Couldn’t read your balance.",
    );
    expect(document.querySelector(".copyable-fine-print__text")?.textContent).toBe(
      "Error: Sui fullnode unavailable",
    );
    expect(button("Refresh balance")?.disabled).toBe(false);
    expect(document.querySelector("h2")?.textContent).toBe("Pick a pack");
  });

  it("reads the JPYC balance again after a successful purchase", async () => {
    vi.mocked(getJpycBalance).mockResolvedValue(200n);
    vi.mocked(signSponsored).mockResolvedValue({ digest: "D".repeat(44), signature: "signed" });
    const startTicketPurchase = vi.fn(() =>
      Promise.resolve({
        purchase: { id: 1, tickets: 1, priceYen: 100 },
        payment: { txBytes: "AAAA", digest: "D".repeat(44), expiresAt: "2026-09-25T13:04:00.000Z" },
      }),
    );
    const buyTickets = vi.fn(() => Promise.resolve(FRESH_TICKETS));
    view = renderWithApi(
      <ReserveTicketCheckout onDraw={() => {}} onClose={() => {}} />,
      emptyApi({ ticketShop: () => Promise.resolve(SHOP), startTicketPurchase, buyTickets }),
    );
    await settle();
    act(() => button("Pay ¥100")?.click());
    await settle();
    expect(document.querySelector("h2")?.textContent).toBe("1 reserve ticket added");
    expect(startTicketPurchase).toHaveBeenCalledOnce();
    expect(buyTickets).toHaveBeenCalledOnce();
    expect(getJpycBalance).toHaveBeenCalledTimes(2);
  });
});
