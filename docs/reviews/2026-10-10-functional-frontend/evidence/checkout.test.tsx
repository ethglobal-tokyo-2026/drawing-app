import { act } from "react";
import type { TicketShop } from "../../../../apps/api/src/client";
import { afterEach, expect, it, vi } from "vitest";
import { emptyApi, renderWithApi } from "../../../../apps/frontend/src/api/testing";
import { ReserveTicketCheckout } from "../../../../apps/frontend/src/tickets/ReserveTicketCheckout";

const balance = vi.hoisted(() => ({ read: vi.fn() }));
vi.mock("../../../../apps/frontend/src/payments/jpyc", () => ({ getJpycBalance: balance.read }));
vi.mock("../../../../apps/frontend/src/identity/privy", () => ({
  usePrivyStatus: () => ({ state: "signed-in", suiWallet: `0x${"1".repeat(64)}` }),
}));
vi.mock("../../../../apps/frontend/src/identity/suiWallet", () => ({
  useSuiWalletFailure: () => undefined,
}));
const shop: TicketShop = {
  packs: [{ tickets: 1, priceYen: 100, discountPercent: 0, priceJpyc: "100000000" }],
  payment: {
    network: "testnet",
    coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
    decimals: 6,
    paymentPackage: `0x${"b".repeat(64)}`,
    originalPackage: `0x${"b".repeat(64)}`,
    vault: `0x${"c".repeat(64)}`,
  },
};
let view: ReturnType<typeof renderWithApi>;
afterEach(() => {
  view?.unmount();
  vi.useRealTimers();
});
it("reproduces checkout remaining disabled after a JPYC deposit and app resume", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-26T00:00:00Z"));
  balance.read.mockResolvedValue(0n);
  view = renderWithApi(
    <ReserveTicketCheckout onDraw={() => {}} onClose={() => {}} />,
    emptyApi({ ticketShop: async () => shop }),
  );
  await act(async () => {});
  await act(() => vi.dynamicImportSettled());
  const pay = document.querySelector<HTMLButtonElement>(".out-of-tickets__key")!;
  expect(pay.disabled).toBe(true);
  balance.read.mockResolvedValue(200000000n);
  await act(async () => {
    document.dispatchEvent(new Event("visibilitychange"));
    window.dispatchEvent(new Event("focus"));
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(60000);
  });
  expect(balance.read).toHaveBeenCalledTimes(1);
  expect(pay.disabled).toBe(true);
  expect(document.querySelector(".reserve-checkout__balance")?.textContent).toContain("¥0");
});
