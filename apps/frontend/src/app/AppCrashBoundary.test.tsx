// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { strings } from "../i18n/strings";
import { AppCrashBoundary } from "./AppCrashBoundary";

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

function Crashes(): never {
  throw new Error("The sticker board couldn't draw its stickers");
}

describe("a screen that throws as it renders", () => {
  it("leaves a page saying so, with the error's words and Reload, not a blank one", () => {
    act(() =>
      root.render(
        <AppCrashBoundary>
          <Crashes />
        </AppCrashBoundary>,
      ),
    );

    expect(host.textContent).toContain(strings.app.crash.title.en);
    expect(host.textContent).toContain("The sticker board couldn't draw its stickers");
    act(() => host.querySelector("button")?.click());
    expect(reload).toHaveBeenCalledOnce();
  });
});
