// @vitest-environment happy-dom
import { act, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { strings } from "../i18n/strings";
import { lazyWithPreload } from "./lazyWithPreload";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;
const reload = vi.fn<() => void>();

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(location, "reload").mockImplementation(reload);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  reload.mockReset();
});

describe("a lazy screen whose code doesn't load", () => {
  it("leaves the app up, and says so with Reload", async () => {
    // WebKit's words for every failed import, whichever chunk it was.
    const Screen = lazyWithPreload("the sticker detail", () =>
      Promise.reject(new TypeError("Importing a module script failed.")),
    );
    await act(async () =>
      root.render(
        <>
          <p>The board</p>
          <Suspense fallback={null}>
            <Screen />
          </Suspense>
        </>,
      ),
    );

    expect(host.textContent).toBe("The board");
    const note = document.querySelector("[role=alert]");
    expect(note?.textContent).toContain(strings.ui.lazyScreen.didntLoad.en);
    expect(note?.textContent).toContain("the sticker detail");
    act(() => note?.querySelector("button")?.click());
    expect(reload).toHaveBeenCalledOnce();
  });
});
