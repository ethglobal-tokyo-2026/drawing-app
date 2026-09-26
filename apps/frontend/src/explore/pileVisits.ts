import type { PileDay } from "./pileDays";

/** What Explore's sticker pile remembers on this device: the newest sticker each person has seen. */
const SEEN_KEY = "explore.pile.seen";

/** At most this many stickers fall at once; any others are already in the pile. */
export const FALL_MAX = 14;

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (error) {
    console.error(`Explore's sticker pile can't read ${key} on this device`, error);
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch (error) {
    console.error(`Explore's sticker pile can't save ${key} on this device`, error);
  }
}

/** When the newest sticker `meId` has seen in the pile was sealed, or null before their first look. */
export function lastSeen(meId: string): number | null {
  const raw = read(`${SEEN_KEY}.${meId}`);
  if (raw === null) return null;
  const ms = Number(raw);
  if (Number.isFinite(ms)) return ms;
  console.error("The sticker pile's last look is unreadable, so it counts as the first:", raw);
  return null;
}

/** Remembers that `meId` has seen every sticker sealed up to `ms`. */
export function markSeen(meId: string, ms: number) {
  write(`${SEEN_KEY}.${meId}`, String(ms));
}

export interface Arrivals {
  /** Stickers sealed since the last look: each wears a NEW pip. None on a first look. */
  fresh: ReadonlySet<string>;
  /** The ones that fall onto today's heap, oldest first. */
  falling: readonly string[];
  /** When the newest sticker in the pile was sealed. */
  newest: number | null;
}

/**
 * What arrives as the pile opens. On a first look, today's newest stickers fall in. After that,
 * only today's stickers sealed since the last look fall, so the hundredth visit costs nothing.
 */
export function arrivalsOf(days: readonly PileDay[], today: number, seen: number | null): Arrivals {
  const sealed = (id: { sticker: { sealedAt: string } }) => Date.parse(id.sticker.sealedAt);
  const fresh = new Set<string>();
  let newest: number | null = null;
  for (const { stickers } of days) {
    for (const pile of stickers) {
      const at = sealed(pile);
      newest = newest === null ? at : Math.max(newest, at);
      if (seen !== null && at > seen) fresh.add(pile.sticker.id);
    }
  }
  const todays = days.find(({ day }) => day === today)?.stickers ?? [];
  const falling = todays
    .filter((pile) => seen === null || fresh.has(pile.sticker.id))
    .slice(-FALL_MAX)
    .map((pile) => pile.sticker.id);
  return { fresh, falling, newest };
}
