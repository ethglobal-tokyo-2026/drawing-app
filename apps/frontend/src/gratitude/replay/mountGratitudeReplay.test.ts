// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayV1 } from "@drawing-app/api/client";
import { formatCount } from "../../i18n/format";
import { createGratitudeCombo, type ComboRecord } from "../combo";
import { GAME_CONFIG, PLAYED_CONFIGS, type GameConfig } from "../gameConfig";
import { saveMiniGameDemoSettings } from "../miniGameDemoSettings";
import type { HeartBox } from "../miniHeartPhysics";
import { endOf, session } from "../testCombos";
import {
  mountGratitudeReplay,
  type GratitudeReplayHandle,
  type GratitudeReplayOptions,
} from "./mountGratitudeReplay";
import { REPLAY_REAL_TIME_MS, type FeedInput, type ReplayFeed } from "./replayFeed";
import { feedOf, handFrames } from "./testing";

const { rain, picked } = vi.hoisted(() => {
  /** Every pop-in word picked, in order. */
  const picked: string[] = [];
  return { rain: { count: 0 }, picked };
});
vi.mock("../popInWords", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../popInWords")>();
  return {
    ...actual,
    createPopInPicker: (random: () => number) => {
      const pick = actual.createPopInPicker(random);
      return (...args: Parameters<typeof pick>) => {
        const word = pick(...args);
        if (word) picked.push(word.jp);
        return word;
      };
    },
  };
});
// The app keeps an older game config, with a slower bar, as it would after a rule number changed.
vi.mock("../gameConfig", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../gameConfig")>();
  const older = { ...actual.GAME_CONFIG, version: "older", drainStart: 0.05 };
  return { ...actual, PLAYED_CONFIGS: [older, ...actual.PLAYED_CONFIGS] };
});
vi.mock("../miniHeartPhysics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../miniHeartPhysics")>();
  return {
    ...actual,
    createMiniHeartPhysics: (...args: Parameters<typeof actual.createMiniHeartPhysics>) => {
      const physics = actual.createMiniHeartPhysics(...args);
      const { rainFromTop } = physics;
      return {
        ...physics,
        hearts: physics.hearts,
        rainFromTop: () => {
          rain.count++;
          rainFromTop();
        },
      };
    },
  };
});

/** Taps 70 ms apart, which reach オーバーヒート. */
const TAPS = Array.from({ length: 40 }, (_, i) => i * 70);
const LANDING = { x: 20, y: -30 };

/** A tap combo's record, as `config`'s rules score `times` with nothing after the last. */
function tapRecord(times: readonly number[], config: GameConfig = GAME_CONFIG): ComboRecord {
  const combo = createGratitudeCombo(config);
  const events = times.flatMap((at) => combo.tapHeart(at));
  const ended = endOf([...events, ...combo.advanceTo(config.maxDurationMs + 1)]);
  if (!ended) throw new Error("The taps never ended");
  return ended.record;
}

/** A replay of `record` whose series its fake feed stands in for. */
const replayOf = (record: ComboRecord, endReason: ReplayV1["endReason"] = "empty"): ReplayV1 => ({
  v: 1,
  seed: 7,
  intensity: 0.7,
  stage: [390, 741],
  durationMs: record.durationMs,
  endReason,
  switchedAtHit: record.switchedAtHit,
  hits: [],
  strokes: [],
  shakes: [],
});

const storedOf = (record: ComboRecord): GratitudeReplayOptions["gratitude"] => ({
  giftId: "0xgift",
  method: record.method,
  hits: record.hits,
  total: record.total,
  peakTier: record.peakTier,
  gameConfigVersion: record.gameConfigVersion,
});

/** Taps on the replay's own heart at each of `times`. */
const tapsOn =
  (times: readonly number[]) =>
  (heart: HeartBox): FeedInput[] =>
    times.map((at) => ({ kind: "touch", at, point: { x: heart.x, y: heart.y }, counted: true }));

let host: HTMLDivElement;
let handle: GratitudeReplayHandle | null = null;
let settled: "landed" | "stopped" | null = null;

/** Mounts a replay of `times` tapped, fed by a fake feed; `options` stand in for what the card passes. */
function play(
  times: readonly number[],
  options: Partial<GratitudeReplayOptions> = {},
  end?: ReplayFeed["end"],
) {
  const record = tapRecord(times);
  const { frames, run, asked } = handFrames();
  const replay = options.replay ?? replayOf(record);
  handle = mountGratitudeReplay(
    host,
    {
      replay,
      gratitude: storedOf(record),
      landAt: () => LANDING,
      reduced: false,
      frames,
      ...options,
    },
    (_replay, heart) =>
      feedOf(tapsOn(times)(heart), end ?? { at: replay.durationMs, reason: replay.endReason }),
  );
  void handle.finished.then((how) => {
    settled = how;
  });
  return { record, run, asked, handle };
}

const amount = () => host.querySelector(".gr-amount b")?.textContent;

beforeEach(() => {
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => new Animation());
  Object.defineProperty(document, "fonts", {
    value: { ready: Promise.resolve() },
    configurable: true,
  });
  host = document.createElement("div");
  document.body.append(host);
});

afterEach(() => {
  handle?.stop();
  handle = null;
  settled = null;
  rain.count = 0;
  host.remove();
  localStorage.clear();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mountGratitudeReplay", () => {
  it("plays the combo in a stage hidden from assistive tech, lands, and says so", async () => {
    const warn = vi.spyOn(console, "warn");
    const { record, run } = play(TAPS);
    expect(host.querySelector(".gr")?.getAttribute("aria-hidden")).toBe("true");
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(settled).toBe("landed");
    expect(amount()).toBe(formatCount(record.total));
    expect(host.querySelector<HTMLElement>(".gr-heart-anchor")?.style.opacity).toBe("0");
    expect(warn).not.toHaveBeenCalled();
  });

  it("replays a recorded combo to the figures it was recorded with", async () => {
    const warn = vi.spyOn(console, "warn");
    const s = session();
    for (const at of TAPS) {
      s.frame(1000 + at);
      s.tap(1000 + at, 180 + (at % 50), 390 + (at % 40));
    }
    s.frame(1000 + GAME_CONFIG.maxDurationMs + 1);
    const { ended, replay } = s.finish();
    const { frames, run } = handFrames();
    handle = mountGratitudeReplay(host, {
      replay,
      gratitude: storedOf(ended.record),
      landAt: () => null,
      reduced: false,
      frames,
    });
    await run(REPLAY_REAL_TIME_MS * 2);
    expect(await handle.finished).toBe("landed");
    expect(warn).not.toHaveBeenCalled();
    expect(amount()).toBe(formatCount(ended.record.total));
  });

  it("melts 昇天's rain once it lands, so nothing stays piled on the card and its frames stop", async () => {
    const { run, asked } = play(TAPS);
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(settled).toBe("landed");
    expect(rain.count).toBeGreaterThan(0);
    await run(2000);
    expect(asked()).toBe(false);
  });

  it("counts its HUD up to the total when the combo was closed right after its last hit", async () => {
    const lastTap = TAPS.at(-1) ?? 0;
    const { record, run } = play(TAPS, { reduced: true }, { at: lastTap + 10, reason: "closed" });
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(settled).toBe("landed");
    expect(amount()).toBe(formatCount(record.total));
  });

  it("ends on the stored total when its own count differs, and names the gift", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const record = tapRecord(TAPS);
    const { run } = play(TAPS, { gratitude: { ...storedOf(record), total: record.total + 500 } });
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(settled).toBe("landed");
    expect(amount()).toBe(formatCount(record.total + 500));
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("0xgift"));
  });

  it("replays a combo under the game config it was played under, when the app still has it", async () => {
    const warn = vi.spyOn(console, "warn");
    const older = PLAYED_CONFIGS.find(({ version }) => version === "older");
    if (!older) throw new Error("The older config isn't kept");
    // A pause the older, slower bar bridges, where today's would have run out before the second tap.
    const times = [0, 4000];
    expect(tapRecord(times).hits).toBe(1);
    const record = tapRecord(times, older);
    expect(record.hits).toBe(2);
    const { run } = play(times, { replay: replayOf(record), gratitude: storedOf(record) });
    await run(REPLAY_REAL_TIME_MS * 3);
    expect(settled).toBe("landed");
    // It counted what the record says, so it ran under the rules the record was played with.
    expect(warn).not.toHaveBeenCalled();
    expect(amount()).toBe(formatCount(record.total));
  });

  it("plays a combo from a game config the app no longer has under this one, and says which", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const record = tapRecord(TAPS);
    const { run } = play(TAPS, { gratitude: { ...storedOf(record), gameConfigVersion: "old" } });
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(settled).toBe("landed");
    expect(warn).toHaveBeenCalledWith(expect.stringMatching(/0xgift.*old/));
  });

  it("stops at once, and takes its stage away", async () => {
    const { run, handle: playing } = play(TAPS);
    await run(500);
    playing.stop();
    expect(await playing.finished).toBe("stopped");
    expect(host.children).toHaveLength(0);
  });

  it("frees its mini hearts' canvases as it stops", async () => {
    const { run, handle: playing } = play(TAPS);
    await run(500);
    const canvases = [...host.querySelectorAll("canvas")];
    expect(canvases.length).toBeGreaterThan(0);
    playing.stop();
    for (const canvas of canvases) expect([canvas.width, canvas.height]).toEqual([0, 0]);
  });

  it("fails with the engine's own words, which the card shows as the reason", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const record = tapRecord(TAPS);
    const { frames, run } = handFrames();
    handle = mountGratitudeReplay(
      host,
      {
        replay: replayOf(record),
        gratitude: storedOf(record),
        landAt: () => LANDING,
        reduced: false,
        frames,
      },
      (replay) => ({
        ...feedOf([], { at: replay.durationMs, reason: replay.endReason }),
        due: () => {
          throw new Error("the stage's canvas was lost");
        },
      }),
    );
    const failed = expect(handle.finished).rejects.toThrow(/^the stage's canvas was lost$/);
    await run(100);
    await failed;
  });

  it("plays a combo that lasted twice its real time at twice the speed", async () => {
    const times = Array.from({ length: 11 }, (_, i) => i * 100);
    const replay = { ...replayOf(tapRecord(times)), durationMs: 2 * REPLAY_REAL_TIME_MS };
    const { run } = play(times, { replay }, { at: 1500, reason: "closed" });
    // Its lead-in, 1.5s of combo and the landing take half as long in real time.
    await run(700);
    expect(settled).toBeNull();
    await run(600);
    expect(settled).toBe("landed");
  });

  it("stands still while its card is off screen", async () => {
    const observer: { seen: ((visible: boolean) => void) | null } = { seen: null };
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        readonly callback: (entries: { isIntersecting: boolean }[]) => void;
        constructor(callback: (entries: { isIntersecting: boolean }[]) => void) {
          this.callback = callback;
        }
        observe() {
          observer.seen = (visible) => this.callback([{ isIntersecting: visible }]);
        }
        disconnect() {
          observer.seen = null;
        }
      },
    );
    const { run } = play(TAPS);
    observer.seen?.(false);
    await run(REPLAY_REAL_TIME_MS * 3);
    expect(settled).toBeNull();
    expect(amount()).toBe("0");
    observer.seen?.(true);
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(settled).toBe("landed");
  });

  it("drops no rain once reduced motion is switched on mid-play", async () => {
    const { run, handle: playing } = play(TAPS);
    await run(100);
    playing.setReduced(true);
    await run(REPLAY_REAL_TIME_MS + 1000);
    expect(Number(host.querySelector<HTMLElement>(".gr")?.dataset.tier)).toBeGreaterThanOrEqual(3);
    expect(rain.count).toBe(0);
  });

  it("draws the same pop-in words at 60 and 120 frames a second", async () => {
    const wordsAt = async (hz: number) => {
      picked.length = 0;
      const { run, handle: playing } = play(TAPS);
      await run(REPLAY_REAL_TIME_MS + 1000, hz);
      playing.stop();
      return [...picked];
    };
    const at60 = await wordsAt(60);
    expect(at60.length).toBeGreaterThan(5);
    expect(await wordsAt(120)).toEqual(at60);
  });

  it("shows frame times when the developer slip's switch is on", async () => {
    saveMiniGameDemoSettings({ fullEffects: false, showFrameTimes: true });
    const { run } = play(TAPS);
    await run(1000);
    expect(host.querySelector(".gr-frames")?.textContent).toMatch(/fps/);
  });
});
