// @vitest-environment happy-dom
import { act } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ToastProvider } from "../ui/ToastProvider";
import { AccountRow } from "./AccountRow";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const writeText = vi.fn<(text: string) => Promise<void>>();
let cleanup = () => {};

afterEach(() => {
  cleanup();
  writeText.mockReset();
  vi.restoreAllMocks();
});

function render() {
  Object.defineProperty(navigator, "clipboard", { value: { writeText }, configurable: true });
  const host = document.createElement("div");
  document.body.append(host);
  const root = createRoot(host);
  act(() =>
    root.render(
      <ToastProvider>
        <dl>
          <AccountRow label="Privy ID" value="did:privy:abc" copyable />
        </dl>
      </ToastProvider>,
    ),
  );
  cleanup = () => {
    act(() => root.unmount());
    host.remove();
  };
  return host;
}

const copy = (host: HTMLElement) =>
  act(async () => host.querySelector<HTMLButtonElement>("button")?.click());

describe("an account row's Copy", () => {
  it("keeps a copy the clipboard refused under the row until the next try", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    writeText.mockRejectedValueOnce(new DOMException("Not allowed here", "NotAllowedError"));
    const host = render();
    await copy(host);
    const problem = () => host.querySelector('[role="alert"]')?.textContent;
    expect(problem()).toContain("Couldn’t copy the privy id");

    writeText.mockResolvedValueOnce();
    await copy(host);
    expect(problem()).toBeUndefined();
    expect(writeText).toHaveBeenLastCalledWith("did:privy:abc");
    expect(host.querySelector('[role="status"]')?.textContent).toBe("Privy ID copied");
  });
});
