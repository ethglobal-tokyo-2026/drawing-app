import { useEffect, useState } from "react";
import { getSticker } from "../stickers/stickerStorage";
import type { TicketStub } from "./TicketStubs";
import { dailyTickets, type TicketState } from "./tickets";

// A sealed sticker never changes, so its outline is read once per session.
const outlines = new Map<string, Promise<string | undefined>>();

function loadOutline(stickerId: string): Promise<string | undefined> {
  let outline = outlines.get(stickerId);
  if (!outline) {
    outline = getSticker(stickerId).then(
      (sticker) => sticker?.outline,
      (error: unknown) => {
        console.error(`Couldn't read the outline of sticker ${stickerId}`, error);
        outlines.delete(stickerId);
        return undefined;
      },
    );
    outlines.set(stickerId, outline);
  }
  return outline;
}

/**
 * The day's free tickets as stubs. A used one carries the cut outline of the sticker it became once
 * that's been read; a drawing that was abandoned, or a sticker sealed before outlines were kept, has none.
 */
export function useDailyTicketStubs(state: TicketState): TicketStub[] {
  const tickets = dailyTickets(state);
  const ids = tickets.flatMap((t) => (t.used && t.stickerId !== undefined ? [t.stickerId] : []));
  const idsKey = ids.join(" ");
  const [read, setRead] = useState<ReadonlyMap<string, string>>(() => new Map());

  useEffect(() => {
    let current = true;
    const wanted = idsKey ? idsKey.split(" ") : [];
    void Promise.all(wanted.map(async (id) => [id, await loadOutline(id)] as const)).then(
      (pairs) => {
        if (!current) return;
        setRead(new Map(pairs.flatMap(([id, outline]) => (outline ? [[id, outline]] : []))));
      },
    );
    return () => {
      current = false;
    };
  }, [idsKey]);

  return tickets.map((t) =>
    t.used
      ? { used: true, outline: t.stickerId === undefined ? undefined : read.get(t.stickerId) }
      : { used: false },
  );
}
