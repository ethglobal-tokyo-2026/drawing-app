import liff from "@line/liff";
import { i18next } from "../i18n/i18n";
import { notePerformance } from "./performanceRecorder";

/**
 * The app's start, step by step, for the performance report: when each step was reached, on the
 * page's clock (performance.now(), which counts from when the page began to load). They're a handful
 * of numbers, kept whether or not the recorder runs, so a report copied later still tells how this
 * open started.
 */
export type BootStep =
  | "HTML in"
  | "JS running"
  | "LIFF ready"
  | "signed in"
  | "board from this phone"
  | "board JSON"
  | "first sticker decoded"
  | "all stickers"
  | "board complete";

export interface BootMilestone {
  step: BootStep;
  /** On the page's clock, in ms. */
  at: number;
  /** A few words more, such as how many stickers. */
  detail?: string;
}

/** How much of the board's first motion, from "board complete", the performance report sums up. */
export const FRAMES_AFTER_BOARD_COMPLETE_MS = 5000;

/** The stretch the report watches from "board complete", by the name it reports it under. */
export const afterBoardCompleteLabel = () =>
  i18next.t(($) => $.stickerBoard.developer.performance.lines.window.afterBoardComplete, {
    seconds: `${FRAMES_AFTER_BOARD_COMPLETE_MS / 1000}s`,
  });

const reached = new Map<BootStep, BootMilestone>();

/** The start reached `step`; only the first time counts. */
export function noteBootMilestone(step: BootStep, detail?: string, at = performance.now()): void {
  if (reached.has(step)) return;
  reached.set(step, { step, at, ...(detail && { detail }) });
  notePerformance("start", detail ? `${step}: ${detail}` : step);
}

const isNavigation = (entry: PerformanceEntry | undefined): entry is PerformanceNavigationTiming =>
  entry?.entryType === "navigation";

/** Every step reached so far, in order, with when the page's HTML arrived first. */
export function readBootMilestones(): BootMilestone[] {
  const steps = [...reached.values()];
  // Every browser the app runs in has navigation timing; test runners may not.
  const [page] =
    typeof performance.getEntriesByType === "function"
      ? performance.getEntriesByType("navigation")
      : [];
  if (isNavigation(page) && page.responseEnd > 0)
    steps.push({ step: "HTML in", at: page.responseEnd });
  return steps.sort((a, b) => a.at - b.at);
}

/** For tests: forgets every step, as a new page would start. */
export function forgetBootMilestones(): void {
  reached.clear();
}

// This module loads with the app's own code, so this is when its JS started to run.
noteBootMilestone("JS running");
// LIFF says when its start is done. Stand-ins for LIFF in tests may have no promise to say it with.
const liffStarted: unknown = liff.ready;
if (liffStarted instanceof Promise) {
  void liffStarted.then(
    () => noteBootMilestone("LIFF ready"),
    () => {},
  );
}
