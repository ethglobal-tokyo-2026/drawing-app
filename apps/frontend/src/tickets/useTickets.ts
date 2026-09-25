import { useCallback, useEffect, useState } from "react";
import { addPaid, consume, current, nextRefill, ticketsLeft, type TicketState } from "./tickets";

const KEY = "draw.tickets";

const isTicketState = (v: unknown): v is TicketState =>
  typeof v === "object" &&
  v !== null &&
  "day" in v &&
  typeof v.day === "string" &&
  "usedFree" in v &&
  typeof v.usedFree === "number" &&
  "paid" in v &&
  typeof v.paid === "number";

function load(): TicketState {
  let saved: unknown = null;
  try {
    saved = JSON.parse(localStorage.getItem(KEY) ?? "null");
  } catch {
    // Blocked or corrupt storage: start fresh.
  }
  return current(isTicketState(saved) ? saved : null, new Date());
}

function save(state: TicketState) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // Storage unavailable: tickets last for this session only.
  }
}

export function useTickets() {
  const [state, setState] = useState(load);

  // Pick up the 4:00 refill while the app stays open.
  useEffect(() => {
    const id = setInterval(() => setState((s) => current(s, new Date())), 30_000);
    return () => clearInterval(id);
  }, []);

  /** Spends a ticket; false when there are none left. */
  const use = useCallback((): boolean => {
    const next = consume(current(load(), new Date()));
    if (!next) return false;
    save(next);
    setState(next);
    return true;
  }, []);

  const add = useCallback((n: number) => {
    const next = addPaid(current(load(), new Date()), n);
    save(next);
    setState(next);
  }, []);

  return { left: ticketsLeft(state), refillAt: nextRefill(new Date()), use, add };
}
