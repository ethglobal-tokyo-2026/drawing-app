// @vitest-environment happy-dom
import type { Me, Tickets } from "@drawing-app/api/client";
import { act, useEffect, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import type { TicketsValue } from "./ticketsContext";
import { REFILL_RETRY_MAX_MS, REFILL_RETRY_MS } from "./TicketsProvider";
import { useTickets } from "./useTickets";

type Spender = Pick<TicketsValue, "spend" | "forgetKeptSpend">;

/** The server's answer to a spend that lands. */
const SPENT = {
  ticketUse: {
    id: 7,
    ticketDay: FRESH_TICKETS.ticketDay,
    dayIndex: 0,
    kind: "daily",
    kyotoSeikaPractice: false,
    spentAt: "2026-09-26T00:00:00.000Z",
  },
  tickets: FRESH_TICKETS,
} satisfies Awaited<ReturnType<ApiClient["spendTicket"]>>;
/** A spend whose answer never came back, though the server may have spent it. */
const NO_ANSWER = new ApiError(0, {
  error: "network",
  detail: "POST /api/tickets/spend got no answer",
});
/** Someone else, signed in on the same phone. */
const SOMEONE_ELSE: Me = { ...TEST_ME, id: "someone-else", lineUserId: "U-someone-else" };

/** Hands the test the tickets' spend, and what the drawing screen says once it keeps a ticket use. */
function Spender({ onSpend }: { onSpend: (spender: Spender) => void }) {
  const { spend, forgetKeptSpend } = useTickets();
  useEffect(() => onSpend({ spend, forgetKeptSpend }), [onSpend, spend, forgetKeptSpend]);
  return null;
}

/** The server: every spend lands, unless a test answers the next one first. */
const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(SPENT));
/** The key each spend has sent so far, in order, whichever open sent it. */
const keys = () => spendTicket.mock.calls.map(([sent]) => sent.idempotencyKey);

let view: ReturnType<typeof renderWithApi> | undefined;
/** Your tickets as `me`, in place of the page open before, as a reload does. Answers their spend. */
async function open(me: Me = TEST_ME): Promise<Spender> {
  view?.unmount();
  const onSpend = vi.fn<(spender: Spender) => void>();
  view = renderWithApi(<Spender onSpend={onSpend} />, emptyApi({ spendTicket }), me);
  await act(async () => {});
  const spender = onSpend.mock.lastCall?.[0];
  if (!spender) throw new Error("The tickets gave no spend");
  return spender;
}

/** A spend that lands, and its ticket use kept with a sheet, as the drawing screen does. */
async function spendAndKeep({ spend, forgetKeptSpend }: Spender) {
  await act(() => spend("daily"));
  forgetKeptSpend();
}

/** Opens the app as `me` and spends, but the page goes before the answer comes. */
async function spendThenLeave(me: Me = TEST_ME) {
  spendTicket.mockReturnValueOnce(new Promise(() => {}));
  void (await open(me)).spend("daily");
}

beforeEach(() => {
  // The refill's timer stays put, so only the spends change the tickets.
  vi.useFakeTimers();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  spendTicket.mockReset();
  localStorage.clear();
  vi.useRealTimers();
});

describe("spending a ticket", () => {
  it("sends a failed spend's key again when it's retried, and a new key for the next drawing", async () => {
    spendTicket.mockRejectedValueOnce(NO_ANSWER);
    const spender = await open();
    await expect(act(() => spender.spend("daily"))).rejects.toBe(NO_ANSWER);
    await spendAndKeep(spender);
    await act(() => spender.spend("daily"));
    const [tried, retried, nextDrawing] = keys();
    expect(retried).toBe(tried);
    expect(nextDrawing).not.toBe(tried);
  });

  it("sends a second tap with the key of the spend still on its way", async () => {
    const { spend } = await open();
    await act(() => Promise.all([spend("daily"), spend("daily")]));
    const [first, second] = keys();
    expect(first).toEqual(expect.any(String));
    expect(second).toBe(first);
  });
});

describe("a spend's key across a reload", () => {
  it("sends the key again when the page went before the spend's answer came", async () => {
    await spendThenLeave();
    const { spend } = await open();
    await act(() => spend("daily"));
    const [sent, sentAgain] = keys();
    expect(sentAgain).toBe(sent);
  });

  it("sends the key again when the page went after the answer, before a sheet kept its ticket use", async () => {
    const { spend } = await open();
    await act(() => spend("daily"));
    const reloaded = await open();
    await act(() => reloaded.spend("daily"));
    const [landed, sentAgain] = keys();
    expect(sentAgain).toBe(landed);
  });

  it("sends a new key once a sheet has kept the ticket use", async () => {
    await spendAndKeep(await open());
    const reloaded = await open();
    await act(() => reloaded.spend("daily"));
    const [kept, next] = keys();
    expect(next).not.toBe(kept);
  });

  it("keeps it for the person who spent, not someone else signing in on the phone", async () => {
    await spendThenLeave();
    await spendAndKeep(await open(SOMEONE_ELSE));
    const yours = await open();
    await act(() => yours.spend("daily"));
    const [sent, theirKey, sentAgain] = keys();
    expect(theirKey).not.toBe(sent);
    expect(sentAgain).toBe(sent);
  });
});

/** Hands the test the tickets' value as each render leaves it. */
function Holder({ onValue }: { onValue: (value: TicketsValue) => void }) {
  const value = useTickets();
  useEffect(() => {
    onValue(value);
  });
  return null;
}

/**
 * Your tickets, loaded with `load` from a server that answers `api` too, with `alongside` on screen;
 * the latest value is `shown()`.
 */
async function openWith(
  load: ApiClient["tickets"],
  api: Partial<ApiClient> = {},
  alongside?: ReactNode,
) {
  view?.unmount();
  let latest: TicketsValue | undefined;
  view = renderWithApi(
    <>
      <Holder onValue={(value) => (latest = value)} />
      {alongside}
    </>,
    emptyApi({ tickets: load, spendTicket, ...api }),
  );
  await act(async () => {});
  const shown = () => {
    if (!latest) throw new Error("The tickets gave no value");
    return latest;
  };
  return shown;
}

/** The day after FRESH_TICKETS's, as the server answers once its day has turned. */
const NEXT_DAY: Tickets = {
  ...FRESH_TICKETS,
  ticketDay: "2026-09-27",
  nextRefillAt: "2026-09-27T15:00:00.000Z",
};
const refill = Date.parse(FRESH_TICKETS.nextRefillAt);

describe("answers that carry your tickets", () => {
  it("keeps a spend's tickets when a load sent before it answers after it", async () => {
    let answerLoad = (_: Tickets) => {};
    const load = vi
      .fn<ApiClient["tickets"]>()
      .mockResolvedValueOnce(FRESH_TICKETS)
      .mockReturnValueOnce(new Promise((resolve) => (answerLoad = resolve)));
    const spentOne = { ...SPENT, tickets: { ...FRESH_TICKETS, dailyLeft: 2 } };
    spendTicket.mockResolvedValueOnce(spentOne);
    const shown = await openWith(load);
    act(() => shown().refresh());
    await act(() => shown().spend("daily"));
    await act(async () => answerLoad(FRESH_TICKETS));
    expect(shown().tickets?.dailyLeft).toBe(2);
  });

  /** A pack the checkout paid for, whose signed payment it sends as it opens. */
  const PACK_TICKETS = 3;
  function Checkout() {
    const { buyer } = useTickets();
    useEffect(() => {
      void buyer.buyTickets({ purchaseId: 1, digest: "D".repeat(44), signature: "c2lnbmVk" });
    }, [buyer]);
    return null;
  }

  it.each(["before", "after"] as const)(
    "shows the server's tickets when a purchase sent before a spend answers after it, counted %s the spend",
    async (counted) => {
      const server = { tickets: FRESH_TICKETS };
      const addPack = () =>
        (server.tickets = {
          ...server.tickets,
          reserveLeft: server.tickets.reserveLeft + PACK_TICKETS,
        });
      spendTicket.mockImplementation(() => {
        server.tickets = { ...server.tickets, dailyLeft: server.tickets.dailyLeft - 1 };
        return Promise.resolve({ ...SPENT, tickets: server.tickets });
      });
      // The server reads Sui first, so it counts the payment before or after the spend reaches it;
      // either way the purchase's answer comes back last.
      let answerPurchase = () => {};
      const buyTickets = () =>
        new Promise<Tickets>((resolve) => {
          const answer = counted === "before" ? addPack() : null;
          answerPurchase = () => resolve(answer ?? addPack());
        });
      const shown = await openWith(
        () => Promise.resolve(server.tickets),
        { buyTickets },
        <Checkout />,
      );
      await act(() => shown().spend("daily"));
      await act(async () => {
        answerPurchase();
        await vi.advanceTimersByTimeAsync(0);
      });
      expect(shown().tickets).toEqual(server.tickets);
    },
  );
});

describe("a failed load", () => {
  it("is cleared while its retry is on the way, so a retry that fails again shows as a new failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    let failAgain = (_: unknown) => {};
    const load = vi
      .fn<ApiClient["tickets"]>()
      .mockRejectedValueOnce(NO_ANSWER)
      .mockReturnValueOnce(new Promise((_, reject) => (failAgain = reject)));
    const shown = await openWith(load);
    expect(shown().error).toBe(NO_ANSWER);

    act(() => shown().refresh());
    expect(shown().error).toBeNull();
    await act(async () => failAgain(NO_ANSWER));
    expect(shown().error).toBe(NO_ANSWER);
  });
});

describe("the refill", () => {
  it("loads again until the server's day has turned, when this phone's clock runs ahead", async () => {
    vi.setSystemTime(refill - REFILL_RETRY_MS);
    const server = { tickets: FRESH_TICKETS };
    const load = vi.fn(() => Promise.resolve(server.tickets));
    const shown = await openWith(load);
    await act(() => vi.advanceTimersByTimeAsync(REFILL_RETRY_MS * 2));
    // The server's clock hasn't reached the refill, so it still answers the ended day.
    expect(shown().tickets?.ticketDay).toBe(FRESH_TICKETS.ticketDay);
    server.tickets = NEXT_DAY;
    await act(() => vi.advanceTimersByTimeAsync(REFILL_RETRY_MAX_MS));
    expect(shown().tickets?.ticketDay).toBe(NEXT_DAY.ticketDay);
  });

  it("loads again after a reload at the refill fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.setSystemTime(refill - REFILL_RETRY_MS);
    const load = vi
      .fn<ApiClient["tickets"]>()
      .mockResolvedValueOnce(FRESH_TICKETS)
      .mockRejectedValueOnce(NO_ANSWER)
      .mockResolvedValue(NEXT_DAY);
    const shown = await openWith(load);
    // The reload at the refill fails, then the one after it lands.
    await act(() => vi.advanceTimersByTimeAsync(REFILL_RETRY_MS * 2));
    await act(() => vi.advanceTimersByTimeAsync(REFILL_RETRY_MS));
    expect(shown().tickets?.ticketDay).toBe(NEXT_DAY.ticketDay);
  });

  it("loads as the app comes back into view after the refill, since a sleeping phone holds timers back", async () => {
    vi.setSystemTime(refill - REFILL_RETRY_MS);
    const load = vi
      .fn<ApiClient["tickets"]>()
      .mockResolvedValueOnce(FRESH_TICKETS)
      .mockResolvedValue(NEXT_DAY);
    const shown = await openWith(load);
    // The clock moves on, but the refill's timer hasn't fired.
    vi.setSystemTime(refill + REFILL_RETRY_MS);
    await act(async () => void document.dispatchEvent(new Event("visibilitychange")));
    expect(shown().tickets?.ticketDay).toBe(NEXT_DAY.ticketDay);
  });
});
