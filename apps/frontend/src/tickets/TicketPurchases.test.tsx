// @vitest-environment happy-dom
import type { TicketShop as Shop } from "@drawing-app/api/client";
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithApi } from "../api/testing";
import { getTicketPayments, type TicketPaymentPage } from "../payments/jpyc";
import { TicketPurchases } from "./TicketPurchases";

vi.mock("../payments/jpyc", () => ({ getTicketPayments: vi.fn() }));

const OWNER = `0x${"1".repeat(64)}`;
const SHOP: Shop = {
  packs: [],
  payment: {
    network: "testnet",
    coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
    decimals: 6,
    paymentPackage: `0x${"b".repeat(64)}`,
    vault: `0x${"c".repeat(64)}`,
    reference: "tickets:me",
  },
};
const PROBLEM = "Couldn’t read your ticket purchases from Sui.";

/** A page of one payment, with the cursor of the page older than it. */
const page = (digest: string, cursor: string | null): TicketPaymentPage => ({
  payments: [{ digest, paidAt: Date.UTC(2026, 8, 25, 12, 4), amount: 100_000_000n }],
  cursor,
});

/** A read of Sui that answers when the test says. */
function slowRead() {
  let answer: (page: TicketPaymentPage) => void = () => {};
  let refuse: (reason: Error) => void = () => {};
  const read = new Promise<TicketPaymentPage>((resolve, reject) => {
    answer = resolve;
    refuse = reject;
  });
  return { read, answer, refuse };
}

let view: ReturnType<typeof renderWithApi> | undefined;
const buttonNamed = (name: string) =>
  [...document.querySelectorAll("button")].find((b) => b.textContent?.includes(name));
const click = (name: string) => act(() => buttonNamed(name)?.click());
/** Lets Sui's answer land. */
const settle = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const alertText = () => document.querySelector("[role=alert]")?.textContent;
const rows = () => document.querySelectorAll(".ticket-purchases a").length;

/** The list, opened: its first read has been asked for and has answered. */
async function openList() {
  view = renderWithApi(<TicketPurchases owner={OWNER} shop={SHOP} />);
  click("you.croquis.eth");
  await settle();
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("the ticket purchases list's Try again", () => {
  it("takes the failure off while the first page reads again, and brings it back with the new words if that fails too", async () => {
    const again = slowRead();
    vi.mocked(getTicketPayments)
      .mockRejectedValueOnce(new Error("Sui didn’t answer"))
      .mockReturnValueOnce(again.read);
    await openList();
    expect(alertText()).toContain(PROBLEM);

    click("Try again");
    await settle();
    expect(getTicketPayments).toHaveBeenLastCalledWith(OWNER, SHOP.payment, null);
    expect(alertText()).toBeUndefined();
    expect(document.querySelector("[role=status]")?.textContent).toBe(
      "Reading your ticket purchases from Sui…",
    );

    again.refuse(new Error("Sui still didn’t answer"));
    await settle();
    expect(alertText()).toContain(PROBLEM);
    expect(document.body.textContent).toContain("Sui still didn’t answer");
  });

  it("keeps focus on the purchases button as the failure goes", async () => {
    vi.mocked(getTicketPayments)
      .mockRejectedValueOnce(new Error("Sui didn’t answer"))
      .mockReturnValueOnce(slowRead().read);
    await openList();
    act(() => buttonNamed("Try again")?.focus());

    click("Try again");
    await settle();
    expect(document.activeElement).toBe(buttonNamed("you.croquis.eth"));
  });

  it("reads an older page again from where it failed, with the pages already listed still there", async () => {
    const again = slowRead();
    vi.mocked(getTicketPayments)
      .mockResolvedValueOnce(page("D".repeat(44), "older"))
      .mockRejectedValueOnce(new Error("Sui didn’t answer"))
      .mockReturnValueOnce(again.read);
    await openList();
    click("Older purchases");
    await settle();
    expect(alertText()).toContain(PROBLEM);

    click("Try again");
    await settle();
    expect(getTicketPayments).toHaveBeenLastCalledWith(OWNER, SHOP.payment, "older");
    expect(alertText()).toBeUndefined();
    expect(rows()).toBe(1);

    again.answer(page("E".repeat(44), null));
    await settle();
    expect(rows()).toBe(2);
  });
});
