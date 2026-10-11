import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { problemOf } from "../i18n/errorMessage";
import type { JpycPayment } from "../payments/jpyc";

interface BalanceRead {
  key: string | null;
  balance: bigint | null;
  error: string | null;
  refreshing: boolean;
}

/** The open checkout's JPYC, read again when the person returns or asks for a fresh balance. */
export function useJpycBalance(
  owner: string | undefined,
  payment: JpycPayment | undefined,
): { balance: bigint | null; error: string | null; refreshing: boolean; refresh: () => void } {
  const network = payment?.network;
  const coinType = payment?.coinType;
  const key = owner && network && coinType ? JSON.stringify([owner, network, coinType]) : null;
  const [read, setRead] = useState<BalanceRead>({
    key: null,
    balance: null,
    error: null,
    refreshing: false,
  });
  const latest = useRef({ owner, payment });
  useLayoutEffect(() => {
    latest.current = { owner, payment };
  }, [owner, payment]);
  const request = useRef<() => void>(() => {});
  const refresh = useCallback(() => request.current(), []);

  useEffect(() => {
    if (!key) {
      request.current = () => {};
      return;
    }
    let live = true;
    let scheduled = false;
    let inFlight = false;
    let pending = false;

    const start = async () => {
      const { owner: requestOwner, payment: requestPayment } = latest.current;
      if (!requestOwner || !requestPayment) return;
      inFlight = true;
      setRead((previous) => ({
        key,
        balance: previous.key === key ? previous.balance : null,
        error: previous.key === key ? previous.error : null,
        refreshing: true,
      }));
      try {
        // Sui's SDK loads with the checkout's first balance request, not with the app.
        const { getJpycBalance } = await import("../payments/jpyc");
        const balance = await getJpycBalance(requestOwner, requestPayment);
        if (live) setRead({ key, balance, error: null, refreshing: true });
      } catch (error) {
        if (live) {
          console.error(`Couldn't read the JPYC balance of ${requestOwner}`, error);
          setRead((previous) => ({
            key,
            balance: previous.key === key ? previous.balance : null,
            error: problemOf(error).detail,
            refreshing: true,
          }));
        }
      } finally {
        inFlight = false;
        if (live) {
          if (pending) {
            pending = false;
            schedule();
          } else {
            setRead((previous) =>
              previous.key === key ? { ...previous, refreshing: false } : previous,
            );
          }
        }
      }
    };

    const schedule = () => {
      if (!live) return;
      if (inFlight) {
        pending = true;
        return;
      }
      if (scheduled) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (live) void start();
      });
    };
    const whenVisible = () => {
      if (document.visibilityState === "visible") schedule();
    };
    request.current = schedule;
    window.addEventListener("focus", whenVisible);
    window.addEventListener("online", whenVisible);
    document.addEventListener("visibilitychange", whenVisible);
    schedule();
    return () => {
      live = false;
      request.current = () => {};
      window.removeEventListener("focus", whenVisible);
      window.removeEventListener("online", whenVisible);
      document.removeEventListener("visibilitychange", whenVisible);
    };
  }, [key]);

  return {
    balance: read.key === key ? read.balance : null,
    error: read.key === key ? read.error : null,
    refreshing: read.key === key ? read.refreshing : false,
    refresh,
  };
}
