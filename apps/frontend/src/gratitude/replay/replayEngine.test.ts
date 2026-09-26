// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mountReplayEngine, type ReplayEngine, type ReplayEngineOptions } from "../miniGameEngine";
import { createReplayRecorder } from "../replayRecorder";
import type { FeedInput, ReplayFeed } from "./replayFeed";
import { createReplayDriver } from "./replayInput";
import { feedOf, handFrames } from "./testing";

const { log, watch } = vi.hoisted(() => {
  const log: { name: string; args: unknown[] }[] = [];
  /** Keeps every call to the named methods in `log`, in order. */
  const watch = <T extends object>(target: T, names: readonly string[]): T => {
    for (const name of names) {
      const method: unknown = Reflect.get(target, name);
      if (typeof method !== "function") throw new Error(`Nothing called ${name} to watch`);
      Reflect.set(target, name, (...args: unknown[]) => {
        log.push({ name, args });
        const result: unknown = Reflect.apply(method, target, args);
        return result;
      });
    }
    return target;
  };
  return { log, watch };
});
vi.mock("../combo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../combo")>();
  return {
    ...actual,
    createGratitudeCombo: (...args: Parameters<typeof actual.createGratitudeCombo>) =>
      watch(actual.createGratitudeCombo(...args), [
        "tapHeart",
        "commitTo",
        "countStrokePass",
        "countShakeReversal",
        "endCombo",
      ]),
  };
});
vi.mock("../replayRecorder", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../replayRecorder")>();
  return { ...actual, createReplayRecorder: vi.fn(actual.createReplayRecorder) };
});

/** The engine's time of the combo's first hit. */
const FIRST_HIT_AT = 100;
/** The times, after the first hit, the rules heard `name` at: each call's one number. */
const heardAt = (name: string) =>
  log
    .filter((call) => call.name === name)
    .map(({ args }) => Number(args.find((arg) => typeof arg === "number")) - FIRST_HIT_AT);
const tap = (at: number): FeedInput => ({
  kind: "touch",
  at,
  point: { x: 195, y: 440 },
  counted: true,
});

let host: HTMLDivElement;
let engine: ReplayEngine | null = null;
/** Every Web Animation the effects started. */
const animations: Animation[] = [];

/** Mounts a replay engine on a fresh stage, fed `inputs`; returns its frames' hand. */
function replay(
  inputs: readonly FeedInput[],
  end: ReplayFeed["end"],
  options: Partial<Pick<ReplayEngineOptions, "speed" | "scale">> = {},
) {
  const { frames, run } = handFrames();
  const part = () => host.appendChild(document.createElement("div"));
  const drive = createReplayDriver(feedOf(inputs, end), {
    firstHitAt: FIRST_HIT_AT,
    startsWithStroke: false,
  });
  engine = mountReplayEngine(
    { root: host, page: part(), ground: part(), hud: part(), stage: part() },
    {
      seed: 7,
      intensity: 0.7,
      reduced: false,
      frames,
      speed: 1,
      layout: { frame: { above: 64 }, hudTop: 10, fallback: { width: 390, height: 741 } },
      scale: 1,
      inputScale: 1,
      miniHearts: 40,
      landAt: () => null,
      drive,
      onEnded: (record) => record.total,
      onLanded: vi.fn(),
      onError: vi.fn(),
      ...options,
    },
  );
  return run;
}

beforeEach(() => {
  // happy-dom runs no Web Animations; a stand-in keeps the effects' calls harmless.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => {
    const animation = new Animation();
    animations.push(animation);
    return animation;
  });
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  engine?.destroy();
  engine = null;
  host.remove();
  vi.restoreAllMocks();
  vi.mocked(createReplayRecorder).mockClear();
  log.length = 0;
  animations.length = 0;
});

describe("mountReplayEngine", () => {
  it("plays a recorded combo's touches through the rules at their times, and its end", async () => {
    const run = replay([tap(0), tap(90), tap(200), tap(330)], { at: 400, reason: "closed" });
    await run(1000);
    expect(heardAt("tapHeart")).toEqual([0, 90, 200, 330]);
    expect(heardAt("endCombo")).toEqual([400]);
  });

  it("records nothing and listens to nothing, and its heart is inert and hidden", async () => {
    const listened = [
      vi.spyOn(window, "addEventListener"),
      vi.spyOn(document, "addEventListener"),
      vi.spyOn(HTMLElement.prototype, "addEventListener"),
    ];
    const run = replay([tap(0), tap(90)], { at: 400, reason: "closed" });
    await run(200);
    const inputs = ["pointer", "key", "click", "blur", "touch", "visibility", "pagehide", "device"];
    const heard = listened.flatMap((spy) => spy.mock.calls.map(([type]) => type));
    expect(heard.filter((type) => inputs.some((kind) => type.startsWith(kind)))).toEqual([]);
    expect(createReplayRecorder).not.toHaveBeenCalled();

    const button = host.querySelector<HTMLButtonElement>(".gr-heart-btn");
    expect(button?.inert).toBe(true);
    expect(host.querySelector(".gr-heart-anchor")?.getAttribute("aria-hidden")).toBe("true");
    button?.click();
    button?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    await run(50);
    expect(heardAt("tapHeart")).toEqual([0, 90]);
  });

  it("unlocks stroke with the passes a replay forces, then counts each fast one as a hit", async () => {
    const move = (at: number, y: number, fastPass: boolean): FeedInput => ({
      kind: "strokeMove",
      at,
      point: { x: 195, y },
      fastPass,
    });
    const run = replay(
      [
        tap(0),
        { kind: "strokeStart", at: 100, point: { x: 195, y: 600 } },
        move(150, 540, true),
        move(200, 600, true),
        move(250, 540, true),
        move(300, 600, false),
        move(350, 540, true),
      ],
      { at: 700, reason: "closed" },
    );
    await run(1000);
    // Once a tap combo runs, two fast passes in a row unlock stroke.
    expect(heardAt("commitTo")).toEqual([200]);
    expect(heardAt("countStrokePass")).toEqual([250, 350]);
  });

  it("unlocks shake at the first reversal, then counts each one after it", async () => {
    const reversal = (at: number, direction: 1 | -1): FeedInput => ({
      kind: "reversal",
      at,
      direction,
    });
    const run = replay([tap(0), reversal(100, 1), reversal(180, -1), reversal(260, 1)], {
      at: 700,
      reason: "closed",
    });
    await run(1000);
    expect(heardAt("commitTo")).toEqual([100]);
    expect(heardAt("countShakeReversal")).toEqual([180, 260]);
  });

  it("keeps its Web Animations to its clock's speed", async () => {
    const run = replay([tap(0), tap(90), tap(200)], { at: 400, reason: "closed" }, { speed: 2 });
    await run(200);
    expect(animations.length).toBeGreaterThan(0);
    expect(animations.filter((a) => a.playbackRate !== 2)).toEqual([]);
  });

  it("draws its lettering at its stage's scale, with no gloss", async () => {
    const slamPx = async (scale: number) => {
      const run = replay([tap(0)], { at: 400, reason: "closed" }, { scale });
      await run(FIRST_HIT_AT + 50);
      const slam = host.querySelector<HTMLElement>(".gr-slam");
      if (!slam) throw new Error("The first tap slammed no tier name");
      expect(slam.querySelector<HTMLElement>(".gr-cap-gloss")?.hidden).toBe(true);
      engine?.destroy();
      engine = null;
      host.replaceChildren();
      return parseFloat(slam.style.fontSize);
    };
    const full = await slamPx(1);
    expect(await slamPx(0.5)).toBeCloseTo(full / 2, 0);
  });
});
