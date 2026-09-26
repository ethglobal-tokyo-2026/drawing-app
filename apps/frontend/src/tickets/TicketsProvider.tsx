import type { TicketKind, Tickets, TicketUse } from "@drawing-app/api/client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiError, type ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { TicketsContext, type Sheet } from "./ticketsContext";

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

  const [sheet, setSheet] = useState<Sheet>(null);
  const sheetSpend = useRef<Promise<TicketUse> | null>(null);
  const spendForSheet = useCallback(
    (kind: TicketKind) => {
      const spent = spend(kind);
      // The drawing screen says what became of it once it takes it.
      spent.catch(() => {});
      sheetSpend.current = spent;
    },
    [spend],
  );
  const hasSheetSpend = useCallback(() => sheetSpend.current !== null, []);
  const takeSheetSpend = useCallback(() => {
    const spent = sheetSpend.current;
    sheetSpend.current = null;
    return spent;
  }, []);

  const value = useMemo(
    () => ({
      tickets,
      error,
      refresh,
      spend,
      set: setTickets,
      sheet,
      setSheet,
      spendForSheet,
      hasSheetSpend,
      takeSheetSpend,
    }),
    [tickets, error, refresh, spend, sheet, spendForSheet, hasSheetSpend, takeSheetSpend],
  );
  return <TicketsContext value={value}>{children}</TicketsContext>;
}
