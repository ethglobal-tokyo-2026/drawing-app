// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../api/testing";
import { forgetBootMilestones, readBootMilestones } from "../performance/bootMilestones";
import {
  QUIET_MS,
  followBoardAssembly,
  forgetBoardComplete,
  markBoardComplete,
  usePreloadAfterBoard,
  whenBoardComplete,
  whenBoardQuiet,
} from "./boardComplete";

/** Each image's decode, by URL, answered when a test says. */
const decoding = new Map<string, { settle: (ok: boolean) => void }>();
const decoded = (...urls: string[]) =>
  act(async () => {
    for (const url of urls) decoding.get(url)?.settle(true);
  });

beforeEach(() => {
  forgetBoardComplete();
  forgetBootMilestones();
  decoding.clear();
  vi.stubGlobal(
    "Image",
    class {
      decoding = "auto";
      src = "";
      decode() {
        return new Promise<void>((resolve, reject) =>
          decoding.set(this.src, {
            settle: (ok) => (ok ? resolve() : reject(new Error("broken"))),
          }),
        );
      }
    },
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const steps = () => readBootMilestones().map((m) => m.step);
let complete = false;
const follow = () => {
  complete = false;
  void whenBoardComplete().then(() => (complete = true));
};

describe("the board's first assembly", () => {
  it("completes once every sticker of the fresh board has decoded, and not before", async () => {
    follow();
    followBoardAssembly([{ urls: ["a.png", "a-mask.png"] }, { urls: ["b.png"] }], {
      fresh: true,
    });
    await decoded("a.png", "a-mask.png");
    expect(steps()).toContain("first sticker decoded");
    expect(complete).toBe(false);

    await decoded("b.png");
    expect(complete).toBe(true);
    expect(readBootMilestones().find((m) => m.step === "all stickers")?.detail).toBe(
      "2 stickers, 3 images",
    );
    expect(steps()).toContain("board complete");
  });

  it("takes a broken image as in, so it never holds the board up", async () => {
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: true });
    await act(async () => decoding.get("a.png")?.settle(false));
    expect(complete).toBe(true);
  });

  it("starts the stickers of a board from the phone's storage, and lets the fresh board complete it", async () => {
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: false });
    await decoded("a.png");
    expect(steps()).toContain("first sticker decoded");
    expect(complete).toBe(false);

    // The fresh board's sticker already decoded, so only the new one is waited for.
    followBoardAssembly([{ urls: ["a.png"] }, { urls: ["c.png"] }], { fresh: true });
    expect([...decoding.keys()]).toEqual(["a.png", "c.png"]);
    await decoded("c.png");
    expect(complete).toBe(true);
  });

  it("completes with an empty board at once", async () => {
    follow();
    await act(async () => followBoardAssembly([], { fresh: true }));
    expect(complete).toBe(true);
  });

  it("counts as complete 10s after it first showed, when an image never arrives", async () => {
    vi.useFakeTimers();
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: true });
    await act(async () => vi.advanceTimersByTimeAsync(9_999));
    expect(complete).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(complete).toBe(true);
  });

  it("gives what waited a quiet second after the board is complete", async () => {
    vi.useFakeTimers();
    let quiet = false;
    void whenBoardQuiet().then(() => (quiet = true));
    markBoardComplete();
    await act(async () => vi.advanceTimersByTimeAsync(QUIET_MS - 1));
    expect(quiet).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(1));
    expect(quiet).toBe(true);
  });
});

describe("usePreloadAfterBoard", () => {
  it("loads the parts' code only once the board is complete, a quiet second has passed and the page is idle", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("requestIdleCallback", (run: () => void) => setTimeout(run, 50));
    vi.stubGlobal("cancelIdleCallback", (id: ReturnType<typeof setTimeout>) => clearTimeout(id));
    const part = { preload: vi.fn(() => Promise.resolve()) };
    const parts = [part];
    function Probe() {
      return createElement("i", { "data-idle": usePreloadAfterBoard(parts) });
    }
    const host = document.createElement("div");
    const idle = () => host.querySelector("i")?.dataset.idle;
    const root = createRoot(host);
    act(() => root.render(createElement(Probe)));

    await act(async () => vi.advanceTimersByTimeAsync(5000));
    expect(part.preload).not.toHaveBeenCalled();
    expect(idle()).toBe("false");

    markBoardComplete();
    await act(async () => vi.advanceTimersByTimeAsync(QUIET_MS));
    expect(part.preload).not.toHaveBeenCalled();
    await act(async () => vi.advanceTimersByTimeAsync(50));
    expect(part.preload).toHaveBeenCalledOnce();
    expect(idle()).toBe("true");
    act(() => root.unmount());
  });
});
