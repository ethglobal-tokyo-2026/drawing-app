// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ErrorLine } from "./ErrorLine";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const writeText = vi.fn<(text: string) => Promise<void>>();
let cleanup = () => {};

afterEach(() => {
  cleanup();
  writeText.mockReset();
});

function render(line: React.ReactNode) {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() => root.render(line));
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return host;
}

const button = (host: HTMLElement, name: string) =>
  [...host.querySelectorAll("button")].find((b) => b.textContent === name);

describe("the error line", () => {
  it("says the sentence as an alert, with Try again inside it that asks again", () => {
    const retry = vi.fn();
    const host = render(<ErrorLine onRetry={retry}>Couldn’t load the board.</ErrorLine>);
    const alert = host.querySelector('[role="alert"]');
    expect(alert?.textContent).toBe("Couldn’t load the board. Try again");
    act(() => button(host, "Try again")?.click());
    expect(retry).toHaveBeenCalledOnce();
  });

  it("puts the raw words apart from the sentence, and Copy copies them whole", async () => {
    const detail = "502 · sticker_not_found: GET /api/stickers/aB3xQ";
    writeText.mockResolvedValue();
    const host = render(<ErrorLine detail={detail}>This sticker isn’t here.</ErrorLine>);
    expect(host.querySelector('[role="alert"]')?.textContent).toBe("This sticker isn’t here.");
    expect(host.textContent).toContain(detail);
    await act(async () => button(host, "Copy")?.click());
    expect(writeText).toHaveBeenCalledWith(detail);
  });

  it("says so when the clipboard refuses, shows the raw words whole to copy by hand, and clears it on the next try", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const detail = "502 · sui_unreachable: ".padEnd(300, "x");
    writeText.mockRejectedValueOnce(new DOMException("Not allowed here", "NotAllowedError"));
    const host = render(<ErrorLine detail={detail}>Couldn’t load.</ErrorLine>);
    const words = () => host.querySelector(".copyable-fine-print__text");
    const notice = () => host.querySelector(".copyable-fine-print [role=alert]")?.textContent;
    // The clamp is the class that carries the line count.
    const clamped = () => /__text--\d/.test(words()?.className ?? "");
    expect(clamped()).toBe(true);

    await act(async () => button(host, "Copy")?.click());
    expect(notice()).toContain("Couldn’t copy");
    expect(words()?.textContent).toBe(detail);
    expect(clamped()).toBe(false);

    writeText.mockResolvedValueOnce();
    await act(async () => button(host, "Copy")?.click());
    expect(notice()).toBeUndefined();
    expect(button(host, "Copied")).toBeDefined();
    expect(clamped()).toBe(true);
  });

  it("offers nothing to copy when there are no raw words", () => {
    const host = render(<ErrorLine>The check couldn’t start.</ErrorLine>);
    expect(button(host, "Copy")).toBeUndefined();
  });
});
