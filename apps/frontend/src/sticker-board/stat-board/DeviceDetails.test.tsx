// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { stickerBoard } from "../../i18n/strings/stickerBoard";
import { onLargeScreen } from "../../ui/testing";
import { DeviceDetails } from "./DeviceDetails";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const strings = stickerBoard.developer.device;
const writeText = vi.fn<(text: string) => Promise<void>>();
let host: HTMLDivElement;
let root: Root;

/** The window at `width` × `height`. */
function windowAt(width: number, height: number) {
  vi.spyOn(window, "innerWidth", "get").mockReturnValue(width);
  vi.spyOn(window, "innerHeight", "get").mockReturnValue(height);
}
/** The paper's value for `label`. */
const row = (label: string) =>
  [...host.querySelectorAll(".account-rows__row")]
    .find((r) => r.querySelector("dt")?.textContent === label)
    ?.querySelector("dd")?.textContent;
const copy = () =>
  act(async () =>
    [...host.querySelectorAll("button")].find((b) => b.textContent === strings.copy.en)?.click(),
  );
// No ToastProvider: the board's tests show the slip without one, so the paper mustn't need it.
const render = () => act(() => root.render(<DeviceDetails />));

beforeEach(() => {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  writeText.mockReset();
  vi.restoreAllMocks();
});

describe("DeviceDetails", () => {
  it("says what the device says, and whether the app takes the large layout, and copies it whole", async () => {
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
    expect(host.querySelector('.device-details [role="status"]')?.textContent).toBe(
      strings.copied.en,
    );
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
    expect(host.querySelector('[role="alert"]')?.textContent).toBe(
      strings.notCopied.en.replace("{{reason}}", "Not allowed here"),
    );
    expect(host.querySelector("textarea")?.value).toContain("Viewport: 820×1180");
  });
});
