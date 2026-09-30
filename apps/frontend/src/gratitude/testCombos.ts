import { createGratitudeCombo, type ComboEvent } from "./combo";
import { FEEL_CONFIG, GAME_CONFIG, type GameConfig } from "./gameConfig";
import { createReplayRecorder } from "./replayRecorder";
import { createStrokeDetector } from "./strokeDetector";

export type Ended = Extract<ComboEvent, { kind: "ended" }>;

export const endOf = (events: readonly ComboEvent[]) =>
  events.find((e): e is Ended => e.kind === "ended");

/** The phone stage the tests record on, px. */
export const STAGE = { width: 390, height: 741 };
/** ms between a stroke finger's moves: a phone's 120 Hz touch events. */
const MOVE_MS = 8;

export type Session = ReturnType<typeof session>;

/**
 * A combo and a replay recorder, each input told to both the way the Mini-game engine tells them:
 * touches on the heart, the stroke finger through the real stroke detector, and shake reversals.
 */
export function session(config: GameConfig = GAME_CONFIG) {
  const combo = createGratitudeCombo(config);
  const recorder = createReplayRecorder({ seed: 42, intensity: 0.7, ...STAGE });
  const strokes = createStrokeDetector(FEEL_CONFIG.stroke);
  let ended: Ended | undefined;
  const hear = (events: ComboEvent[]) => {
    ended ??= endOf(events);
    // As the engine does, the first hit starts the stroke streak over.
    if (events.some((e) => e.kind === "started")) strokes.breakStreak();
    return events;
  };
  /** The engine lets the stroke finger go once the combo has ended or committed to shake. */
  const strokeIgnored = () => ended !== undefined || combo.view.method === "shake";
  return {
    combo,
    recorder,
    hear,
    get ended() {
      return ended;
    },
    tap: (t: number, x = 195, y = 400) => recorder.touch(x, y, hear(combo.tapHeart(t))),
    frame: (t: number) => hear(combo.advanceTo(t)),
    end: (t: number, reason: "hidden" | "closed") => hear(combo.endCombo(t, reason)),
    fingerDown(t: number, x: number, y: number) {
      if (strokeIgnored()) return;
      strokes.fingerDown(x, y, t);
      recorder.strokeStart(t, x, y);
    },
    /** The stroke finger moved; true if the move ended a fast pass. */
    move(t: number, x: number, y: number): boolean {
      if (strokeIgnored()) return false;
      const pass = strokes.fingerMove(x, y, t);
      recorder.strokeMove(t, x, y, pass?.fast === true);
      if (!pass?.fast) return false;
      const { phase, method } = combo.view;
      const { unlockPasses, unlockPassesMidCombo } = FEEL_CONFIG.stroke;
      if (method === "stroke") hear(combo.countStrokePass(t));
      else if (pass.fastStreak >= (phase === "running" ? unlockPassesMidCombo : unlockPasses)) {
        hear(combo.commitTo("stroke", t));
      }
      return true;
    },
    lift() {
      strokes.fingerUp();
      recorder.strokeEnd();
    },
    /** A shake reversal the combo hears: the unlock, which lets go of a stroke, or one after it. */
    reverse(t: number, direction: 1 | -1) {
      const unlocking = combo.view.method !== "shake";
      const events = hear(unlocking ? combo.commitTo("shake", t) : combo.countShakeReversal(t));
      recorder.shake(direction, events);
      if (unlocking && events.some((e) => e.kind === "hit")) {
        strokes.fingerUp();
        recorder.strokeEnd();
      }
    },
    finish() {
      if (!ended) throw new Error("The combo never ended");
      return { ended, replay: recorder.finish(ended) };
    },
  };
}

export interface StrokeOptions {
  from: number;
  until: number;
  x?: number;
  /** Where the finger goes down: each run goes `span` px up from here and back. */
  y?: number;
  span?: number;
  runMs?: number;
}

/**
 * A thumb stroking up and down from (x, y), a move every MOVE_MS from `from` until `until` or the
 * combo's end, then lifting. No frames run meanwhile, so the pass after the bar runs out is the one
 * that finds the end. Returns the times of the moves that ended a fast pass.
 */
export function strokeUpAndDown(
  s: Session,
  { from, until, x = 200, y = 520, span = 120, runMs = 125 }: StrokeOptions,
): number[] {
  const fast: number[] = [];
  s.fingerDown(from, x, y);
  for (let t = from + MOVE_MS; t <= until && !s.ended; t += MOVE_MS) {
    const run = (t - from) / runMs;
    const along = run % 2 < 1 ? run % 1 : 1 - (run % 1);
    if (s.move(t, x, y - span * along)) fast.push(t);
  }
  s.lift();
  return fast;
}

/**
 * A combo a stroke starts: first a stroke the combo never hears, and a pause that breaks its fast
 * streak; then a stroke whose unlocking pass starts the combo, stroking on until a pass finds the bar
 * run out. `fastPasses`: the detector's fast passes, in ms after the combo's first hit.
 */
export function strokeStartedCombo() {
  const s = session();
  const before = strokeUpAndDown(s, { from: 100, until: 500 });
  const during = strokeUpAndDown(s, { from: 1500, until: 1500 + GAME_CONFIG.maxDurationMs * 2 });
  const { ended, replay } = s.finish();
  return {
    ended,
    replay,
    fastPasses: [...before, ...during].map((t) => t - ended.startedAt),
  };
}
