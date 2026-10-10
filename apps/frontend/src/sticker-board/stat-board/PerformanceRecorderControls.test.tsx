// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/apiClient";
import { i18next } from "../../i18n/i18n";
import {
  clearPerformanceRecording,
  stopPerformanceRecorder,
} from "../../performance/performanceRecorder";
import {
  REPORT_UPLOAD_EVERY_MS,
  uploadPerformanceReports,
} from "../../performance/performanceUpload";
import { buttonNamed, renderInHost, type HostView } from "../../ui/testing";
import { PerformanceRecorderControls } from "./PerformanceRecorderControls";

const COPY_REPORT = i18next.t(($) => $.stickerBoard.developer.performance.copy);
/** A line every report with frames has. */
const SLOW_FRAMES_BY_SCREEN = i18next.t(
  ($) => $.stickerBoard.developer.performance.lines.byScreen.title,
);

let view: HostView;
const writeText = vi.fn<(text: string) => Promise<void>>();

const control = <E extends HTMLElement>(selector: string) => {
  const el = view.host.querySelector<E>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const button = (label: string) => buttonNamed(view.host, label);
/** Turns recording on and lets it see a few frames. */
const record = () => {
  act(() => control<HTMLInputElement>("input[type=checkbox]").click());
  act(() => {
    vi.advanceTimersByTime(100);
  });
};
const copyReport = () => act(async () => button(COPY_REPORT).click());

let stopUploading: (() => void) | undefined;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  view = renderInHost(<PerformanceRecorderControls />);
});

afterEach(() => {
  view.unmount();
  stopUploading?.();
  stopUploading = undefined;
  stopPerformanceRecorder();
  clearPerformanceRecording();
  localStorage.clear();
  writeText.mockReset();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("PerformanceRecorderControls", () => {
  it("copies the report once there's a recording", async () => {
    expect(button(COPY_REPORT).disabled).toBe(true);
    record();
    writeText.mockResolvedValue();
    await copyReport();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(SLOW_FRAMES_BY_SCREEN));
    expect(control('[role="status"]').textContent).toBe(
      i18next.t(($) => $.stickerBoard.developer.performance.copied),
    );
  });

  it("says why the clipboard refused the report, and shows it to copy by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    record();
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await copyReport();
    expect(control('[role="alert"]').textContent).toBe(
      i18next.t(($) => $.stickerBoard.developer.performance.notCopied, {
        reason: "Not allowed here",
      }),
    );
    expect(control<HTMLTextAreaElement>("textarea").value).toContain(SLOW_FRAMES_BY_SCREEN);
  });

  it("shows in one line why a report upload failed, until the next one is accepted", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const upload = vi
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(
        new ApiError(400, { error: "invalid_request", detail: "report: Too big" }),
      )
      .mockResolvedValue();
    record();
    stopUploading = uploadPerformanceReports({ uploadPerformanceReport: upload });

    await act(() => vi.advanceTimersByTimeAsync(REPORT_UPLOAD_EVERY_MS));
    expect(control('[role="alert"]').textContent).toBe(
      i18next.t(($) => $.stickerBoard.developer.performance.notUploaded, {
        reason: "HTTP 400 invalid_request: report: Too big",
      }),
    );

    await act(() => vi.advanceTimersByTimeAsync(REPORT_UPLOAD_EVERY_MS));
    expect(view.host.querySelector('[role="alert"]')).toBeNull();
  });

  it("runs its once-a-second update only while the slip shows", async () => {
    record();
    const running = vi.getTimerCount();
    await act(async () => view.host.setAttribute("inert", ""));
    expect(vi.getTimerCount()).toBe(running - 1);
    await act(async () => view.host.removeAttribute("inert"));
    expect(vi.getTimerCount()).toBe(running);
  });

  it("says why recording couldn't start, and leaves the switch off", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal(
      "PerformanceObserver",
      class {
        static supportedEntryTypes = ["resource"];
        observe() {
          throw new TypeError("observe failed");
        }
        disconnect() {}
      },
    );
    const toggle = control<HTMLInputElement>("input[type=checkbox]");
    act(() => toggle.click());
    expect(toggle.checked).toBe(false);
    expect(control('[role="alert"]').textContent).toBe(
      i18next.t(($) => $.stickerBoard.developer.performance.couldntStart, {
        reason: "observe failed",
      }),
    );
  });
});
