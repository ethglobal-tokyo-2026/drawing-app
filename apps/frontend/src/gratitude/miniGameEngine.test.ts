// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayV1 } from "../api/contract";
import type { ComboRecord } from "./combo";
import { GAME_CONFIG } from "./gameConfig";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";

const { rain } = vi.hoisted(() => ({ rain: vi.fn() }));
// 昇天's rain, counted.
vi.mock("./miniHeartPhysics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./miniHeartPhysics")>();
  return {
    ...actual,
    createMiniHeartPhysics: (...args: Parameters<typeof actual.createMiniHeartPhysics>) => {
      const physics = actual.createMiniHeartPhysics(...args);
      const { rainFromTop } = physics;
      return Object.assign(physics, {
        rainFromTop: () => {
          rain();
          rainFromTop();
        },
      });
    },
  };
});

const onRecord = vi.fn<(record: ComboRecord, replay: ReplayV1) => void>();
let host: HTMLDivElement;
let engine: MiniGameEngine;

const heartButton = () => {
  const el = document.querySelector<HTMLButtonElement>(".gr-heart-btn");
  if (!el) throw new Error("No heart on screen");
  return el;
};
const key = (type: "keydown" | "keyup", repeat = false) =>
  heartButton().dispatchEvent(new KeyboardEvent(type, { key: "Enter", repeat, bubbles: true }));
/** Enter on the heart: a tap on its middle. */
const pressHeart = () => {
  key("keydown");
  key("keyup");
};
const play = (ms: number) => vi.advanceTimersByTimeAsync(ms);
/** Taps the heart `times` times, `gapMs` apart. */
const mash = async (times: number, gapMs = 70) => {
  for (let i = 0; i < times; i++) {
    pressHeart();
    await play(gapMs);
  }
};
const live = () => document.getElementById("live")?.textContent;

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
    ],
  });
  // happy-dom runs no Web Animations; a stand-in keeps the effects' calls harmless.
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
  host = document.createElement("div");
  document.body.append(host);
  const part = () => host.appendChild(document.createElement("div"));
  engine = mountMiniGameEngine(
    {
      root: host,
      page: part(),
      ground: part(),
      hud: part(),
      stage: part(),
      hint: part(),
      live: Object.assign(part(), { id: "live" }),
      giverPhoto: part(),
      giverDot: part(),
      fuu: part(),
    },
    {
      giverHandle: "@alice",
      intensity: 0.7,
      reduced: false,
      showFrameTimes: false,
      onRecord,
      onFinished: vi.fn(),
      onError: vi.fn(),
    },
  );
});

afterEach(() => {
  engine.destroy();
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  onRecord.mockReset();
  rain.mockReset();
});

describe("mountMiniGameEngine", () => {
  it("passes a one-tap send's replay out with its record", async () => {
    pressHeart();
    await play(GAME_CONFIG.catchWindowMs + 200);
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [record, replay] = onRecord.mock.calls[0];
    expect(record.hits).toBe(1);
    expect(replay).toMatchObject({
      v: 1,
      intensity: 0.7,
      durationMs: record.durationMs,
      endReason: "sent",
      switchedAtHit: null,
      strokes: [],
      shakes: [],
    });
    // A key taps the heart's middle, half way across the stage.
    expect(replay.hits).toHaveLength(4);
    expect(replay.hits[0]).toBe(0);
    expect(replay.hits[1]).toBe(5000);
    expect(replay.hits[3]).toBe(1);
  });

  it("records every tap, and the X's end as closed", async () => {
    pressHeart();
    await play(200);
    pressHeart();
    await play(100);
    pressHeart();
    await play(100);
    engine.close();
    expect(onRecord).toHaveBeenCalledTimes(1);
    const [record, replay] = onRecord.mock.calls[0];
    expect(record.hits).toBe(3);
    expect(replay.endReason).toBe("closed");
    const steps = replay.hits.filter((_, i) => i % 4 === 0);
    const counted = replay.hits.filter((_, i) => i % 4 === 3);
    expect(counted).toEqual([1, 1, 1]);
    expect(steps.reduce<number[]>((times, ms) => [...times, (times.at(-1) ?? 0) + ms], [])).toEqual(
      record.hitTimes,
    );
  });

  it("takes a click alone as a tap on the heart's middle, as Voice Control and Switch Control make", async () => {
    heartButton().click();
    await play(200);
    heartButton().click();
    await play(100);
    engine.close();
    const [record, replay] = onRecord.mock.calls[0] ?? [];
    expect(record?.hits).toBe(2);
    // Like a key, half way across the stage.
    expect(replay?.hits[1]).toBe(5000);
  });

  it("counts a finger's tap once, not again as the click that follows it", async () => {
    const button = heartButton();
    const at = { clientX: 195, clientY: 440, bubbles: true, isPrimary: true, pointerId: 7 };
    const tap = () => {
      button.dispatchEvent(new PointerEvent("pointerdown", at));
      button.dispatchEvent(new PointerEvent("pointerup", at));
      button.click();
    };
    tap();
    await play(200);
    tap();
    await play(100);
    engine.close();
    expect(onRecord.mock.calls[0]?.[0].hits).toBe(2);
  });

  it("counts a held key once, whatever it repeats", async () => {
    key("keydown");
    for (let i = 0; i < 10; i++) key("keydown", true);
    key("keyup");
    await play(200);
    key("keydown");
    for (let i = 0; i < 10; i++) key("keydown", true);
    key("keyup");
    await play(100);
    engine.close();
    expect(onRecord.mock.calls[0]?.[0].hits).toBe(2);
  });

  it("disables the heart as the combo ends, so focus can't stay on it", async () => {
    pressHeart();
    expect(heartButton().disabled).toBe(false);
    await play(GAME_CONFIG.catchWindowMs + 200);
    expect(heartButton().disabled).toBe(true);
  });

  it("lets the catch's words stand, not the score's", async () => {
    pressHeart();
    await play(100);
    pressHeart();
    expect(live()).toBe("Caught it. Keep tapping before the bar runs out.");
  });

  it("says a tier-up's name", async () => {
    for (let i = 0; i < 30 && host.dataset.tier !== "1"; i++) await mash(1);
    expect(host.dataset.tier).toBe("1");
    expect(live()).toBe("Blushing.");
  });

  it("says the gratitude sent as the heart reaches the giver", async () => {
    await mash(6);
    await play(8000);
    const total = onRecord.mock.calls[0]?.[0].total ?? 0;
    expect(total).toBeGreaterThan(0);
    expect(live()).toBe(`Sent ${total.toLocaleString("en-US")} gratitude to @alice.`);
  });

  it("rains hearts from オーバーヒート up", async () => {
    await mash(40);
    expect(Number(host.dataset.tier)).toBeGreaterThanOrEqual(3);
    expect(rain).toHaveBeenCalled();
  });

  it("drops no rain with reduced motion", async () => {
    engine.setReduced(true);
    await mash(40);
    expect(Number(host.dataset.tier)).toBeGreaterThanOrEqual(3);
    expect(rain).not.toHaveBeenCalled();
  });
});
