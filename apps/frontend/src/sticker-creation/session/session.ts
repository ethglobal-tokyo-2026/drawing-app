import { KYOTO_SEIKA_TIME_USED_S, MAX_TIME_USED_S } from "@drawing-app/api/client";

/**
 * How long a sheet gets on the drawing clock, by its ticket's mode: Kyoto Seika Manga Expression
 * Practice Mode's or not. The server refuses a seal that used more.
 */
export const sessionMs = (kyotoSeika: boolean) =>
  (kyotoSeika ? KYOTO_SEIKA_TIME_USED_S : MAX_TIME_USED_S) * 1000;

type Phase =
  /** A fresh sheet: it asks before a ticket is spent, and takes no ink yet. */
  | "blank"
  /** A ticket spent in Kyoto Seika Practice Mode: no ink or tools until Begin locks the pair in. */
  | "dealt"
  /** Start spent a regular ticket; the clock waits for the first stroke. */
  | "primed"
  /** The first stroke or fill started the clock. */
  | "drawing"
  /** The seal key opened the seal sheet over the drawing, which takes no ink while it's up. */
  | "seal-sheet"
  /** 0:00, pencils down: the time's-up sheet is up, and nothing seals until its Seal. */
  | "time-up"
  /** Building the sticker. */
  | "sealing"
  /** Done: the sticker is sealed. */
  | "sealed"
  /** A seal failed where the sheet mustn't change: time is up, or the server may hold the seal. */
  | "retry";

export interface Session {
  phase: Phase;
}

export const FRESH_SESSION: Session = { phase: "blank" };

export type SessionEvent =
  /** A ticket was spent on this sheet, or carried over to it, in Kyoto Seika Practice Mode or not. */
  | { type: "start"; kyotoSeika: boolean }
  /**
   * Begin locked the pair in: the clock starts at once, as a proctor's 始め does. `hasPair`: the pair
   * is dealt; a sheet begun without one could never seal.
   */
  | { type: "begin"; hasPair: boolean }
  /** A stroke or fill landed on the sheet. */
  | { type: "ink" }
  /**
   * A session kept across a reload is back, its ticket spent before the reload: drawn on, or only
   * started, with the clock still waiting for the first stroke. One read late comes back onto the
   * sheet its ticket carried over to, before anything is drawn there. `sealSent`: its seal had gone
   * out with no answer, so the server may hold it. `dealt`: a sheet in Kyoto Seika Practice Mode still
   * waiting for Begin. `timeUp`: its clock had reached 0:00.
   */
  | { type: "restored"; drawn: boolean; sealSent: boolean; dealt: boolean; timeUp: boolean }
  /** The seal key: it opens the seal sheet, or tries a seal again. */
  | { type: "seal-tap"; hasInk: boolean }
  /** The seal sheet's Seal. */
  | { type: "seal" }
  /** The seal sheet closed back to drawing: Not yet, Escape, Back or its perforation. */
  | { type: "not-yet" }
  | { type: "time-up" }
  | { type: "sealed" }
  /**
   * `mayHaveSealed`: the request may have reached the server, which then holds the seal whatever
   * the sheet does next. `timeUp`: the clock had run out. `refused`: the server refused the seal
   * itself, as it would the same seal sent again.
   */
  | { type: "seal-failed"; mayHaveSealed: boolean; timeUp: boolean; refused: boolean }
  | { type: "reset" };

/** What the drawing screen does on a transition, besides showing the new phase. */
export type SessionEffect =
  /** Keep the new session on this device, with its ticket. */
  | "keep-session"
  | "start-clock"
  /** Keep the pair as begun; the balloons tuck into the corner print. */
  | "lock-subjects"
  /** Stop the clock and build the sticker. */
  | "seal"
  | "resume-clock"
  /** Clear the sheet and set the clock back to its full length. */
  | "reset-sheet";

type Result = { session: Session; effects: SessionEffect[] };

const to = (phase: Phase, effects: SessionEffect[] = []): Result => ({
  session: { phase },
  effects,
});

export function transition(session: Session, event: SessionEvent): Result {
  const { phase } = session;
  const unchanged = { session, effects: [] };
  switch (event.type) {
    case "start":
      return phase === "blank"
        ? to(event.kyotoSeika ? "dealt" : "primed", ["keep-session"])
        : unchanged;
    case "begin":
      return phase === "dealt" && event.hasPair
        ? to("drawing", ["start-clock", "lock-subjects"])
        : unchanged;
    case "ink":
      return phase === "primed" ? to("drawing", ["start-clock"]) : unchanged;
    case "restored":
      if (phase !== "blank" && phase !== "primed" && phase !== "dealt") return unchanged;
      if (event.sealSent) return to("retry");
      if (event.drawn) return to(event.timeUp ? "time-up" : "drawing");
      return to(event.dealt ? "dealt" : "primed");
    case "seal-tap":
      // The sheet and its mark can't change any more, so the seal goes again as it was.
      if (phase === "retry") return to("sealing", ["seal"]);
      return phase === "drawing" && event.hasInk ? to("seal-sheet") : unchanged;
    case "seal":
      return phase === "seal-sheet" || phase === "time-up" ? to("sealing", ["seal"]) : unchanged;
    case "not-yet":
      return phase === "seal-sheet" ? to("drawing") : unchanged;
    case "time-up":
      return phase === "drawing" || phase === "seal-sheet" ? to("time-up") : unchanged;
    case "sealed":
      return phase === "sealing" ? to("sealed") : unchanged;
    case "seal-failed":
      if (phase !== "sealing") return unchanged;
      // Ink drawn after the server took the seal would never reach the sticker.
      if (event.mayHaveSealed) return to("retry");
      if (!event.timeUp) return to("drawing", ["resume-clock"]);
      // At 0:00 the sheet takes no more ink, so a refused seal can't change: the sheet is spent.
      return event.refused ? to("blank", ["reset-sheet"]) : to("retry");
    case "reset":
      return to("blank", ["reset-sheet"]);
  }
}
