// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayV1 } from "../api/contract";
import type { ComboRecord } from "./combo";
import { GAME_CONFIG } from "./gameConfig";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";

const onRecord = vi.fn<(record: ComboRecord, replay: ReplayV1) => void>();
let host: HTMLDivElement;
let engine: MiniGameEngine;

/** Enter on the heart: a tap on its middle. */
const pressHeart = () =>
  document
    .querySelector(".gr-heart-btn")
    ?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
const play = (ms: number) => vi.advanceTimersByTimeAsync(ms);

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
      live: part(),
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
});
