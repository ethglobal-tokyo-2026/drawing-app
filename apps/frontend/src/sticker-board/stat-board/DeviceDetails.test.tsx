// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { buttonNamed, onLargeScreen, renderInHost, type HostView } from "../../ui/testing";
import { DeviceDetails } from "./DeviceDetails";

const strings = stickerBoard.developer.device;
const writeText = vi.fn<(text: string) => Promise<void>>();
let view: HostView;

/** The window at `width` × `height`. */
function windowAt(width: number, height: number) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
}
/** The paper's value for `label`. */
const row = (label: string) =>
  [...view.host.querySelectorAll(".account-rows__row")]
    .find((r) => r.querySelector("dt")?.textContent === label)
    ?.querySelector("dd")?.textContent;
const copy = () => act(async () => buttonNamed(view.host, strings.copy.en).click());
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
    onLargeScreen();
    windowAt(1180, 820);
    render();
    expect(row("Viewport")).toMatch(/^1180×820 /);
    expect(row("Large screen")).toBe("yes");
    writeText.mockResolvedValue();
    await copy();
    const copied = writeText.mock.lastCall?.[0] ?? "";
    expect(copied).toMatch(/^Device details, taken .+\nUser agent: /);
    expect(copied).toContain("\nLarge screen: yes");
    expect(view.host.querySelector('[role="status"]')?.textContent).toBe(strings.copied.en);
  });

  it("follows the window as it turns", () => {
    windowAt(820, 1180);
    render();
    windowAt(1180, 820);
    act(() => void window.dispatchEvent(new Event("resize")));
    expect(row("Viewport")).toMatch(/^1180×820 /);
  });

  it("says why the clipboard refused, and leaves the details to copy by hand", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    windowAt(820, 1180);
    render();
    writeText.mockRejectedValue(new DOMException("Not allowed here", "NotAllowedError"));
    await copy();
    expect(view.host.querySelector('[role="alert"]')?.textContent).toBe(
      strings.notCopied.en.replace("{{reason}}", "Not allowed here"),
    );
    expect(view.host.querySelector("textarea")?.value).toContain("Viewport: 820×1180");
  });
});
