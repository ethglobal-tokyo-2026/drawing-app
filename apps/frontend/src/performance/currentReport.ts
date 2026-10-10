import type { PerformanceReportUpload } from "@drawing-app/api/client";
import { readBootMilestones } from "./bootMilestones";
import { describeDevice, readPerformanceRecording, timeOurWork } from "./performanceRecorder";
import { formatPerformanceReport } from "./performanceReport";

/**
 * The recording as it stands: its report, and the figures the server logs beside it. Null before
 * anything was recorded. Its time counts as ours, so a slow frame it lands in says so.
 */
export function readCurrentReport(within = Infinity): PerformanceReportUpload | null {
  return timeOurWork("performance report", () => {
    const recording = readPerformanceRecording();
    if (!recording) return null;
    const device = describeDevice();
    const report = formatPerformanceReport({
      ...recording,
      takenAt: new Date(),
      device,
      start: readBootMilestones(),
      within,
    });
    const { recordedMs, frames, slow } = recording.summary;
    return { report, device, recordedMs: Math.round(recordedMs), frames, slowFrames: slow };
  });
}
