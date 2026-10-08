import { KYOTO_SEIKA_TIME_USED_S, MAX_TIME_USED_S } from "@drawing-app/api/client";
import { ApiError, type ErrorCode } from "../../api/apiClient";

/**
 * How long a sheet gets on the drawing clock, by its ticket's mode: Kyoto Seika Manga Expression
 * Practice Mode's or not. The server refuses a seal that used more.
 */
export const sessionMs = (kyotoSeika: boolean) =>
  (kyotoSeika ? KYOTO_SEIKA_TIME_USED_S : MAX_TIME_USED_S) * 1000;
/** After the first tap on the seal key, a second tap within this long seals. */
export const ARM_WINDOW_MS = 2_500;

/**
 * blank: a fresh sheet asks before a ticket is spent; the sheet takes no ink yet.
 * dealt: a ticket was spent in Kyoto Seika Practice Mode; its two subjects wait in their balloons for
 * Begin, the sheet takes no ink and the tools are hidden.
 * primed: Start spent a regular ticket; the clock waits for the first stroke.
 * drawing: the first stroke or fill started the clock.
 * armed: the seal key took its first tap. sealing: building the sticker. sealed: done.
 * retry: a seal failed where the sheet mustn't take ink again, since time is up or the server may
 * already hold the seal: the sheet stays locked, and the seal key only tries the seal again. A seal
 * the server refuses at 0:00 gives way to a fresh sheet instead.
 */
type Phase = "blank" | "dealt" | "primed" | "drawing" | "armed" | "sealing" | "sealed" | "retry";

export interface Session {
  phase: Phase;
  /** When the seal key was armed, in ms. */
  armedAt: number;
}

export const FRESH_SESSION: Session = { phase: "blank", armedAt: 0 };

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
   * waiting for Begin.
   */
  | { type: "restored"; drawn: boolean; sealSent: boolean; dealt: boolean }
  | { type: "seal-tap"; now: number; hasInk: boolean }
  /** The armed chip's 18+ box was ticked or unticked: the key stays armed, its window starting over. */
  | { type: "nsfw-box"; now: number }
  | { type: "arm-expired"; now: number }
  | { type: "canvas-touch" }
  /** The sheet was cleared: the seal key disarms, as at a touch on the sheet, and nothing else changes. */
  | { type: "clear" }
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

const to = (phase: Phase, effects: SessionEffect[] = [], armedAt = 0): Result => ({
  session: { phase, armedAt },
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
      return to(
        event.sealSent ? "retry" : event.drawn ? "drawing" : event.dealt ? "dealt" : "primed",
      );
    case "seal-tap":
      // The sheet can't change any more, so there's no second tap to wait for.
      if (phase === "retry") return to("sealing", ["seal"]);
      if (phase === "armed" && event.now - session.armedAt < ARM_WINDOW_MS)
        return to("sealing", ["seal"]);
      if ((phase === "drawing" || phase === "armed") && event.hasInk)
        return to("armed", [], event.now);
      return unchanged;
    case "nsfw-box":
      return phase === "armed" ? to("armed", [], event.now) : unchanged;
    case "arm-expired":
      return phase === "armed" && event.now - session.armedAt >= ARM_WINDOW_MS
        ? to("drawing")
        : unchanged;
    case "canvas-touch":
    case "clear":
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
 * A 4xx from before the route, 401 signed_out above all, says nothing about an earlier try, nor does
 * ticket_not_yours: it means the session is someone else's, as when another window signed this
 * browser in as them.
 */
const SEAL_REFUSALS: ReadonlySet<string> = new Set([
  "invalid_request",
  "ticket_not_found",
] satisfies ErrorCode[]);

/**
 * What a failed seal request says about the server. "refused": it answered that it holds no seal for
 * this ticket, so the sheet may change. "unsent": the wait for the Sui address stopped it before it
 * left the phone. "unknown": anything else, no answer above all, after which the server may hold it.
 */
export function sealFailure(error: unknown): "refused" | "unsent" | "unknown" {
  if (!(error instanceof ApiError)) return "unknown";
  if (error.status >= 400 && error.status < 500 && SEAL_REFUSALS.has(error.code)) return "refused";
  const unsent = error.code === "line_token_expired" || error.code === "sui_wallet_not_ready";
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
        | "suiAddress"
        | "signInExpired";
    }
  /** The server's own answer, worded by its error message. */
  | { kind: "refused"; error: ApiError };

/** Sorts a failed seal for its chip. `sent`: the request had left the phone. */
export function describeSealFailure(error: unknown, sent: boolean): SealProblem {
  // An answer that can't be read is no answer; a failure before the request left is the phone's.
  if (!(error instanceof ApiError)) return { kind: sent ? "noAnswer" : "onThisPhone" };
  if (error.code === "line_token_expired") return { kind: "signInExpired" };
  if (error.code === "sui_wallet_not_ready") return { kind: "suiAddress" };
  if (error.code === "mint_failed") return { kind: "notOnChain" };
  if (error.status === 0) return { kind: "noAnswer" };
  return error.status >= 500 ? { kind: "serverProblem" } : { kind: "refused", error };
}

/**
 * Why the clock is held: the person's pause, a hidden page, the drawing screen being covered, or a
 * tool in hand (the color sheet, the smoothing bar, the clear bar, a finger on the size rail). Only a
 * started clock is held; before the first stroke it just waits, and nothing shows as paused.
 */
export type Hold = "paused" | "hidden" | "away" | "color" | "smoothing" | "clear" | "size";

/** Which hold the timer shows, most important first. */
const HOLDS: readonly Hold[] = ["paused", "hidden", "away", "color", "smoothing", "clear", "size"];

/** The hold the timer shows, or null when nothing holds it. */
export function heldBy(holds: ReadonlySet<Hold>): Hold | null {
  return HOLDS.find((hold) => holds.has(hold)) ?? null;
}
