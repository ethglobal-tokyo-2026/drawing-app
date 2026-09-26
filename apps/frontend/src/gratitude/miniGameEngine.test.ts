// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ReplayV1 } from "@drawing-app/api/client";
import type { ComboRecord } from "./combo";
import { GAME_CONFIG } from "./gameConfig";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";

const { log, watch } = vi.hoisted(() => {
  const log: { name: string; args: unknown[]; result: unknown; at: number }[] = [];
  /** Keeps every call to the named methods in `log`, in order, as it makes it. */
  const watch = <T extends object>(target: T, names: readonly string[]): T => {
    for (const name of names) {
      const method: unknown = Reflect.get(target, name);
      if (typeof method !== "function") throw new Error(`Nothing called ${name} to watch`);
      Reflect.set(target, name, (...args: unknown[]) => {
        const result: unknown = Reflect.apply(method, target, args);
        log.push({ name, args, result, at: performance.now() });
        return result;
      });
    }
    return target;
  };
  return { log, watch };
});
vi.mock("./miniHeartPhysics", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./miniHeartPhysics")>();
  return {
    ...actual,
    createMiniHeartPhysics: (...args: Parameters<typeof actual.createMiniHeartPhysics>) =>
      watch(actual.createMiniHeartPhysics(...args), ["rainFromTop", "flingAlongStroke"]),
  };
});
vi.mock("./particleEffects", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./particleEffects")>();
  return {
    ...actual,
    createParticleEffects: (...args: Parameters<typeof actual.createParticleEffects>) =>
      watch(actual.createParticleEffects(...args), ["rise", "stamp", "streamLines"]),
  };
});
vi.mock("./tierBackground", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./tierBackground")>();
  return {
    ...actual,
    createTierBackground: (...args: Parameters<typeof actual.createTierBackground>) =>
      watch(actual.createTierBackground(...args), ["setSpeedField", "liftCorner", "dent"]),
  };
});
vi.mock("./combo", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./combo")>();
  return {
    ...actual,
    createGratitudeCombo: (...args: Parameters<typeof actual.createGratitudeCombo>) =>
      watch(actual.createGratitudeCombo(...args), ["countStrokePass"]),
  };
});
const callsTo = (name: string) => log.filter((call) => call.name === name);
/** Whether a call's answer, a list of the combo's events, held one of `kind`. */
const holds = (result: unknown, kind: string) =>
  Array.isArray(result) &&
  result.some(
    (e: unknown) => typeof e === "object" && e !== null && "kind" in e && e.kind === kind,
  );
const isBox = (v: unknown): v is { x: number; y: number; width: number } =>
  typeof v === "object" &&
  v !== null &&
  "x" in v &&
  typeof v.x === "number" &&
  "y" in v &&
  typeof v.y === "number" &&
  "width" in v &&
  typeof v.width === "number";

const onRecord = vi.fn<(record: ComboRecord, replay: ReplayV1) => void>();
const onFinished = vi.fn();
let host: HTMLDivElement;
let stage: HTMLElement;
let engine: MiniGameEngine;
/** The heart's resting middle in a test's DOM, which has no size of its own. */
const REST = { x: 195, y: 440 };
/** The heart's light, as its gloss reads it. */
const glossLight = () =>
  stage.querySelector<SVGElement>(".h-gloss")?.style.getPropertyValue("--lx") ?? "";
const OFF_HEART = { x: 195, y: 680 };

/** A pointer event on the stage at (x, y), at `t` or now. */
const pointer = (type: string, x: number, y: number, t = performance.now()) => {
  const e = new PointerEvent(type, { clientX: x, clientY: y, pointerId: 1, bubbles: true });
  Object.defineProperty(e, "timeStamp", { value: t });
  stage.dispatchEvent(e);
};
/**
 * A thumb stroking up and down from `from`, which is already down: `passes` runs of 60px, each
 * `msPerPass` long in three moves. With `at`, the moves carry made-up times from it and no time
 * passes; without, time passes as they're made.
 */
const strokeFrom = async (
  from: { x: number; y: number },
  passes: number,
  msPerPass: number,
  at?: number,
) => {
  let t = at ?? 0;
  for (let i = 0; i < passes; i++) {
    const start = i % 2 === 0 ? from.y : from.y + 60;
    const end = i % 2 === 0 ? from.y + 60 : from.y;
    for (let k = 1; k <= 3; k++) {
      t += msPerPass / 3;
      if (at === undefined) await play(msPerPass / 3);
      pointer(
        "pointermove",
        from.x,
        start + ((end - start) * k) / 3,
        at === undefined ? undefined : t,
      );
    }
  }
};
/** One motion sample: the phone moving sideways at `ax` m/s², at `t` or now. */
const motion = (ax: number, t = performance.now()) => {
  const e = new Event("devicemotion");
  Object.defineProperties(e, {
    acceleration: { value: { x: ax, y: 0, z: 0 } },
    accelerationIncludingGravity: { value: { x: 0, y: 9.8, z: 0 } },
    timeStamp: { value: t },
  });
  window.dispatchEvent(e);
};
/** A hard shake in a rhythm: `samples` reversals, `gapMs` apart, from `at` without time passing. */
const shake = async (samples: number, gapMs = 100, at?: number) => {
  for (let i = 0; i < samples; i++) {
    if (at === undefined) {
      await play(gapMs);
      motion(i % 2 === 0 ? 15 : -15);
    } else motion(i % 2 === 0 ? 15 : -15, at + i * gapMs);
  }
};
/** Strokes the heart until stroke unlocks: five fast passes in a row. */
const unlockStroke = async () => {
  pointer("pointerdown", REST.x, REST.y);
  await strokeFrom(REST, 6, 40);
};

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
  const page = part();
  const ground = part();
  const hud = part();
  stage = part();
  engine = mountMiniGameEngine(
    {
      root: host,
      page,
      ground,
      hud,
      stage,
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
      onFinished,
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
  onFinished.mockReset();
  log.length = 0;
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
    expect(callsTo("rainFromTop").length).toBeGreaterThan(0);
  });

  it("drops no rain with reduced motion", async () => {
    engine.setReduced(true);
    await mash(40);
    expect(Number(host.dataset.tier)).toBeGreaterThanOrEqual(3);
    expect(callsTo("rainFromTop")).toHaveLength(0);
  });
});

describe("a stroke or shake unlock after the combo has ended", () => {
  it("plays a one-tap send's end, recorded once, when stroke unlocks after the catch window", async () => {
    pressHeart();
    const late = performance.now() + GAME_CONFIG.catchWindowMs + 100;
    pointer("pointerdown", OFF_HEART.x, OFF_HEART.y, late);
    await strokeFrom(OFF_HEART, 6, 40, late);
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord.mock.calls[0]?.[1].endReason).toBe("sent");
    await play(3000);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onRecord).toHaveBeenCalledTimes(1);
  });

  it("plays a one-tap send's end, recorded once, when shake unlocks after the catch window", async () => {
    pressHeart();
    await shake(17, 100, performance.now() + GAME_CONFIG.catchWindowMs + 100);
    expect(onRecord).toHaveBeenCalledTimes(1);
    expect(onRecord.mock.calls[0]?.[1].endReason).toBe("sent");
    await play(3000);
    expect(onFinished).toHaveBeenCalledTimes(1);
    expect(onRecord).toHaveBeenCalledTimes(1);
  });
});

describe("stroking", () => {
  it("shows nothing for a pass past the limit, and flings mini hearts only for counted passes", async () => {
    await unlockStroke();
    await strokeFrom(REST, 60, 40);
    expect(Number(host.dataset.tier)).toBeGreaterThanOrEqual(2);
    const limited = callsTo("countStrokePass").filter(({ result }) => holds(result, "limited"));
    expect(limited.length).toBeGreaterThan(0);
    // No tap was made: a stamp would be a limited pass's.
    expect(callsTo("stamp")).toHaveLength(0);
    const flings = callsTo("flingAlongStroke");
    expect(flings.length).toBeGreaterThan(0);
    for (const fling of flings) {
      const pass = log.slice(0, log.indexOf(fling)).findLast((c) => c.name === "countStrokePass");
      expect(holds(pass?.result, "hit")).toBe(true);
    }
  });

  it("throws speed lines no more often than the throttle once stroke is committed", async () => {
    await unlockStroke();
    log.length = 0;
    await strokeFrom(REST, 30, 40);
    const lines = callsTo("streamLines").map(({ at }) => at);
    expect(lines.length).toBeGreaterThan(5);
    for (let i = 1; i < lines.length; i++) expect(lines[i] - lines[i - 1]).toBeGreaterThan(49);
  });

  it("keeps the speed field on one axis as the stroke turns back and forth", async () => {
    await unlockStroke();
    log.length = 0;
    await strokeFrom(REST, 30, 40);
    const angles = callsTo("setSpeedField").map(({ args }) => Number(args[1]));
    expect(angles.length).toBeGreaterThan(0);
    expect(Math.max(...angles) - Math.min(...angles)).toBeLessThan(10);
  });

  it("writes the speed field only as it changes, not every frame", async () => {
    await unlockStroke();
    // One long pull down at a steady speed: once the thumb's speed settles, the field holds.
    for (let i = 1; i <= 40; i++) {
      await play(10);
      pointer("pointermove", REST.x, REST.y + 60 + i * 10);
      if (i === 20) log.length = 0;
    }
    expect(callsTo("setSpeedField").length).toBeLessThanOrEqual(1);
  });

  it("writes no speed field and no thumb light with reduced motion", async () => {
    engine.setReduced(true);
    pointer("pointerdown", REST.x, REST.y);
    await strokeFrom(REST, 1, 300);
    expect(glossLight()).toBe("");
    await strokeFrom(REST, 30, 40);
    expect(host.dataset.phase).toBe("running");
    expect(callsTo("setSpeedField")).toHaveLength(0);
    expect(glossLight()).toBe("");
  });
});

describe("shaking", () => {
  it("puts the effects on the loose heart, not its empty resting spot", async () => {
    await shake(17);
    expect(live()).toBe("The heart is loose.");
    await play(200);
    log.length = 0;
    // The shake's last reversal went +15: this one turns it back.
    motion(-15);
    const box = callsTo("rise")[0]?.args[1];
    if (!isBox(box)) throw new Error("The hit raised no hearts off the heart");
    expect(box.width).toBeLessThan(200);
    expect(Math.hypot(box.x - REST.x, box.y - REST.y)).toBeGreaterThan(20);
  });

  it("lets go of a drag on the heart as the heart comes loose", async () => {
    pointer("pointerdown", REST.x, REST.y);
    pointer("pointermove", REST.x, REST.y + 30);
    await play(100);
    const glow = stage.querySelector<HTMLElement>(".gr-thumb-glow");
    if (!glow) throw new Error("No thumb glow on the stage");
    expect(glow.style.opacity).toBe("0.4");
    expect(glossLight()).not.toBe("");
    expect(host.style.getPropertyValue("--lx")).toBe("");
    await shake(17);
    await play(50);
    expect(glow.style.opacity).toBe("0");
    expect(glossLight()).toBe("");
  });

  it("says the shake unlocked, not that the heart is loose, when reduced motion keeps it put", async () => {
    engine.setReduced(true);
    await shake(17);
    expect(live()).toBe("Shake unlocked.");
  });

  it("lowers the corner a shake lifted once the shake is given up", async () => {
    await shake(13);
    expect(callsTo("liftCorner").at(-1)?.args[0]).toBe(0.3);
    await play(1000);
    expect(callsTo("liftCorner").at(-1)?.args[0]).toBe(0);
  });

  it("dents the top wall where the loose heart hit it, under the HUD", async () => {
    await shake(17);
    await play(1500);
    const top = callsTo("dent").find(({ args }) => args[0] === "top");
    if (!top) throw new Error("The loose heart never hit the top wall");
    // The HUD's underside: the layout's ceiling, 20px above where the heart's room begins.
    expect(Number(top.args[2])).toBeCloseTo(236, 0);
  });

  it("hits no wall once the combo has ended", async () => {
    await shake(17);
    engine.close();
    log.length = 0;
    await play(3000);
    expect(callsTo("dent")).toHaveLength(0);
  });
});

describe("the HUD before the catch", () => {
  const text = (selector: string) => host.querySelector(selector)?.textContent;
  /** How full the bar is drawn, 0–1. */
  const fill = () => {
    const transform = host.querySelector<HTMLElement>(".gr-timer-fill")?.style.transform ?? "";
    return Number(/scaleX\(([\d.]+)\)/.exec(transform)?.[1]);
  };

  it("shows a full bar holding the catch window, with nothing counted, before the first tap", async () => {
    await play(100);
    expect(host.dataset.hud).toBe("on");
    expect(fill()).toBe(1);
    expect(text(".gr-timer-s")).toBe(`${(GAME_CONFIG.catchWindowMs / 1000).toFixed(1)}s`);
    expect(text(".gr-amount")).toBe("0♡");
    expect(text(".gr-mult")).toBe("×1.0");
  });

  it("empties the bar over the catch window once the heart is sent, and the catch refills it", async () => {
    pressHeart();
    await play(GAME_CONFIG.catchWindowMs / 2);
    expect(fill()).toBeGreaterThan(0.35);
    expect(fill()).toBeLessThan(0.65);
    expect(text(".gr-amount")).toBe(`${GAME_CONFIG.gratitudePerHit}♡`);
    pressHeart();
    await play(50);
    expect(host.dataset.phase).toBe("running");
    expect(fill()).toBeGreaterThan(0.9);
  });

  it("runs the bar out when the heart isn't caught, and the heart is sent", async () => {
    pressHeart();
    await play(GAME_CONFIG.catchWindowMs + 50);
    expect(fill()).toBeLessThan(0.01);
    expect(onRecord.mock.calls[0]?.[1].endReason).toBe("sent");
  });
});
