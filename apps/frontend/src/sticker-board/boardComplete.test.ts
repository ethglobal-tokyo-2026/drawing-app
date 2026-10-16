// @vitest-environment happy-dom
import { act, createElement } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../api/testing";
import { forgetBootMilestones, readBootMilestones } from "../performance/bootMilestones";
import { CreaseStore, creaseJobs } from "./useCreases";
import { fieldOf, PHONE_BOARD, unitOf } from "./placement";
import { testBoardSticker } from "./testBoardSticker";
import {
  GIVE_UP_MS,
  QUIET_MS,
  assemblyOf,
  followBoardAssembly,
  forgetBoardComplete,
  markBoardComplete,
  usePreloadAfterBoard,
  whenBoardComplete,
  whenBoardQuiet,
} from "./boardComplete";

const material = vi.hoisted(() => ({
  settled:
    vi.fn<(canvas: HTMLCanvasElement, expected: unknown, signal: AbortSignal) => Promise<void>>(),
}));
vi.mock("../stickers/stickerRenderer", () => ({ whenStickerSettled: material.settled }));
const materialDecodes = new Map<HTMLCanvasElement, () => void>();

function placedCanvas(root: HTMLElement, left = 20) {
  const sticker = document.createElement("div");
  sticker.className = "placed-sticker";
  sticker.dataset.stickerId = "top";
  const canvas = document.createElement("canvas");
  canvas.className = "sticker-material";
  canvas.dataset.state = "loading";
  Object.defineProperties(canvas, {
    clientWidth: { value: 120 },
    clientHeight: { value: 120 },
  });
  vi.spyOn(canvas, "getBoundingClientRect").mockReturnValue(new DOMRect(left, 20, 120, 120));
  sticker.append(canvas);
  root.append(sticker);
  return canvas;
}

function materialBoard(left = 20) {
  const root = document.createElement("div");
  document.body.append(root);
  const canvas = placedCanvas(root, left);
  const creases = new CreaseStore();
  return { root, canvas, creases, active: true };
}

const commitFrame = () => act(async () => vi.advanceTimersByTimeAsync(20));

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
  materialDecodes.clear();
  material.settled.mockReset();
  material.settled.mockImplementation(
    (canvas: HTMLCanvasElement, _expected: unknown, signal: AbortSignal) =>
      new Promise<void>((resolve) => {
        materialDecodes.set(canvas, resolve);
        signal.addEventListener("abort", () => resolve(), { once: true });
      }),
  );
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
  forgetBoardComplete();
  document.body.replaceChildren();
  vi.restoreAllMocks();
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
  it("waits for a displayed baked foil while leaving future sharp refinements out of boot", async () => {
    const sticker = testBoardSticker({
      urls: { png: "a.png", mask: "a-mask.png", foil: "a-foil.png", sharp: "a-sharp.png" },
    });
    follow();
    followBoardAssembly(
      assemblyOf([sticker], () => "holo"),
      { fresh: true },
    );
    await decoded("a.png", "a-mask.png");
    expect(complete).toBe(false);
    expect(decoding.has("a-sharp.png")).toBe(false);
    await decoded("a-foil.png");
    expect(complete).toBe(true);
  });

  it.each([null, "kyoto-seika"] as const)(
    "doesn't load an unused baked foil for %s",
    async (tone) => {
      const sticker = testBoardSticker({
        urls: { png: "a.png", mask: "a-mask.png", foil: "a-foil.png" },
      });
      follow();
      followBoardAssembly(
        assemblyOf([sticker], () => tone),
        { fresh: true },
      );
      await decoded("a.png", "a-mask.png");
      expect(complete).toBe(true);
      expect(decoding.has("a-foil.png")).toBe(false);
    },
  );

  it("waits for the initial visible coating after the print and cut have decoded", async () => {
    vi.useFakeTimers();
    const materials = materialBoard();
    materials.creases.want([]);
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: true, materials });
    await decoded("a.png");
    await commitFrame();
    expect(complete).toBe(false);
    expect(material.settled).toHaveBeenCalledWith(
      materials.canvas,
      { normal: undefined },
      expect.any(AbortSignal),
    );
    await act(async () => materialDecodes.get(materials.canvas)?.());
    expect(complete).toBe(true);
  });

  it("waits for the initial crease normal to commit and finish uploading", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("URL", { createObjectURL: () => "baseline-normal", revokeObjectURL: () => {} });
    const materials = materialBoard();
    materials.canvas.dataset.state = "ready";
    const [job] = creaseJobs(
      ["lower", "top"].map((id) => ({
        id,
        width: 120,
        height: 120,
        urls: { png: `${id}.png`, mask: `${id}-mask.png` },
        placement: { on: true, x: 0.5, y: 0.5, s: 0.4, r: 0, z: 1 },
      })),
      fieldOf(PHONE_BOARD.W, PHONE_BOARD.H),
      unitOf("phone", PHONE_BOARD.W),
      () => null,
      1,
    );
    materials.creases.want([job]);
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: true, materials });
    await decoded("a.png");
    await commitFrame();
    expect(complete).toBe(false);
    expect(material.settled).not.toHaveBeenCalled();
    const image = new Blob(["crease"]);
    await act(async () =>
      materials.creases.land({
        ok: true,
        board: "board",
        id: job.id,
        key: job.key,
        crease: { base: image, normal: image, height: image },
        timings: { decode: 0, draw: 0, shade: 0, encode: 0, total: 0 },
      }),
    );
    expect(material.settled).not.toHaveBeenCalled();
    await commitFrame();
    expect(material.settled).toHaveBeenCalledWith(
      materials.canvas,
      { normal: "baseline-normal" },
      expect.any(AbortSignal),
    );
    expect(complete).toBe(false);
    await act(async () => materialDecodes.get(materials.canvas)?.());
    expect(complete).toBe(true);
  });

  it.each(["offscreen", "inactive"] as const)(
    "doesn't wait for an initially %s coating",
    async (hidden) => {
      vi.useFakeTimers();
      const materials = materialBoard(hidden === "offscreen" ? window.innerWidth + 10 : 20);
      materials.active = hidden !== "inactive";
      materials.creases.want([]);
      follow();
      followBoardAssembly([{ urls: ["a.png"] }], { fresh: true, materials });
      await decoded("a.png");
      await commitFrame();
      expect(complete).toBe(true);
      expect(material.settled).not.toHaveBeenCalled();
    },
  );

  it("keeps the overall deadline when an initial coating never settles", async () => {
    vi.useFakeTimers();
    const materials = materialBoard();
    materials.creases.want([]);
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: true, materials });
    await decoded("a.png");
    await commitFrame();
    expect(complete).toBe(false);
    await act(async () => vi.advanceTimersByTimeAsync(GIVE_UP_MS));
    expect(complete).toBe(true);
    expect(material.settled.mock.calls[0][2].aborted).toBe(true);
  });

  it("releases a removed board's material wait without marking it complete", async () => {
    vi.useFakeTimers();
    const materials = materialBoard();
    materials.creases.want([]);
    follow();
    const stop = followBoardAssembly([{ urls: ["a.png"] }], { fresh: true, materials });
    await decoded("a.png");
    await commitFrame();
    await act(async () => stop?.());
    expect(material.settled.mock.calls[0][2].aborted).toBe(true);
    expect(complete).toBe(false);
  });

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

  it("counts as complete once it has waited GIVE_UP_MS, when an image never arrives", async () => {
    vi.useFakeTimers();
    follow();
    followBoardAssembly([{ urls: ["a.png"] }], { fresh: true });
    await act(async () => vi.advanceTimersByTimeAsync(GIVE_UP_MS - 1));
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
