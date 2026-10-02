import { TOKYO_UTC_OFFSET_MS, type PileSticker, type Sticker } from "@drawing-app/api/client";

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The ticket day `ms` falls in, as whole days since 1970-01-01. Explore's days are ticket days, as
 * the server's are, so they turn over at midnight in Tokyo.
 */
export const ticketDayNumber = (ms: number) => Math.floor((ms + TOKYO_UTC_OFFSET_MS) / DAY_MS);

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

export interface PileDay {
  day: number;
  /** Oldest first: the order they fell in. */
  stickers: PileSticker[];
}

const sealedMs = (sticker: Sticker) => Date.parse(sticker.sealedAt);

/**
 * Stickers, each on the day it was sealed, newest day first. A gift doesn't move a sticker: it adds
 * who it went to.
 */
export function pileDays(stickers: readonly PileSticker[]): PileDay[] {
  const days = new Map<number, PileSticker[]>();
  for (const pile of stickers) {
    const day = ticketDayNumber(sealedMs(pile.sticker));
    const piled = days.get(day);
    if (piled) piled.push(pile);
    else days.set(day, [pile]);
  }
  return [...days.entries()]
    .sort(([a], [b]) => b - a)
    .map(([day, piled]) => ({
      day,
      stickers: piled.sort(
        (a, b) => sealedMs(a.sticker) - sealedMs(b.sticker) || a.sticker.number - b.sticker.number,
      ),
    }));
}
