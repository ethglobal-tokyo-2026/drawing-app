import { useEffect, useEffectEvent, useState } from "react";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { heldBy, SESSION_MS, type Hold } from "./session";

/** A frame can count at most this much, so a stalled or throttled page never eats the session. */
const MAX_FRAME_MS = 5_000;
/** After a hidden page returns, the clock waits this long, while the dot's lifted corner settles. */
const HIDDEN_RESUME_MS = 420;
/** The timer turns Tomato for this last stretch. */
const LATE_MS = 10_000;
/** The clock warns, once each, as it counts down through these many seconds left. */
const WARN_AT_SECONDS = [30, 10] as const;

/** What the timer dot shows. A new object only when one of these changes. */
export interface ClockView {
  /** Whole seconds left, rounded up. */
  secondsLeft: number;
  late: boolean;
  /** Why the clock is held, or null while it runs or waits for the first stroke. */
  held: Hold | null;
  /** The page is hidden, or only just back: the dot lifts a corner. */
  lifted: boolean;
  /** Nothing is drawn yet: the clock waits for the first stroke. */
  waiting: boolean;
}

/** The holds the drawing screen sets. The clock watches the page itself for `hidden`. */
export type ScreenHolds = Record<Exclude<Hold, "hidden">, boolean>;

const SCREEN_HOLDS = [
  "paused",
  "away",
  "color",
  "smoothing",
  "size",
] as const satisfies readonly (keyof ScreenHolds)[];

/**
 * The session's three minutes. Frames run only while it counts, or while a hidden page's resume is
 * due; each frame adds its delta unless something holds the clock. Stopped while sealing, it can
 * resume if the seal fails; at 0:00 it's done for good.
 */
export class SessionClock {
  private readonly frames: FrameSource;
  private state: "idle" | "running" | "stopped" | "done" = "idle";
  private elapsedMs = 0;
  private last: number | null = null;
  private holds: ScreenHolds = {
    paused: false,
    away: false,
    color: false,
    smoothing: false,
    size: false,
  };
  private hidden = false;
  private resumeAt: number | null = null;
  private cancelFrame: (() => void) | null = null;
  private onTimeUp: (() => void) | null = null;
  private view: ClockView;
  private readonly listeners = new Set<() => void>();
  private readonly warnings = new Set<(secondsLeft: number) => void>();

  constructor(frames: FrameSource = browserFrames) {
    this.frames = frames;
    this.view = this.computeView();
  }

  /** Time drawn so far, in ms. */
  get elapsed(): number {
    return this.elapsedMs;
  }

  getView = (): ClockView => this.view;

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  /**
   * Hears each warning that time is nearly up, with the seconds left. Only counting down through one
   * warns, so a kept drawing picked back up inside the last 30 seconds says nothing of it.
   */
  onWarning = (listener: (secondsLeft: number) => void): (() => void) => {
    this.warnings.add(listener);
    return () => this.warnings.delete(listener);
  };

  /** Frames run only while connected; returns the disconnect. */
  connect(onTimeUp: () => void): () => void {
    this.onTimeUp = onTimeUp;
    this.schedule();
    return () => {
      this.onTimeUp = null;
      this.cancelFrame?.();
      this.cancelFrame = null;
    };
  }

  start(): void {
    if (this.state === "idle") this.setState("running");
  }

  stop(): void {
    if (this.state === "running") this.setState("stopped");
  }

  resume(): void {
    if (this.state === "stopped") this.setState("running");
  }

  reset(): void {
    this.elapsedMs = 0;
    this.setState("idle");
  }

  /** Picks a drawing kept across a reload back up: started, with the time it had drawn. */
  restore(elapsedMs: number): void {
    if (this.state !== "idle") return;
    this.elapsedMs = Math.min(SESSION_MS, Math.max(0, elapsedMs));
    this.setState("running");
  }

  setHolds(holds: ScreenHolds): void {
    this.holds = holds;
    this.changed();
  }

  setHidden(hidden: boolean, resumeDelayMs = HIDDEN_RESUME_MS): void {
    if (hidden) {
      this.hidden = true;
      this.resumeAt = null;
    } else if (this.hidden && this.resumeAt === null) {
      this.resumeAt = this.frames.now() + resumeDelayMs;
    }
    this.changed();
  }

  private setState(state: SessionClock["state"]): void {
    this.state = state;
    this.changed();
  }

  private activeHolds(): Set<Hold> {
    const active = new Set<Hold>(SCREEN_HOLDS.filter((hold) => this.holds[hold]));
    if (this.hidden) active.add("hidden");
    return active;
  }

  private counting(): boolean {
    return this.state === "running" && heldBy(this.activeHolds()) === null;
  }

  private readonly frame = (t: number): void => {
    this.cancelFrame = null;
    if (this.resumeAt !== null && t >= this.resumeAt) {
      this.resumeAt = null;
      this.hidden = false;
    }
    if (this.counting()) {
      // Null when the clock came back in this very frame, with nothing to count yet.
      if (this.last !== null) {
        const delta = Math.min(MAX_FRAME_MS, Math.max(0, t - this.last));
        const before = this.elapsedMs;
        this.elapsedMs = Math.min(SESSION_MS, before + delta);
        this.warn(before, this.elapsedMs);
      }
      this.last = t;
      if (this.elapsedMs >= SESSION_MS) {
        this.state = "done";
        this.onTimeUp?.();
      }
    }
    this.changed();
  };

  /** Tells the listeners which warning, if any, the time from `before` to `after` counted through. */
  private warn(before: number, after: number): void {
    const crossed = WARN_AT_SECONDS.find((seconds) => {
      const at = SESSION_MS - seconds * 1000;
      return before < at && after >= at;
    });
    if (crossed !== undefined) this.warnings.forEach((listener) => listener(crossed));
  }

  /** Marks when counting starts or stops, publishes a changed view, and asks for or withdraws the next frame. */
  private changed(): void {
    if (!this.counting()) this.last = null;
    else if (this.last === null) this.last = this.frames.now();
    const next = this.computeView();
    const v = this.view;
    if (
      next.secondsLeft !== v.secondsLeft ||
      next.late !== v.late ||
      next.held !== v.held ||
      next.lifted !== v.lifted ||
      next.waiting !== v.waiting
    ) {
      this.view = next;
      this.listeners.forEach((listener) => listener());
    }
    this.schedule();
  }

  private schedule(): void {
    const wanted = this.onTimeUp !== null && (this.counting() || this.resumeAt !== null);
    if (wanted && !this.cancelFrame) this.cancelFrame = this.frames.request(this.frame);
    else if (!wanted && this.cancelFrame) {
      this.cancelFrame();
      this.cancelFrame = null;
    }
  }

  private computeView(): ClockView {
    const left = SESSION_MS - this.elapsedMs;
    return {
      secondsLeft: Math.ceil(left / 1000),
      late: left <= LATE_MS,
      held: this.state === "running" ? heldBy(this.activeHolds()) : null,
      lifted: this.hidden,
      waiting: this.state === "idle",
    };
  }
}

/** The drawing screen's clock: runs on animation frames and holds while the page is hidden. */
export function useSessionClock(onTimeUp: () => void): SessionClock {
  const [clock] = useState(() => new SessionClock());
  const reduced = useReducedMotion();
  const timeUp = useEffectEvent(onTimeUp);

  useEffect(() => clock.connect(() => timeUp()), [clock]);

  useEffect(() => {
    const onVisibility = () => clock.setHidden(document.hidden, reduced ? 0 : HIDDEN_RESUME_MS);
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [clock, reduced]);

  return clock;
}
