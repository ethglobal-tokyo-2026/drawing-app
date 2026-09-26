/** A sticker gets three minutes of drawing. */
export const SESSION_MS = 3 * 60_000;
/** After the first tap on the seal key, a second tap within this long seals. */
export const ARM_WINDOW_MS = 2_500;

/**
 * blank: a fresh sheet asks before a ticket is spent; the sheet takes no ink yet.
 * primed: Start spent a ticket; the clock waits at 3:00 for the first stroke.
 * drawing: the first stroke or fill started the clock.
 * armed: the seal key took its first tap. sealing: building the sticker. sealed: done.
 */
type Phase = "blank" | "primed" | "drawing" | "armed" | "sealing" | "sealed";

export interface Session {
  phase: Phase;
  /** When the seal key was armed, in ms. */
  armedAt: number;
}

export const FRESH_SESSION: Session = { phase: "blank", armedAt: 0 };

export type SessionEvent =
  /** The person chose to spend a ticket on this sheet. */
  | { type: "start" }
  /** A stroke or fill landed on the sheet. */
  | { type: "ink" }
  | { type: "seal-tap"; now: number; hasInk: boolean }
  | { type: "arm-expired"; now: number }
  | { type: "canvas-touch" }
  | { type: "time-up" }
  | { type: "sealed" }
  | { type: "seal-failed" }
  | { type: "reset" };

/** What the drawing screen does on a transition, besides showing the new phase. */
export type SessionEffect =
  | "spend-ticket"
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
      return phase === "blank" ? to("primed", ["spend-ticket"]) : unchanged;
    case "ink":
      return phase === "primed" ? to("drawing", ["start-clock"]) : unchanged;
    case "seal-tap":
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
      return phase === "sealing" ? to("drawing", ["resume-clock"]) : unchanged;
    case "reset":
      return to("blank", ["reset-sheet"]);
  }
}

/**
 * Why the clock is held. The person's pause, a hidden page and the drawing screen being covered hold
 * it at any time; a tool in hand (the color sheet, the smoothing bar, a finger on the size rail) holds
 * it only while it runs.
 */
export type Hold = "paused" | "hidden" | "away" | "color" | "smoothing" | "size";

/** Which hold the timer shows, most important first. */
const HOLDS: readonly Hold[] = ["paused", "hidden", "away", "color", "smoothing", "size"];
const ANYTIME: ReadonlySet<Hold> = new Set(["paused", "hidden", "away"]);

/** The hold the timer shows, or null when nothing holds it. */
export function heldBy(holds: ReadonlySet<Hold>, started: boolean): Hold | null {
  return HOLDS.find((hold) => holds.has(hold) && (started || ANYTIME.has(hold))) ?? null;
}
