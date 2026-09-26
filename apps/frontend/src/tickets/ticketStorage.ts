import type { TicketState, TicketUse } from "./tickets";

const KEY = "draw.tickets";

const isCount = (v: unknown): v is number => Number.isInteger(v) && typeof v === "number" && v >= 0;
const isDay = (v: unknown): v is string => typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v);

function parseUse(v: unknown): TicketUse | null {
  if (typeof v !== "object" || v === null) return null;
  if (!("stickerId" in v) || v.stickerId === undefined) return {};
  return typeof v.stickerId === "string" ? { stickerId: v.stickerId } : null;
}

/** Checks a stored ticket state. Null when it can't be trusted. */
export function parseStoredTickets(raw: unknown): TicketState | null {
  if (typeof raw !== "object" || raw === null) return null;
  if (!("day" in raw) || !isDay(raw.day) || !("reserve" in raw) || !isCount(raw.reserve))
    return null;
  if (!("uses" in raw) || !Array.isArray(raw.uses)) return null;
  const stored: unknown[] = raw.uses;
  const uses = stored.map(parseUse);
  return uses.every((u): u is TicketUse => u !== null)
    ? { day: raw.day, uses, reserve: raw.reserve }
    : null;
}

// Tickets live in localStorage. When it's blocked, they're kept in memory so
// they still last until the app closes.
let memory: TicketState | null = null;
let cache: { raw: string | null; state: TicketState | null } | undefined;
let blockedReported = false;
const listeners = new Set<() => void>();

function reportBlocked(error: unknown) {
  if (blockedReported) return;
  blockedReported = true;
  console.error("Tickets can't be saved on this device; they last until the app closes.", error);
}

function parseRaw(raw: string): TicketState | null {
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    value = undefined;
  }
  const state = parseStoredTickets(value);
  if (!state) console.error("Stored tickets are unreadable, so today's tickets start fresh:", raw);
  return state;
}

/** The stored tickets, as last saved: not yet rolled over to the current ticket day. */
export function readTickets(): TicketState | null {
  let raw: string | null;
  try {
    raw = localStorage.getItem(KEY);
  } catch (error) {
    reportBlocked(error);
    return memory;
  }
  // The same stored text gives back the same object, as useSyncExternalStore needs.
  if (cache?.raw !== raw) cache = { raw, state: raw === null ? null : parseRaw(raw) };
  return cache.state;
}

export function writeTickets(state: TicketState): void {
  memory = state;
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch (error) {
    reportBlocked(error);
  }
  for (const onChange of listeners) onChange();
}

/** Calls back when tickets change here or in another tab. */
export function subscribeTickets(onChange: () => void): () => void {
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) onChange();
  };
  listeners.add(onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onStorage);
  };
}
