// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearPerformanceRecording,
  stopPerformanceRecorder,
} from "../../performance/performanceRecorder";
import { PerformanceRecorderControls } from "./PerformanceRecorderControls";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const writeText = vi.fn<(text: string) => Promise<void>>();

const control = <E extends HTMLElement>(selector: string) => {
  const el = host.querySelector<E>(selector);
  if (!el) throw new Error(`Nothing matches ${selector}`);
  return el;
};
const button = (label: string) => {
  const found = [...host.querySelectorAll("button")].find((b) => b.textContent === label);
  if (!found) throw new Error(`No "${label}" button`);
  return found;
};
/** Turns recording on and lets it see a few frames. */
const record = () => {
  act(() => control<HTMLInputElement>("input[type=checkbox]").click());
  act(() => {
    vi.advanceTimersByTime(100);
  });
};
const copyReport = () => act(async () => button("Copy report").click());

beforeEach(() => {
  vi.useFakeTimers({
    toFake: ["setInterval", "clearInterval", "requestAnimationFrame", "cancelAnimationFrame"],
  });
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<PerformanceRecorderControls />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
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
      "The report couldn't be copied: Not allowed here. It's below to copy by hand.",
    );
    expect(control<HTMLTextAreaElement>("textarea").value).toContain("Typical frame");
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
    expect(control('[role="alert"]').textContent).toBe("Recording couldn't start: observe failed");
  });
});
