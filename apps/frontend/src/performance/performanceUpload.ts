import { MAX_PERFORMANCE_REPORT_CHARS } from "@drawing-app/api/client";
import { apiError, type ApiClient, type ApiError } from "../api/apiClient";
import { readCurrentReport } from "./currentReport";
import { isPerformanceRecorderOn, onPerformanceRecorderSwitch } from "./performanceRecorder";

/** How often a recorder that's on sends its report. */
export const REPORT_UPLOAD_EVERY_MS = 30_000;

type ReportUploader = Pick<ApiClient, "uploadPerformanceReport">;

/** Why the latest send failed, in a line; null while the latest was accepted. */
let problem: string | null = null;
const problemListeners = new Set<() => void>();

function setProblem(next: string | null) {
  if (next === problem) return;
  problem = next;
  for (const heard of problemListeners) heard();
}

export const readPerformanceUploadProblem = () => problem;

/** Calls `listener` whenever that changes; for `useSyncExternalStore`. Returns what stops it. */
export function onPerformanceUploadProblem(listener: () => void): () => void {
  problemListeners.add(listener);
  return () => void problemListeners.delete(listener);
}

const reasonOf = (error: ApiError) =>
  error.status === 0 ? (error.detail ?? error.message) : `HTTP ${error.status} ${error.message}`;

/** A request is out; a send asked for while it is out waits for it, and goes once. */
let sending = false;
let owed = false;

async function sendReport(api: ReportUploader): Promise<void> {
  sending = true;
  try {
    do {
      owed = false;
      try {
        const upload = readCurrentReport(MAX_PERFORMANCE_REPORT_CHARS);
        if (!upload) break;
        await api.uploadPerformanceReport(upload);
        setProblem(null);
      } catch (caught) {
        const error = apiError(caught);
        console.warn("The performance report wasn't uploaded:", error);
        setProblem(reasonOf(error));
      }
    } while (owed);
  } finally {
    sending = false;
  }
}

/** A timed send is skipped while one is out; an urgent one, as the page hides or recording stops, is not. */
function requestSend(api: ReportUploader, urgent: boolean): void {
  if (sending) {
    owed ||= urgent;
    return;
  }
  void sendReport(api);
}

/**
 * Sends the performance report to the server while the recorder is on, so an agent reads what a
 * phone recorded from the server log: each `REPORT_UPLOAD_EVERY_MS` the page is showing, as the page
 * hides, and once as recording stops. A failed send shows on the developer slip, and the next one
 * tries again. Returns what stops it.
 */
export function uploadPerformanceReports(api: ReportUploader): () => void {
  let every: ReturnType<typeof setInterval> | undefined;

  // A hidden page records no frames, so its timer has nothing to add to the send as it hid.
  const onVisibility = () => {
    if (document.visibilityState === "hidden") requestSend(api, true);
  };
  const begin = () => {
    every = setInterval(() => {
      if (document.visibilityState === "visible") requestSend(api, false);
    }, REPORT_UPLOAD_EVERY_MS);
    document.addEventListener("visibilitychange", onVisibility);
  };
  const end = () => {
    clearInterval(every);
    every = undefined;
    document.removeEventListener("visibilitychange", onVisibility);
  };

  if (isPerformanceRecorderOn()) begin();
  const unfollow = onPerformanceRecorderSwitch((on) => {
    if (on && every === undefined) begin();
    if (!on && every !== undefined) {
      end();
      requestSend(api, true);
    }
  });
  return () => {
    unfollow();
    end();
  };
}
