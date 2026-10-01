import { MAX_TIME_USED_S } from "@drawing-app/api/client";
import { ApiError, type ErrorCode } from "../../api/apiClient";

/** How long a sticker gets on the drawing clock; the server refuses a seal that used more. */
export const SESSION_MS = MAX_TIME_USED_S * 1000;
/** After the first tap on the seal key, a second tap within this long seals. */
export const ARM_WINDOW_MS = 2_500;

/**
 * blank: a fresh sheet asks before a ticket is spent; the sheet takes no ink yet.
 * primed: Start spent a ticket; the clock waits at 3:00 for the first stroke.
 * drawing: the first stroke or fill started the clock.
 * armed: the seal key took its first tap. sealing: building the sticker. sealed: done.
 * retry: a seal failed where the sheet mustn't take ink again, since time is up or the server may
 * already hold the seal: the sheet stays locked, and the seal key only tries the seal again. A seal
 * the server refuses at 0:00 gives way to a fresh sheet instead.
 */
type Phase = "blank" | "primed" | "drawing" | "armed" | "sealing" | "sealed" | "retry";

export interface Session {
  phase: Phase;
  /** When the seal key was armed, in ms. */
  armedAt: number;
}

export const FRESH_SESSION: Session = { phase: "blank", armedAt: 0 };

export type SessionEvent =
  /** A ticket was spent on this sheet, or carried over to it. */
  | { type: "start" }
  /** A stroke or fill landed on the sheet. */
  | { type: "ink" }
  /**
   * A session kept across a reload is back, its ticket spent before the reload: drawn on, or only
   * started, with the clock still waiting for the first stroke. One read late comes back onto the
   * sheet its ticket carried over to, before anything is drawn there. `sealSent`: its seal had gone
   * out with no answer, so the server may hold it.
   */
  | { type: "restored"; drawn: boolean; sealSent: boolean }
  | { type: "seal-tap"; now: number; hasInk: boolean }
  | { type: "arm-expired"; now: number }
  | { type: "canvas-touch" }
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
  /** Stop the clock and build the sticker. */
  | "seal"
  | "resume-clock"
  /** Clear the sheet and set the clock back to 3:00. */
  | "reset-sheet";

type Result = { session: Session; effects: SessionEffect[] };

const to = (phase: Phase, effects: SessionEffect[] = [], armedAt = 0): Result => ({
  session: { phase, armedAt },
  effects,
});

export function transition(session: Session, event: SessionEvent): Result {
  const { phase } = session;
  const unchanged = { session, effects: [] };
  switch (event.type) {
    case "start":
      return phase === "blank" ? to("primed", ["keep-session"]) : unchanged;
    case "ink":
      return phase === "primed" ? to("drawing", ["start-clock"]) : unchanged;
    case "restored":
      if (phase !== "blank" && phase !== "primed") return unchanged;
      return to(event.sealSent ? "retry" : event.drawn ? "drawing" : "primed");
    case "seal-tap":
      // The sheet can't change any more, so there's no second tap to wait for.
      if (phase === "retry") return to("sealing", ["seal"]);
      if (phase === "armed" && event.now - session.armedAt < ARM_WINDOW_MS)
        return to("sealing", ["seal"]);
      if ((phase === "drawing" || phase === "armed") && event.hasInk)
        return to("armed", [], event.now);
      return unchanged;
    case "arm-expired":
      return phase === "armed" && event.now - session.armedAt >= ARM_WINDOW_MS
        ? to("drawing")
        : unchanged;
    case "canvas-touch":
      return phase === "armed" ? to("drawing") : unchanged;
    case "time-up":
      return phase === "drawing" || phase === "armed" ? to("sealing", ["seal"]) : unchanged;
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

/**
 * The seal route's own refusals, each answered only while the ticket holds no sticker of this person's.
 * A 4xx from before the route, 401 signed_out above all, says nothing about an earlier try.
 */
const SEAL_REFUSALS: ReadonlySet<string> = new Set([
  "invalid_request",
  "ticket_not_yours",
  "adults_only",
  "ticket_not_found",
] satisfies ErrorCode[]);

/**
 * What a failed seal request says about the server. "refused": it answered that it holds no seal for
 * this ticket, so the sheet may change. "unsent": the wait for the board address stopped it before it
 * left the phone. "unknown": anything else, no answer above all, after which the server may hold it.
 */
export function sealFailure(error: unknown): "refused" | "unsent" | "unknown" {
  if (!(error instanceof ApiError)) return "unknown";
  if (error.status >= 400 && error.status < 500 && SEAL_REFUSALS.has(error.code)) return "refused";
  const unsent = error.code === "line_token_expired" || error.code === "smart_account_not_ready";
  return error.status === 0 && unsent ? "unsent" : "unknown";
}

/** What the seal chip says a failed seal ran into, in words of its own with no technical detail. */
export type SealProblem =
  | {
      kind:
        | "onThisPhone"
        | "noAnswer"
        | "serverProblem"
        | "notOnChain"
        | "boardAddress"
        | "signInExpired";
    }
  /** The server's own answer, worded by its error message. */
  | { kind: "refused"; error: ApiError };

/** Sorts a failed seal for its chip. `sent`: the request had left the phone. */
export function describeSealFailure(error: unknown, sent: boolean): SealProblem {
  // An answer that can't be read is no answer; a failure before the request left is the phone's.
  if (!(error instanceof ApiError)) return { kind: sent ? "noAnswer" : "onThisPhone" };
  if (error.code === "line_token_expired") return { kind: "signInExpired" };
  if (error.code === "smart_account_not_ready") return { kind: "boardAddress" };
  if (error.code === "mint_failed") return { kind: "notOnChain" };
  if (error.status === 0) return { kind: "noAnswer" };
  return error.status >= 500 ? { kind: "serverProblem" } : { kind: "refused", error };
}

/**
 * Why the clock is held: the person's pause, a hidden page, the drawing screen being covered, or a
 * tool in hand (the color sheet, the smoothing bar, a finger on the size rail). Only a started clock
 * is held; before the first stroke it just waits, and nothing shows as paused.
 */
export type Hold = "paused" | "hidden" | "away" | "color" | "smoothing" | "size";

/** Which hold the timer shows, most important first. */
const HOLDS: readonly Hold[] = ["paused", "hidden", "away", "color", "smoothing", "size"];

/** The hold the timer shows, or null when nothing holds it. */
export function heldBy(holds: ReadonlySet<Hold>): Hold | null {
  return HOLDS.find((hold) => holds.has(hold)) ?? null;
}
