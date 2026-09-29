import type { Explore, Person, Sticker } from "@drawing-app/api/client";
import { TICKET_DAY_UTC_OFFSET_MS } from "../tickets/config";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The ticket day `ms` falls in, as whole days since 1970-01-01. Explore's days are ticket days, as
 * the server's are, so they turn over at midnight in Tokyo.
 */
export const ticketDayNumber = (ms: number) => Math.floor((ms + TICKET_DAY_UTC_OFFSET_MS) / DAY_MS);

/** A day's date, "YYYY-MM-DD": what seeds its layer. */
export const dayKey = (day: number) => new Date(day * DAY_MS).toISOString().slice(0, 10);

/** A day as its badge prints it: "9.26". */
export function dayBadge(day: number) {
  const date = new Date(day * DAY_MS);
  return `${date.getUTCMonth() + 1}.${date.getUTCDate()}`;
}

/** A day as it's read aloud: "September 24", "9月24日". */
export const spokenDay = (day: number, language: string) =>
  new Intl.DateTimeFormat(language, { month: "long", day: "numeric", timeZone: "UTC" }).format(
    new Date(day * DAY_MS),
  );

/** A sticker in the pile. */
export interface PileSticker {
  sticker: Sticker;
  /** Whoever it was last given to, while that gift is among Explore's activity. */
  givenTo: Person | null;
}

export interface PileDay {
  day: number;
  /** Oldest first: the order they fell in. */
  stickers: PileSticker[];
}

const sealedMs = (sticker: Sticker) => Date.parse(sticker.sealedAt);

/**
 * Every sticker Explore sent, each on the day it was sealed, newest day first. A gift doesn't move
 * a sticker: it adds who it went to.
 */
export function pileDays(explore: Explore): PileDay[] {
  const byId = new Map<string, PileSticker>();
  for (const sticker of explore.todaysStickers) byId.set(sticker.id, { sticker, givenTo: null });
  // Newest first, so the first gift met for a sticker is its latest.
  for (const entry of explore.activity) {
    const known = byId.get(entry.sticker.id);
    const pile = known ?? { sticker: entry.sticker, givenTo: null };
    if (entry.type === "received" && pile.givenTo === null) pile.givenTo = entry.receiver;
    if (!known) byId.set(entry.sticker.id, pile);
  }
  const days = new Map<number, PileSticker[]>();
  for (const pile of byId.values()) {
    const day = ticketDayNumber(sealedMs(pile.sticker));
    const stickers = days.get(day);
    if (stickers) stickers.push(pile);
    else days.set(day, [pile]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => b - a)
    .map(([day, stickers]) => ({
      day,
      stickers: stickers.sort(
        (a, b) => sealedMs(a.sticker) - sealedMs(b.sticker) || a.sticker.number - b.sticker.number,
      ),
    }));
}
