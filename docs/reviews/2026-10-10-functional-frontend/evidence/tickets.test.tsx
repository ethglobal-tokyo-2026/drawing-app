import { act, useLayoutEffect } from "react";
import { afterEach, expect, it, vi } from "vitest";
import { emptyApi, FRESH_TICKETS, renderWithApi } from "../../../../apps/frontend/src/api/testing";
import { useTickets } from "../../../../apps/frontend/src/tickets/useTickets";

let view: ReturnType<typeof renderWithApi>;
let shown: ReturnType<typeof useTickets>;
function Probe() {
  const current = useTickets();
  useLayoutEffect(() => {
    shown = current;
  });
  return null;
}
afterEach(() => {
  view?.unmount();
  vi.useRealTimers();
  localStorage.clear();
});
it("reproduces stale tickets when a newer read finishes before a spend", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-26T00:00:00.000Z"));
  let finishSpend!: (value: unknown) => void;
  const tickets = vi.fn().mockResolvedValue(FRESH_TICKETS);
  const spendTicket = vi.fn().mockImplementation(
    () =>
      new Promise((resolve) => {
        finishSpend = resolve;
      }),
  );
  view = renderWithApi(<Probe />, emptyApi({ tickets, spendTicket }));
  await act(async () => {});
  let spending!: Promise<unknown>;
  act(() => {
    spending = shown.spend("daily");
  });
  act(() => {
    shown.refresh();
  });
  await act(async () => {});
  await act(async () => {
    finishSpend({
      ticketUse: {
        id: 7,
        ticketDay: FRESH_TICKETS.ticketDay,
        dayIndex: 0,
        kind: "daily",
        kyotoSeikaPractice: false,
        spentAt: "2026-09-26T00:00:00.000Z",
      },
      tickets: { ...FRESH_TICKETS, dailyLeft: 2 },
    });
    await spending;
  });
  expect(shown.tickets?.dailyLeft).toBe(3);
  expect(tickets).toHaveBeenCalledTimes(2);
});
