// @vitest-environment happy-dom
import { act, Suspense } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { strings } from "../i18n/strings";
import { lazyWithPreload } from "./lazyWithPreload";
import { beforeAccountRelease, retryAccountRelease } from "../api/sessionLoss";
import { BoardPlacementSaves } from "../sticker-board/boardPlacementSaves";
import { emptyApi } from "../api/testing";

let host: HTMLDivElement;
let root: Root;
const reload = vi.fn<() => void>();
let stopPreservation = () => {};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(location, "reload").mockImplementation(reload);
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  stopPreservation = () => {};
});

afterEach(() => {
  stopPreservation();
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  reload.mockReset();
});

describe("a lazy screen whose code doesn't load", () => {
  it("keeps its manual Reload behind the same unfinished-position preservation gate", async () => {
    let blocked = true;
    const kept = new Map<string, string>();
    const saves = new BoardPlacementSaves(emptyApi(), "me", {
      getItem: (key) => kept.get(key) ?? null,
      setItem: (key, value) => {
        if (blocked) throw new Error("full");
        kept.set(key, value);
      },
      removeItem: (key) => {
        kept.delete(key);
      },
    });
    saves.save(
      { id: "sticker-a", no: 42 },
      { phone: { on: true, x: 0.5, y: 0.5, r: 0, s: 0.3, z: 1 } },
    );
    stopPreservation = beforeAccountRelease({
      userId: "me",
      preservationError: () => saves.read().preservationError,
      retryPreservation: () => saves.retryPreservation(),
      blocked: () => {},
    });
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
    const note = document.querySelector("[role=alert]");
    act(() => note?.querySelector("button")?.click());
    expect(reload).not.toHaveBeenCalled();
    expect(host.textContent).toBe("The board");
    expect(saves.pendingSpots().get("sticker-a")?.phone?.x).toBe(0.5);
    blocked = false;
    retryAccountRelease("me", () => {});
    expect(reload).toHaveBeenCalledOnce();
    expect(kept.get("croquis.board-placement-saves.me")).toContain("sticker-a");
  });
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
    // What the browser said is fine print beside Copy, for a report.
    expect(document.body.textContent).toContain("the sticker detail");
    act(() => note?.querySelector("button")?.click());
    expect(reload).toHaveBeenCalledOnce();
  });
});
