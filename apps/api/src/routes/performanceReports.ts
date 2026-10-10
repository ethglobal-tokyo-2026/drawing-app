import { Hono } from "hono";
import { z } from "zod";
import { logInfo } from "../diagnostics.ts";
import { validate } from "../errors.ts";
import {
  MAX_PERFORMANCE_DEVICE_CHARS,
  MAX_PERFORMANCE_REPORT_CHARS,
} from "../performanceReportLimits.ts";
import type { AppEnv } from "../session.ts";

/** The app's performance report, and the figures from it that the log line carries beside it. */
const performanceReportUploadSchema = z.object({
  report: z.string().min(1).max(MAX_PERFORMANCE_REPORT_CHARS),
  device: z.string().min(1).max(MAX_PERFORMANCE_DEVICE_CHARS),
  recordedMs: z.number().int().nonnegative(),
  frames: z.number().int().nonnegative(),
  slowFrames: z.number().int().nonnegative(),
});
export type PerformanceReportUpload = z.infer<typeof performanceReportUploadSchema>;

/**
 * Performance reports: the app's performance recorder sends its report while it's on, and the server
 * writes it to its log as one line, so whoever reads /api/logs sees what a phone or an iPad recorded
 * without anyone copying it.
 */
export const performanceReportRoutes = () =>
  new Hono<AppEnv>().post(
    "/performance-reports",
    validate("json", performanceReportUploadSchema),
    (c) => {
      const { report, device, recordedMs, frames, slowFrames } = c.req.valid("json");
      logInfo("performance.report", {
        userId: c.var.userId,
        recordedMs,
        frames,
        slowFrames,
        device,
        report,
      });
      return c.body(null, 204);
    },
  );
