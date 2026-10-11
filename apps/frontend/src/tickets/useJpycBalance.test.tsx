// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getJpycBalance, type JpycPayment } from "../payments/jpyc";
import { renderInHost, type HostView } from "../ui/testing";
import { useJpycBalance } from "./useJpycBalance";

vi.mock("../payments/jpyc", () => ({ getJpycBalance: vi.fn() }));

const OWNER = `0x${"1".repeat(64)}`;
const OTHER_OWNER = `0x${"2".repeat(64)}`;
const PAYMENT: JpycPayment = {
  network: "testnet",
  coinType: `0x${"a".repeat(64)}::jpy_coin::JPY_COIN`,
  decimals: 6,
  paymentPackage: `0x${"b".repeat(64)}`,
  originalPackage: `0x${"b".repeat(64)}`,
  vault: `0x${"c".repeat(64)}`,
};

function delayed() {
  let resolve!: (balance: bigint) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<bigint>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

function Balance({ owner = OWNER, payment = PAYMENT }: { owner?: string; payment?: JpycPayment }) {
  const { balance, error, refreshing, refresh } = useJpycBalance(owner, payment);
  return (
    <div>
      <output>{balance === null ? "unknown" : String(balance)}</output>
      <span role="alert">{error}</span>
      <button disabled={refreshing} onClick={refresh}>
        Refresh
      </button>
    </div>
  );
}

let view: HostView | undefined;
const settle = () => act(async () => void (await vi.advanceTimersByTimeAsync(0)));
const amount = () => view?.host.querySelector("output")?.textContent;
const refresh = () => act(() => view?.host.querySelector("button")?.click());

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

describe("useJpycBalance", () => {
  it("reads again when the visible checkout gets focus, becomes visible, or comes online", async () => {
    let chainBalance = 0n;
    vi.mocked(getJpycBalance).mockImplementation(() => Promise.resolve(chainBalance));
    view = renderInHost(<Balance />);
    await settle();
    expect(amount()).toBe("0");

    chainBalance = 200n;
    act(() => {
      window.dispatchEvent(new Event("focus"));
      document.dispatchEvent(new Event("visibilitychange"));
      window.dispatchEvent(new Event("online"));
    });
    await settle();
    expect(amount()).toBe("200");
    expect(getJpycBalance).toHaveBeenCalledTimes(2);
  });

  it("lets Refresh request a new balance and disables the control while it reads", async () => {
    const next = delayed();
    vi.mocked(getJpycBalance).mockResolvedValueOnce(0n).mockReturnValueOnce(next.promise);
    view = renderInHost(<Balance />);
    await settle();
    refresh();
    await settle();
    expect(view.host.querySelector("button")?.disabled).toBe(true);
    next.resolve(200n);
    await settle();
    expect(amount()).toBe("200");
    expect(view.host.querySelector("button")?.disabled).toBe(false);
  });

  it("clears another owner's or coin's balance immediately and ignores old answers", async () => {
    const old = delayed();
    vi.mocked(getJpycBalance)
      .mockResolvedValueOnce(50n)
      .mockReturnValueOnce(old.promise)
      .mockResolvedValueOnce(90n);
    view = renderInHost(<Balance />);
    await settle();
    refresh();
    await settle();
    view.rerender(<Balance owner={OTHER_OWNER} />);
    expect(amount()).toBe("unknown");
    old.resolve(500n);
    await settle();
    expect(amount()).toBe("90");
    expect(getJpycBalance).toHaveBeenLastCalledWith(OTHER_OWNER, PAYMENT);

    const otherCoin = { ...PAYMENT, coinType: `0x${"d".repeat(64)}::jpy_coin::JPY_COIN` };
    vi.mocked(getJpycBalance).mockResolvedValueOnce(12n);
    view.rerender(<Balance owner={OTHER_OWNER} payment={otherCoin} />);
    expect(amount()).toBe("unknown");
    await settle();
    expect(amount()).toBe("12");

    const otherNetwork = { ...otherCoin, network: "mainnet" as const };
    vi.mocked(getJpycBalance).mockResolvedValueOnce(13n);
    view.rerender(<Balance owner={OTHER_OWNER} payment={otherNetwork} />);
    expect(amount()).toBe("unknown");
    await settle();
    expect(amount()).toBe("13");
  });

  it("coalesces repeated requests during one read into one following read", async () => {
    const first = delayed();
    vi.mocked(getJpycBalance).mockReturnValueOnce(first.promise).mockResolvedValueOnce(200n);
    view = renderInHost(<Balance />);
    await settle();
    act(() => {
      window.dispatchEvent(new Event("focus"));
      window.dispatchEvent(new Event("online"));
    });
    expect(getJpycBalance).toHaveBeenCalledTimes(1);
    first.resolve(0n);
    await settle();
    expect(amount()).toBe("200");
    expect(getJpycBalance).toHaveBeenCalledTimes(2);
  });

  it("keeps a failed refresh visible, then clears its error after a successful read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(getJpycBalance)
      .mockResolvedValueOnce(0n)
      .mockRejectedValueOnce(new Error("Sui is unavailable"))
      .mockResolvedValueOnce(200n);
    view = renderInHost(<Balance />);
    await settle();
    refresh();
    await settle();
    expect(view.host.querySelector("[role=alert]")?.textContent).toContain("Sui is unavailable");
    refresh();
    await settle();
    expect(amount()).toBe("200");
    expect(view.host.querySelector("[role=alert]")?.textContent).toBe("");
  });

  it("ignores a read that finishes after unmount and removes event listeners", async () => {
    const first = delayed();
    vi.mocked(getJpycBalance).mockReturnValue(first.promise);
    view = renderInHost(<Balance />);
    await settle();
    view.unmount();
    view = undefined;
    first.resolve(200n);
    await settle();
    act(() => {
      window.dispatchEvent(new Event("focus"));
    });
    await settle();
    expect(getJpycBalance).toHaveBeenCalledTimes(1);
  });
});
