// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, onTestFinished, vi } from "vitest";
import { i18next } from "../../i18n/i18n";
import { buttonNamed, onLargeScreen, renderInHost, type HostView } from "../../ui/testing";
import { DeviceDetails } from "./DeviceDetails";

const label = {
  userAgent: i18next.t(($) => $.stickerBoard.developer.device.userAgent.label),
  viewport: i18next.t(($) => $.stickerBoard.developer.device.viewport.label),
  largeScreen: i18next.t(($) => $.stickerBoard.developer.device.largeScreen.label),
};
const YES = i18next.t(($) => $.stickerBoard.developer.device.largeScreen.yes);
const COPY_DETAILS = i18next.t(($) => $.stickerBoard.developer.device.copy);
const writeText = vi.fn<(text: string) => Promise<void>>();
let view: HostView;

/** The window at `width` × `height`. */
function windowAt(width: number, height: number) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
}
/** The paper's value in the row labeled `name`. */
const row = (name: string) =>
  [...view.host.querySelectorAll(".account-rows__row")]
    .find((r) => r.querySelector("dt")?.textContent === name)
    ?.querySelector("dd")?.textContent;
const copy = () => act(async () => buttonNamed(view.host, COPY_DETAILS).click());
// No ToastProvider: the board's tests show the slip without one, so the paper mustn't need it.
const render = () => view.rerender(<DeviceDetails />);

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  view = renderInHost();
});

afterEach(() => {
  view.unmount();
  writeText.mockReset();
  vi.restoreAllMocks();
});

describe("DeviceDetails", () => {
  it("says what the device says, and whether the app lays out for a large screen, and copies it whole", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    onTestFinished(() => void vi.useRealTimers());
    const takenAt = new Date("2026-10-10T03:00:00Z");
    vi.setSystemTime(takenAt);
    onLargeScreen();
    windowAt(1180, 820);
    render();
    expect(row(label.viewport)).toMatch(/^1180×820 /);
    expect(row(label.largeScreen)).toBe(YES);
    writeText.mockResolvedValue();
    await copy();
    const copied = writeText.mock.lastCall?.[0] ?? "";
    expect(copied.split("\n").slice(0, 2)).toEqual([
      i18next.t(($) => $.stickerBoard.developer.device.taken, { time: takenAt.toISOString() }),
      `${label.userAgent}: ${navigator.userAgent}`,
    ]);
    expect(copied).toContain(`\n${label.largeScreen}: ${YES}`);
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe(
      i18next.t(($) => $.stickerBoard.developer.device.copied),
    );
  });

  it("follows the window as it turns", () => {
    windowAt(820, 1180);
    render();
    windowAt(1180, 820);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(row(label.viewport)).toMatch(/^1180×820 /);
  });

  it("says why the clipboard refused, and leaves the details to copy by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    windowAt(820, 1180);
    render();
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await copy();
    expect(view.host.querySelector('[role="alert"]')?.textContent).toBe(
      i18next.t(($) => $.stickerBoard.developer.device.notCopied, { reason: "Not allowed here" }),
    );
    expect(view.host.querySelector("textarea")?.value).toContain(`${label.viewport}: 820×1180`);
  });
});
