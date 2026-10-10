// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "../../api/apiClient";
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
const copyReport = () => act(async () => button("Copy report").click());

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
    expect(button("Copy report").disabled).toBe(true);
    record();
    writeText.mockResolvedValue();
    await copyReport();
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining("Typical frame"));
    expect(control('[role="status"]').textContent).toBe("Copied. Paste it into the chat.");
  });

  it("says why the clipboard refused the report, and shows it to copy by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    record();
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await copyReport();
    expect(control('[role="alert"]').textContent).toBe(
      "The report couldn’t be copied: Not allowed here. It’s below to copy by hand.",
    );
    expect(control<HTMLTextAreaElement>("textarea").value).toContain("Typical frame");
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
      "The report wasn’t uploaded: HTTP 400 invalid_request: report: Too big. The next send tries again.",
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
    expect(control('[role="alert"]').textContent).toBe("Recording couldn’t start: observe failed");
  });
});
