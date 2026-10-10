import { insertUser } from "@drawing-app/db/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_PERFORMANCE_REPORT_CHARS } from "../performanceReportLimits.ts";
import { createTestApp, type TestApp } from "../testing/createTestApp.ts";
import { captureLogLines, type LogLines } from "../testing/logLines.ts";
import { refusalOf } from "../testing/responses.ts";
import type { PerformanceReportUpload } from "./performanceReports.ts";

let test: TestApp;
let userId: string;
let logs: LogLines;

beforeEach(async () => {
  logs = captureLogLines();
  test = await createTestApp();
  userId = insertUser(test.db);
});

afterEach(() => vi.restoreAllMocks());

const upload = (overrides: Partial<PerformanceReportUpload> = {}): PerformanceReportUpload => ({
  report:
    "Performance report, taken 2026-10-09T03:00:00.000Z\nUser agent: Safari\n\nTypical frame 16.7ms (60 fps)",
  device: "User agent: Safari\nPlatform: iPad · 5 touch points",
  recordedMs: 25_410,
  frames: 1_523,
  slowFrames: 14,
  ...overrides,
});

const send = (body: object, as?: string) =>
  test.send("POST", "/api/performance-reports", { as, body });

const reportsLogged = () => logs.entries.filter((entry) => entry.event === "performance.report");

describe("POST /api/performance-reports", () => {
  it("writes a signed-in person's report to the log as one line, and answers 204", async () => {
    const body = upload();
    const response = await send(body, userId);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    expect(reportsLogged()).toHaveLength(1);
    logs.expectLogged("performance.report", { userId, ...body });
    const line = logs.raw.find((raw) => raw.includes('"event":"performance.report"'));
    expect(line).not.toContain("\n");
  });

  it("refuses a report from no one signed in, and logs nothing of it", async () => {
    expect(await refusalOf(await send(upload()))).toMatchObject({
      status: 401,
      error: "signed_out",
    });
    expect(reportsLogged()).toEqual([]);
  });

  it("takes a report up to the limit and refuses one over it, naming the field", async () => {
    const atLimit = upload({ report: "x".repeat(MAX_PERFORMANCE_REPORT_CHARS) });
    expect((await send(atLimit, userId)).status).toBe(204);

    const refused = await refusalOf(
      await send(upload({ report: "x".repeat(MAX_PERFORMANCE_REPORT_CHARS + 1) }), userId),
    );
    expect(refused).toMatchObject({ status: 400, error: "invalid_request" });
    expect(refused.detail).toContain("report");
    expect(reportsLogged()).toHaveLength(1);
  });
});
