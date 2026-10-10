// @vitest-environment happy-dom
import {
  MAX_PERFORMANCE_REPORT_CHARS,
  type PerformanceReportUpload,
} from "@drawing-app/api/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../api/apiClient";
import {
  clearPerformanceRecording,
  notePerformance,
  SLOW_FRAMES_KEPT,
  startPerformanceRecorder,
  stopPerformanceRecorder,
} from "./performanceRecorder";
import {
  readPerformanceUploadProblem,
  REPORT_UPLOAD_EVERY_MS,
  uploadPerformanceReports,
} from "./performanceUpload";

const FRAME = 16;

let queued: FrameRequestCallback | null = null;
let clock = 0;
/** The browser starts a frame at `t`. */
const frameAt = (t: number) => {
  clock = t;
  const run = queued;
  queued = null;
  run?.(t);
};
/** `n` steady frames after the latest. */
const frames = (n: number) => {
  for (let i = 0; i < n; i++) frameAt(clock + FRAME);
};

let visibility: DocumentVisibilityState = "visible";
const setVisibility = (next: DocumentVisibilityState) => {
  visibility = next;
  document.dispatchEvent(new Event("visibilitychange"));
};

/** What the requests out wait on; null lets them answer at once. */
let held: Promise<void> | null = null;
let inFlight = 0;
let mostInFlight = 0;
const upload = vi.fn<(upload: PerformanceReportUpload) => Promise<void>>();

let stopUploading: (() => void) | undefined;
const startUploading = () => {
  stopUploading = uploadPerformanceReports({ uploadPerformanceReport: upload });
};
/** Lets `ms` pass, and the sends it starts settle. */
const pass = (ms: number) => vi.advanceTimersByTimeAsync(ms);

beforeEach(() => {
  queued = null;
  clock = 0;
  visibility = "visible";
  held = null;
  inFlight = 0;
  mostInFlight = 0;
  vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    queued = callback;
    return 1;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {
    queued = null;
  });
  vi.spyOn(document, "visibilityState", "get").mockImplementation(() => visibility);
  vi.spyOn(console, "warn").mockImplementation(() => {});
  upload.mockReset();
  upload.mockImplementation(async () => {
    inFlight++;
    mostInFlight = Math.max(mostInFlight, inFlight);
    try {
      await held;
    } finally {
      inFlight--;
    }
  });
});

afterEach(() => {
  stopUploading?.();
  stopUploading = undefined;
  stopPerformanceRecorder();
  clearPerformanceRecording();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("uploading the performance report", () => {
  it("sends the current report every 30 seconds while the recorder is on", async () => {
    startPerformanceRecorder();
    startUploading();
    frames(10);
    await pass(REPORT_UPLOAD_EVERY_MS - 1);
    expect(upload).not.toHaveBeenCalled();
    await pass(1);
    expect(upload).toHaveBeenCalledTimes(1);

    frames(10);
    await pass(REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(2);
    const [first, second] = upload.mock.calls.map(([sent]) => sent);
    expect(first.report).toContain("Performance report, taken");
    expect(first.device).toContain("User agent: ");
    expect(second.frames - first.frames).toBe(10);
  });

  it("sends nothing while the recorder is off, and starts with it", async () => {
    startUploading();
    await pass(3 * REPORT_UPLOAD_EVERY_MS);
    setVisibility("hidden");
    setVisibility("visible");
    expect(upload).not.toHaveBeenCalled();

    startPerformanceRecorder();
    frames(5);
    await pass(REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("stops sending when the app lets it go", async () => {
    startPerformanceRecorder();
    startUploading();
    stopUploading?.();
    setVisibility("hidden");
    await pass(2 * REPORT_UPLOAD_EVERY_MS);
    expect(upload).not.toHaveBeenCalled();
  });

  it("sends as the page hides, and not on the timer while it's hidden", async () => {
    startPerformanceRecorder();
    startUploading();
    frames(5);
    setVisibility("hidden");
    await pass(0);
    expect(upload).toHaveBeenCalledTimes(1);

    await pass(2 * REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(1);
    setVisibility("visible");
    await pass(REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(2);
  });

  it("sends once as recording stops, and no more after", async () => {
    startPerformanceRecorder();
    startUploading();
    frames(5);
    stopPerformanceRecorder();
    await pass(0);
    expect(upload).toHaveBeenCalledTimes(1);

    await pass(3 * REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(1);
  });

  it("keeps one request out at a time: the timer waits one out, and a hide and a stop during it send once after", async () => {
    startPerformanceRecorder();
    startUploading();
    frames(5);
    let answer = () => {};
    held = new Promise<void>((resolve) => {
      answer = resolve;
    });
    await pass(REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(1);

    await pass(2 * REPORT_UPLOAD_EVERY_MS);
    setVisibility("hidden");
    stopPerformanceRecorder();
    expect(upload).toHaveBeenCalledTimes(1);

    held = null;
    answer();
    await pass(0);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(mostInFlight).toBe(1);
  });

  it.each([
    [
      "the server's refusal",
      new ApiError(400, { error: "invalid_request", detail: "report: Too big" }),
      "HTTP 400 invalid_request: report: Too big",
    ],
    [
      "no answer",
      new ApiError(0, { error: "network", detail: "POST /api/performance-reports got no answer" }),
      "POST /api/performance-reports got no answer",
    ],
  ])("says what failed and why for %s, and the next send tries again", async (_, error, line) => {
    upload.mockRejectedValueOnce(error);
    startPerformanceRecorder();
    startUploading();
    frames(5);
    await pass(REPORT_UPLOAD_EVERY_MS);
    expect(readPerformanceUploadProblem()).toBe(line);

    await pass(REPORT_UPLOAD_EVERY_MS);
    expect(upload).toHaveBeenCalledTimes(2);
    expect(readPerformanceUploadProblem()).toBeNull();
  });

  it("fits a long recording's report to what the server takes, with the latest slow frames", async () => {
    vi.spyOn(performance, "now").mockImplementation(() => clock);
    startPerformanceRecorder();
    startUploading();
    frames(30);
    for (let slow = 0; slow < SLOW_FRAMES_KEPT; slow++) {
      notePerformance("mark", `mark-${slow}- ${"z".repeat(900)}`);
      frameAt(clock + 100);
      frames(10);
    }
    await pass(REPORT_UPLOAD_EVERY_MS);

    const [sent] = upload.mock.calls.map(([sentReport]) => sentReport);
    expect(sent.report.length).toBeLessThanOrEqual(MAX_PERFORMANCE_REPORT_CHARS);
    expect(sent.slowFrames).toBe(SLOW_FRAMES_KEPT);
    const listed = /The latest (\d+) of (\d+) slow frames/.exec(sent.report);
    expect(Number(listed?.[1])).toBeGreaterThan(0);
    expect(Number(listed?.[1])).toBeLessThan(SLOW_FRAMES_KEPT);
    expect(Number(listed?.[2])).toBe(SLOW_FRAMES_KEPT);
    expect(sent.report).toContain(`mark-${SLOW_FRAMES_KEPT - 1}- `);
    expect(sent.report).not.toContain("mark-0- ");
  });
});
