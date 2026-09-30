// @vitest-environment happy-dom
import type { Me } from "@drawing-app/api/client";
import { act, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi, TEST_ME } from "../api/testing";
import type { TicketsValue } from "./ticketsContext";
import { useTickets } from "./useTickets";

type Spender = Pick<TicketsValue, "spend" | "forgetKeptSpend">;

/** The server's answer to a spend that lands. */
const SPENT = {
  ticketUse: {
    id: 7,
    ticketDay: FRESH_TICKETS.ticketDay,
    dayIndex: 0,
    kind: "daily",
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
