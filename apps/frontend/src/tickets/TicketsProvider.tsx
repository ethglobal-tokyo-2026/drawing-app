import type { TicketKind, Tickets } from "@drawing-app/api/client";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { TicketsContext } from "./ticketsContext";

/** A turnover that just passed can still read as the old day on the server for a moment. */
const REFILL_MARGIN_MS = 1_000;

/** Your tickets from the server, shared by every screen that shows or spends them. */
export function TicketsProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [tickets, setTickets] = useState<Tickets | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => setAttempt((n) => n + 1), []);

  useEffect(() => {
    let current = true;
    api.tickets().then(
      (loaded) => {
        if (!current) return;
        setTickets(loaded);
        setError(null);
      },
      (failure: unknown) => {
        const failed = apiError(failure);
        console.error("Loading your tickets failed", failed);
        if (current) setError(failed);
      },
    );
    return () => {
      current = false;
    };
  }, [api, attempt]);

  // The day's daily tickets come back at the refill, so they load again then.
  const refillAt = tickets?.nextRefillAt;
  useEffect(() => {
    if (!refillAt) return;
    const id = setTimeout(refresh, Date.parse(refillAt) - Date.now() + REFILL_MARGIN_MS);
    return () => clearTimeout(id);
  }, [refillAt, refresh]);

  const spend = useCallback(
    async (kind: TicketKind) => {
      const spent = await api.spendTicket(kind);
      setTickets(spent.tickets);
      return spent.ticketUse;
    },
    [api],
  );

  const value = useMemo(
    () => ({ tickets, error, refresh, spend, set: setTickets }),
    [tickets, error, refresh, spend],
  );
  return <TicketsContext value={value}>{children}</TicketsContext>;
}
