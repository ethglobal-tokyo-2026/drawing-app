import type { Tickets } from "@drawing-app/api/client";
import { useEffect, useEffectEvent, useRef, useState } from "react";
import {
  loadKeptSession,
  LOAD_TIMEOUT_MS,
  type KeptDrawing,
  type KeptKyotoSeika,
  type KeptSession,
  type SessionKeeper,
} from "./keptSession";
import { forgetSentSeal, sealWentOut, sentSealOutcome } from "./sentSeal";

/** What became of a session kept across a reload, as the timer's note says it. */
export type PickedUp = "restored" | "lost" | "carried" | "sealed";

interface Options {
  userId: string;
  /** Null until they first load. They say what became of a seal that went out before the reload. */
  tickets: Tickets | null;
  keeper: SessionKeeper;
  /** Puts a kept drawing back on the sheet. */
  putBack: (found: Extract<KeptDrawing, { status: "found" }>) => void;
  /** Gives the ticket of a drawing that can't be put back to a fresh sheet. */
  carryOver: (ticketUseId: number, clear: boolean, kyotoSeika: KeptKyotoSeika | null) => void;
  /** Whether the sheet on `ticketUseId` still waits for its first stroke, so a late read can go on it. */
  primedOn: (ticketUseId: number | null) => boolean;
}

/**
 * Picks a session kept across a reload back up: a drawing on it comes back without asking for another
 * ticket, and one that can't be read gives its ticket to a fresh sheet. `restoring` holds Draw's ask
 * until the session is back or known lost; `sealUnsettled`, the sheet, while its sent seal waits.
 */
export function usePickUpKeptSession({
  userId,
  tickets,
  keeper,
  putBack,
  carryOver,
  primedOn,
}: Options) {
  // Until a session kept across a reload is back, or known lost, Draw doesn't ask for a ticket.
  const [restoring, setRestoring] = useState(true);
  const [pickedUp, setPickedUp] = useState<PickedUp | null>(null);

  // A drawing not read whose seal went out: the server may hold the seal, so a new drawing on its
  // ticket could be answered with the old sticker. The sheet stays locked until the drawing is read
  // or the tickets show what became of the seal. `reading`: a late read may still bring the drawing.
  const unsettled = useRef<{
    ticket: number;
    reading: boolean;
    clear: boolean;
    kyotoSeika: KeptKyotoSeika | null;
  } | null>(null);
  const [sealUnsettled, setSealUnsettled] = useState(false);
  const unsettle = (next: typeof unsettled.current) => {
    unsettled.current = next;
    setSealUnsettled(next !== null);
  };
  const lateReadDeadline = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(lateReadDeadline.current), []);

  const settleSentSeal = useEffectEvent((loaded: Tickets) => {
    const waiting = unsettled.current;
    if (!waiting) return;
    const outcome = sentSealOutcome(waiting.ticket, loaded);
    if (outcome === null && waiting.reading) return;
    unsettle(null);
    setRestoring(false);
    forgetSentSeal(userId);
    if (outcome === "unsealed") {
      carryOver(waiting.ticket, waiting.clear, waiting.kyotoSeika);
      return;
    }
    // Sealed, the sticker is on the board. Not one of today's uses, the tickets can't say whether it
    // was, and a ticket carried over could seal the next drawing as the old sticker: it's dropped.
    keeper.wipe();
    if (outcome === null)
      console.error(
        `Ticket use ${waiting.ticket}'s seal went out before a reload and the drawing can't be read, so its ticket is dropped`,
      );
    setPickedUp(outcome === "sealed" ? "sealed" : "lost");
  });
  const stopWaitingOnRead = useEffectEvent((sentTicket: number) => {
    const waiting = unsettled.current;
    if (!waiting?.reading || waiting.ticket !== sentTicket) return;
    console.error(
      `Ticket use ${sentTicket}'s drawing still hasn't been read, so the tickets say what became of its seal`,
    );
    unsettle({ ...waiting, reading: false });
    if (tickets) settleSentSeal(tickets);
  });
  // A session kept across a reload comes back without asking for another ticket, a drawing on it
  // paused; one that can't be read gives its ticket back.
  const pickUp = useEffectEvent((kept: KeptSession) => {
    const notRead = kept.status === "unread" || kept.status === "lost";
    if (notRead && kept.ticket !== null && sealWentOut(userId, kept.ticket)) {
      console.error(
        "The drawing in progress wasn't read after a reload, and its seal had gone out, so its sheet waits for the drawing or the tickets",
        kept.error,
      );
      const reading = kept.status === "unread" && kept.later !== null;
      unsettle({
        ticket: kept.ticket,
        reading,
        clear: kept.status === "lost",
        kyotoSeika: kept.kyotoSeika,
      });
      if (tickets) settleSentSeal(tickets);
      // A read that never answers mustn't hold the sheet for good: past a second wait, the tickets say.
      if (reading) {
        const sentTicket = kept.ticket;
        lateReadDeadline.current = setTimeout(() => stopWaitingOnRead(sentTicket), LOAD_TIMEOUT_MS);
      }
      return;
    }
    setRestoring(false);
    if (kept.status === "none") return;
    if (kept.status === "found") {
      putBack(kept);
      return;
    }
    if (kept.status === "unread") {
      console.error(
        "The drawing in progress wasn't read after a reload, so its ticket carries over and it stays kept",
        kept.error,
      );
      carryOver(kept.ticket, false, kept.kyotoSeika);
      return;
    }
    console.error("The drawing in progress couldn't be picked up after a reload", kept.error);
    if (kept.ticket !== null) {
      carryOver(kept.ticket, true, kept.kyotoSeika);
      return;
    }
    keeper.wipe();
    setPickedUp("lost");
  });
  useEffect(() => {
    if (!tickets) return;
    // Settled once this render is on screen, as the drawing screen spends a ticket at once.
    let cancelled = false;
    void Promise.resolve().then(() => {
      if (!cancelled) settleSentSeal(tickets);
    });
    return () => {
      cancelled = true;
    };
  }, [tickets]);
  // A read that answers late still puts the drawing back, while the sheet its ticket carried over to
  // has nothing drawn on it, or while its sent seal waits on it.
  const pickUpLate = useEffectEvent((late: KeptDrawing) => {
    const waiting = unsettled.current;
    if (waiting && late.ticket === waiting.ticket) {
      if (late.status === "found") {
        unsettle(null);
        setRestoring(false);
        // It comes back locked, for the seal key, since its seal went out.
        putBack(late);
        return;
      }
      console.error(
        "The drawing in progress couldn't be read, so the tickets say what became of its seal",
        late.error,
      );
      unsettle({ ...waiting, reading: false, clear: late.status === "lost" });
      if (tickets) settleSentSeal(tickets);
      return;
    }
    if (!primedOn(late.ticket)) {
      console.warn("The drawing in progress was read after its sheet moved on, so it's dropped");
      return;
    }
    if (late.status === "found") putBack(late);
    else if (late.status === "lost") {
      console.error("The drawing in progress can't be picked up", late.error);
      keeper.start(late.ticket, late.kyotoSeika);
    } else console.error("The drawing in progress couldn't be read", late.error);
  });
  useEffect(() => {
    let cancelled = false;
    void loadKeptSession(userId).then((kept) => {
      if (cancelled) return;
      pickUp(kept);
      if (kept.status === "unread")
        void kept.later?.then((late) => {
          if (!cancelled) pickUpLate(late);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  return { restoring, pickedUp, setPickedUp, sealUnsettled };
}
