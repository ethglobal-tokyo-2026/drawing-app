// @vitest-environment happy-dom
import { act, useEffect } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError, type ApiClient } from "../api/apiClient";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../api/testing";
import type { TicketsValue } from "./ticketsContext";
import { useTickets } from "./useTickets";

type Spend = TicketsValue["spend"];

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

/** Hands the test the tickets' spend. */
function Spender({ onSpend }: { onSpend: (spend: Spend) => void }) {
  const { spend } = useTickets();
  useEffect(() => onSpend(spend), [onSpend, spend]);
  return null;
}

let view: ReturnType<typeof renderWithApi> | undefined;
/**
 * Your tickets, over a client whose first spends fail with `failures` and the rest land. Answers
 * their spend, and the key each spend has sent so far, in order.
 */
async function open(...failures: ApiError[]) {
  const spendTicket = vi.fn<ApiClient["spendTicket"]>(() => Promise.resolve(SPENT));
  for (const failure of failures) spendTicket.mockRejectedValueOnce(failure);
  const onSpend = vi.fn<(spend: Spend) => void>();
  view = renderWithApi(<Spender onSpend={onSpend} />, emptyApi({ spendTicket }));
  await act(async () => {});
  const spend = onSpend.mock.lastCall?.[0];
  if (!spend) throw new Error("The tickets gave no spend");
  return { spend, keys: () => spendTicket.mock.calls.map(([sent]) => sent.idempotencyKey) };
}

beforeEach(() => {
  // The refill's timer stays put, so only the spends change the tickets.
  vi.useFakeTimers();
});

afterEach(() => {
  view?.unmount();
  view = undefined;
  vi.useRealTimers();
});

describe("spending a ticket", () => {
  it("sends a failed spend's key again when it's retried, and a new key for the next drawing", async () => {
    const { spend, keys } = await open(NO_ANSWER);
    await expect(act(() => spend("daily"))).rejects.toBe(NO_ANSWER);
    await act(() => spend("daily"));
    await act(() => spend("daily"));
    const [tried, retried, nextDrawing] = keys();
    expect(retried).toBe(tried);
    expect(nextDrawing).not.toBe(tried);
  });

  it("sends a second tap with the key of the spend still on its way", async () => {
    const { spend, keys } = await open();
    await act(() => Promise.all([spend("daily"), spend("daily")]));
    const [first, second] = keys();
    expect(first).toEqual(expect.any(String));
    expect(second).toBe(first);
  });
});
