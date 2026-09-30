import type { TicketKind, Tickets, TicketUse } from "@drawing-app/api/client";
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { apiError, type ApiError, type ErrorCode } from "../api/apiClient";
import { newIdempotencyKey } from "../api/idempotencyKey";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { forgetSpendKey, keepSpend, keptSpend, type KeptSpend } from "./spendKey";
import { TicketsContext, type Sheet, type TicketBuyer } from "./ticketsContext";

/** A turnover that just passed can still read as the old day on the server for a moment. */
const REFILL_MARGIN_MS = 1_000;
/**
 * How soon the tickets load again while the day on screen has ended by this phone's clock but its
 * reload brought no new day: the clock runs ahead of the server's, or the reload failed. Each miss
 * doubles it, up to REFILL_RETRY_MAX_MS.
 */
export const REFILL_RETRY_MS = 5_000;
export const REFILL_RETRY_MAX_MS = 5 * 60_000;

/** The spend's refusals, which the server answers only once no ticket use was spent with the key. */
const SPEND_REFUSALS: readonly ErrorCode[] = ["no_tickets_left", "ticket_kind_changed"];

/** Your tickets from the server, shared by every screen that shows or spends them. */
export function TicketsProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const { id: userId } = useMe();
  const [tickets, setTickets] = useState<Tickets | null>(null);
  const [error, setError] = useState<ApiError | null>(null);
  const [attempt, setAttempt] = useState(0);
  const refresh = useCallback(() => {
    // A load on its way isn't a failed one, so a retry that fails again shows as a new failure.
    setError(null);
    setAttempt((n) => n + 1);
  }, []);

  // Answers show in the order their requests went out, so a load that answers after a spend it
  // went out before can't put the spent ticket back.
  const sent = useRef(0);
  const shown = useRef(0);
  /** Shows `answer` unless a later request's is on screen; whether it did. */
  const show = useCallback((request: number, answer: Tickets) => {
    if (request < shown.current) return false;
    shown.current = request;
    setTickets(answer);
    return true;
  }, []);

  useEffect(() => {
    let current = true;
    const request = ++sent.current;
    api.tickets().then(
      (loaded) => {
        if (!current) return;
        show(request, loaded);
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
  }, [api, attempt, show]);

  // The day's daily tickets come back at the refill, so they load again then, and again, less often
  // each time, until a load brings the new day. A sleeping phone holds its timers back, so they load
  // too when the app comes back into view after the refill.
  const refillAt = tickets?.nextRefillAt;
  const misses = useRef(0);
  useEffect(() => {
    if (!refillAt) return;
    const due = Date.parse(refillAt) + REFILL_MARGIN_MS;
    let wait = due - Date.now();
    if (wait > 0) misses.current = 0;
    else {
      wait = Math.min(REFILL_RETRY_MS * 2 ** misses.current, REFILL_RETRY_MAX_MS);
      misses.current += 1;
    }
    const timer = setTimeout(refresh, wait);
    const onShown = () => {
      if (document.visibilityState === "visible" && Date.now() >= due) refresh();
    };
    document.addEventListener("visibilitychange", onShown);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onShown);
    };
  }, [refillAt, refresh, attempt]);

  // Kept in memory and on this device until the drawing screen has kept the ticket use with its
  // sheet, so a retry, a second tap or the first spend after a reload, even one right after the
  // answer came, sends the same key. Sending a kept key is always right: the server answers the ticket
  // use it already spent, or spends a ticket if that try never reached it. A refusal is kept with it,
  // since the server spent nothing with the key, until a spend sends it again.
  const spendKey = useRef<KeptSpend | null>(null);
  const keepSpendKey = useCallback(
    (kept: KeptSpend) => {
      spendKey.current = kept;
      keepSpend(userId, kept);
    },
    [userId],
  );
  const spend = useCallback(
    async (kind: TicketKind) => {
      const key = (spendKey.current ?? keptSpend(userId))?.key ?? newIdempotencyKey();
      keepSpendKey({ key, refused: false });
      const request = ++sent.current;
      try {
        const spent = await api.spendTicket({ kind, idempotencyKey: key });
        show(request, spent.tickets);
        return spent.ticketUse;
      } catch (failure) {
        const refused = SPEND_REFUSALS.some((code) => code === apiError(failure).code);
        if (refused) keepSpendKey({ key, refused });
        throw failure;
      }
    },
    [api, userId, show, keepSpendKey],
  );
  const hasKeptSpend = useCallback(() => {
    const kept = spendKey.current ?? keptSpend(userId);
    return kept !== null && !kept.refused;
  }, [userId]);
  const forgetKeptSpend = useCallback(() => {
    const kept = spendKey.current;
    spendKey.current = null;
    if (kept !== null) forgetSpendKey(userId, kept.key);
  }, [userId]);

  // A purchase's requests are numbered as they go out too. The server reads Sui before it adds the
  // tickets, so a purchase's answer older than the tickets on screen may still be the only one with
  // them: they load again.
  const buyer = useMemo<TicketBuyer>(
    () => ({
      buyTickets: async (purchase) => {
        const request = ++sent.current;
        const bought = await api.buyTickets(purchase);
        if (!show(request, bought)) refresh();
        return bought;
      },
      tickets: async () => {
        const request = ++sent.current;
        const loaded = await api.tickets();
        show(request, loaded);
        return loaded;
      },
    }),
    [api, show, refresh],
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
      hasKeptSpend,
      forgetKeptSpend,
      buyer,
      sheet,
      setSheet,
      spendForSheet,
      hasSheetSpend,
      takeSheetSpend,
    }),
    [
      tickets,
      error,
      refresh,
      spend,
      hasKeptSpend,
      forgetKeptSpend,
      buyer,
      sheet,
      spendForSheet,
      hasSheetSpend,
      takeSheetSpend,
    ],
  );
  return <TicketsContext value={value}>{children}</TicketsContext>;
}
