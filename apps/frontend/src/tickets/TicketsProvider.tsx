import type { TicketKind, Tickets, TicketUse } from "@drawing-app/api/client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiError, type ApiError } from "../api/apiClient";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { forgetSpendKey, spendKeyFor } from "./spendKey";
import { TicketsContext, type Sheet } from "./ticketsContext";

/** A turnover that just passed can still read as the old day on the server for a moment. */
const REFILL_MARGIN_MS = 1_000;

/** Your tickets from the server, shared by every screen that shows or spends them. */
export function TicketsProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { id: userId } = useMe();
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
    const wait = Date.parse(refillAt) - Date.now() + REFILL_MARGIN_MS;
    const id = setTimeout(refresh, Math.max(0, wait));
    return () => clearTimeout(id);
  }, [refillAt, refresh]);

  // Kept until a spend lands, in memory and on this device, so a retry, a second tap or the first
  // spend after a reload sends the same key. Sending a kept key is always right: the server answers
  // the ticket use it already spent, or spends a ticket if that try never reached it.
  const spendKey = useRef<string | null>(null);
  const spend = useCallback(
    async (kind: TicketKind) => {
      const idempotencyKey = (spendKey.current ??= spendKeyFor(userId));
      const spent = await api.spendTicket({ kind, idempotencyKey });
      if (spendKey.current === idempotencyKey) spendKey.current = null;
      forgetSpendKey(userId, idempotencyKey);
      setTickets(spent.tickets);
      return spent.ticketUse;
    },
    [api, userId],
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
