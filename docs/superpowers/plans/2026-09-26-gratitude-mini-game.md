# Gratitude Mini-game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The thanker's gratitude mini-game as designed, with the combo timing from PRODUCT.md: a tap demo first (phase A), then stroke, shake and the motion ask (phase B).

**Architecture:** Pure, tested rules (`combo.ts`, the detectors, the mini-heart physics) under one imperative engine that ports the prototype's drawing module by module: DOM, SVG and Web Animations from a fixed set of reused elements, on one animation-frame loop. React renders the screen's static parts once and hears only the record and the ending.

**Tech Stack:** TypeScript 7, React 19, vitest 5 with happy-dom, Web Animations, oxlint and oxfmt.

---

## Ground rules

- **SPEC** = `docs/superpowers/specs/2026-09-26-gratitude-mini-game-design.md`. It wins over this plan; if they disagree, stop and ask.
- **DESIGN** = the design drafts' `drawing-app/` directory (repo `ethglobal-tokyo-2026-design-drafts`, checked out beside this one; the dispatcher gives its absolute path). **P** = `DESIGN/prototype`, **PJ** = `P/screens/gratitude.js`, **PC** = `P/screens/gratitude.css`. **G** = `apps/frontend/src/gratitude`.
- **Reference states:** serve P (`python3 -m http.server 8765` in P) and open `http://127.0.0.1:8765/harness/gratitude.html?state=<name>&solo` at 390×844.
- **Tiers:** PJ's `T` (1–5, 0 at rest) is `tier + 1` here, and before the catch our tier is `null`. Re-key every tier-indexed table when porting. PJ's `heat` is `intensity`.
- **Port rules:**
  - TypeScript without `any`, casts or non-null assertions. Interfaces use property signatures (`name: (x: X) => Y`). Erasable syntax only. `import type` for types.
  - DOM from `document.createElement`. `innerHTML` only ever receives this feature's own SVG constants, never a name or a handle.
  - Only transform and opacity animate. The engine owns the one requestAnimationFrame loop. Everything a module adds, it removes in its teardown.
  - A pooled element keeps the Animation it was last given and cancels that on reuse; never call `getAnimations()` (happy-dom lacks it).
  - An ending waits on the engine's clock (`wait(ms)`), never on an animation's `finished`.
  - Keep PJ's numbers unless this plan says otherwise.
- **Comments** follow AGENTS.MD: why, not what; no task numbers, phases or "ported from" notes.
- **Checks**, from the worktree root: `pnpm --filter frontend lint`, `pnpm --filter frontend typecheck`, `pnpm --filter frontend exec vitest run <files>`, `pnpm exec oxfmt --check apps/frontend`. Before a task is done: its tests pass and `pnpm check` passes.
- **Worktree:** `.claude/worktrees/gratitude-mini-game` on `design/gratitude-mini-game`, from `main`. Tasks in the same wave run in parallel in it: commit with explicit pathspecs (`git commit -m "…" -- <paths>`); if `index.lock` exists, wait and retry. The branch is squashed before merging.
- **Checks in a parallel wave:** another task's files may be half-written, so check only your own: `pnpm --filter frontend exec vitest run <your tests>` and `pnpm --filter frontend exec oxlint --type-check <your files>`, plus `pnpm --filter frontend typecheck`, where an error in a file you don't own is someone else's work in progress (report it, don't touch it). The controller runs `pnpm check` after each wave.

## Waves

| Wave | Tasks                                                               | Needs                                           |
| ---- | ------------------------------------------------------------------- | ----------------------------------------------- |
| A-1  | A1 rules · A2 touch input · A3 art and words · A5 styles            | —                                               |
| A-2  | A4 mini hearts · A6 heart and ground · A7 HUD, lettering, particles | A1, A3; A7 also A4, whose `HeartBox` it imports |
| A-3  | A8 endings, frame times, engine                                     | A-2                                             |
| A-4  | A9 the screen                                                       | A8                                              |
| A-5  | A10 the hidden test menu                                            | A9                                              |
| A-6  | A11 verify the tap demo                                             | all of A                                        |
| B-1  | B1 detectors · B2 combo: strokes and shakes · B3 motion permission  | A11                                             |
| B-2  | B4 stroke on screen · B5 shake on screen                            | B-1                                             |
| B-3  | B6 verify, then tidy up                                             | B-2                                             |
| B-4  | B7 the durable design doc                                           | B6                                              |

## The contract between tasks

Each module exports exactly these names and types; A8's engine is written against them and typechecks. A task may add private helpers, never change these.

```ts
export interface HeartLayers {
  body: string;
  flush: string;
  pale: string;
  gloss: string;
  face: string;
  ink: string;
}
export interface OutlinePoint {
  x: number;
  y: number;
  nx: number;
  ny: number;
}
export declare const HEART_VIEWBOX: { width: number; height: number };
export declare function bigHeartLayers(uid: string): HeartLayers;
export declare function heartOutline(count: number): OutlinePoint[];
export declare function miniHeartSvg(fill: string): string;
export declare function stampHeartSvg(): string;
export declare const GLINT_SVG: string;
export declare const PUFF_SVG: string;
export declare const BEAD_SVG: string;
export declare const SOUL_SVG: string;
export declare const HAZE_WAVE_SVG: string;
export declare function focusLinesSvg(
  width: number,
  height: number,
  cx: number,
  cy: number,
  seed: number,
): string;
export declare function svgDataUrl(svg: string): string;
```

```ts
export interface TierName {
  jp: string;
  en: string;
}
export declare const TIER_NAMES: readonly [TierName, TierName, TierName, TierName, TierName];
```

```ts
import type { Tier } from "./combo";
export interface PopInWord {
  jp: string;
  gloss: string;
}
export type PopInBank = Tier | "stroke" | "shake";
export declare const POP_IN_WORDS: Record<PopInBank, readonly PopInWord[]>;
export declare function createPopInPicker(random: () => number): (bank: PopInBank) => PopInWord;
```

```ts
export interface PileBounds {
  width: number;
  height: number;
  ceiling: number;
}
export interface HeartBox {
  x: number;
  y: number;
  width: number;
  height: number;
}
export interface MiniHeart {
  id: number;
  kind: "mini" | "rain";
  tone: number;
  x: number;
  y: number;
  size: number;
  rotation: number;
  scale: number;
  opacity: number;
  resting: boolean;
}
export interface MiniHeartPhysics {
  readonly hearts: readonly MiniHeart[];
  setBounds: (bounds: PileBounds) => void;
  sprayFromTap: (x: number, y: number, heart: HeartBox, count: number) => void;
  sweatFromHeart: (heart: HeartBox) => void;
  rainFromTop: () => void;
  shoveAwayFrom: (x: number, y: number) => void;
  step: (dt: number) => void;
  clear: () => void;
}
export declare function createMiniHeartPhysics(
  bounds: PileBounds,
  random: () => number,
): MiniHeartPhysics;
```

```ts
import type { MiniHeart } from "./miniHeartPhysics";
export interface MiniHeartLayer {
  draw: (hearts: readonly MiniHeart[]) => void;
  clear: () => void;
}
export declare function createMiniHeartLayer(layers: {
  front: HTMLElement;
  behind: HTMLElement;
}): MiniHeartLayer;
```

```ts
import type { Tier } from "./combo";
export type HeartFaceName = "none" | "dots" | "shy" | "hearts" | "over" | "bliss" | "wide" | "limp";
export interface HeartFace {
  face: HeartFaceName;
  blush: 0 | 1 | 2;
  sweat: boolean;
  ink: boolean;
  nose: boolean;
  pale: boolean;
}
export declare function heartFaceFor(
  tier: Tier | null,
  intensity: number,
  total: number,
): HeartFace;
```

```ts
import type { ComboPhase, Tier } from "./combo";
export interface HeartLayout {
  rest: { x: number; y: number };
  width: number;
  height: number;
  giver: { x: number; y: number };
  screen: { width: number; height: number };
}
export interface HeartFrame {
  page: string;
  anchor: string;
  body: string;
  opacity: number;
  x: number;
  y: number;
}
export interface HeartMotionState {
  phase: ComboPhase;
  tier: Tier | null;
  intensity: number;
  reduced: boolean;
  sendingProgress: number;
}
export interface HeartMotion {
  setLayout: (layout: HeartLayout) => void;
  squash: (strength: number) => void;
  shake: (amplitude: number) => void;
  punch: (amount: number) => void;
  flyToGiver: () => Promise<void>;
  goLimp: () => void;
  fadeOut: () => void;
  step: (dt: number, real: number, state: HeartMotionState) => HeartFrame;
}
export declare function createHeartMotion(layout: HeartLayout, random: () => number): HeartMotion;
```

```ts
import type { Tier } from "./combo";
export interface TierBackground {
  setLayout: (
    width: number,
    height: number,
    heart: { x: number; y: number; height: number },
  ) => void;
  show: (tier: Tier | null, intensity: number) => void;
  step: (real: number) => void;
  ascend: (on: boolean, intensity: number) => void;
  flash: () => void;
  hideAll: () => void;
}
export declare function createTierBackground(
  ground: HTMLElement,
  reduced: () => boolean,
): TierBackground;
```

```ts
export interface HudView {
  total: number;
  multiplier: number;
  secondsLeft: number;
  barFill: number;
  running: boolean;
}
export interface ComboHud {
  show: (on: boolean) => void;
  hit: (secondsAdded: number) => void;
  step: (real: number, view: HudView) => void;
}
export declare function createComboHud(
  hud: HTMLElement,
  options: { reduced: () => boolean; random: () => number },
): ComboHud;
```

```ts
import type { HeartBox } from "./miniHeartPhysics";
import type { PopInBank } from "./popInWords";
export interface Lettering {
  setLayout: (width: number, height: number, top: number) => void;
  slamTierName: (text: string, gloss: string) => void;
  showPopInWord: (bank: PopInBank, heart: HeartBox) => void;
  clear: () => void;
}
export declare function createLettering(
  layer: HTMLElement,
  options: { intensity: number; random: () => number },
): Lettering;
```

```ts
import type { HeartBox } from "./miniHeartPhysics";
export interface ParticleEffects {
  stamp: (x: number, y: number) => void;
  rise: (count: number, heart: HeartBox) => void;
  glint: (heart: HeartBox) => void;
  steam: (count: number, heart: HeartBox) => void;
  bead: (heart: HeartBox) => void;
  burst: (count: number, at: { x: number; y: number }) => void;
  tidy: () => void;
}
export declare function createParticleEffects(
  layers: { stamps: HTMLElement; effects: HTMLElement },
  options: { reduced: () => boolean; random: () => number },
): ParticleEffects;
```

```ts
import type { ComboHud } from "./comboHud";
import type { HeartFace } from "./heartFaces";
import type { HeartMotion } from "./heartMotion";
import type { MiniHeartLayer } from "./miniHeartLayer";
import type { HeartBox, MiniHeartPhysics } from "./miniHeartPhysics";
import type { ParticleEffects } from "./particleEffects";
import type { TierBackground } from "./tierBackground";
import type { Lettering } from "./tierSlamAndPopIns";
export interface EndingParts {
  heart: HeartMotion;
  background: TierBackground;
  lettering: Lettering;
  effects: ParticleEffects;
  physics: MiniHeartPhysics;
  miniHearts: MiniHeartLayer;
  hud: ComboHud;
  giverPhoto: HTMLElement;
  giverDot: HTMLElement;
  giverPoint: () => { x: number; y: number };
  fuu: HTMLElement;
  soul: HTMLElement;
  heartBox: () => HeartBox;
  wait: (ms: number) => Promise<void>;
  freeze: (ms: number) => void;
  forceFace: (face: Partial<HeartFace> | null) => void;
  reduced: () => boolean;
  intensity: number;
  say: (text: string) => void;
  giverHandle: string;
}
export declare function flyHeartToGiver(parts: EndingParts): Promise<void>;
export declare function playAscension(parts: EndingParts): Promise<void>;
export declare function sighAndTidy(parts: EndingParts): Promise<void>;
```

## Files

| File                                                                                                                                                                        | Task   |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| `G/gameConfig.ts`, `G/combo.ts` (+test)                                                                                                                                     | A1, B2 |
| `G/touchInput.ts` (+test)                                                                                                                                                   | A2, B4 |
| `G/seededRandom.ts`, `G/easing.ts`, `G/heartArt.ts` (+test), `G/tierNames.ts`, `G/popInWords.ts`                                                                            | A3     |
| `G/miniHeartPhysics.ts` (+test), `G/miniHeartLayer.ts`                                                                                                                      | A4     |
| `G/gratitude-mini-game.css`                                                                                                                                                 | A5     |
| `G/heartFaces.ts`, `G/heartMotion.ts`, `G/tierBackground.ts`                                                                                                                | A6     |
| `G/comboHud.ts`, `G/tierSlamAndPopIns.ts`, `G/particleEffects.ts`                                                                                                           | A7     |
| `G/gameEndings.ts`, `G/frameTimeReadout.ts`, `G/miniGameEngine.ts`                                                                                                          | A8     |
| `G/GratitudeMiniGame.tsx` (+test)                                                                                                                                           | A9     |
| `apps/frontend/src/ui/useLongPress.ts` (+test), `apps/frontend/src/sticker-board/testMenuSettings.ts`, `…/TestMenuSheet.tsx`, `…/test-menu-sheet.css`, `…/StickerBoard.tsx` | A10    |
| `G/strokeDetector.ts`, `G/shakeDetector.ts` (+test)                                                                                                                         | B1     |
| `apps/frontend/src/ui/motionPermission.ts` (+test), `apps/frontend/src/app/MotionPermissionCard.tsx`, `…/motion-permission-card.css`, `…/App.tsx`                           | B3     |
| `G/phoneMotion.ts`                                                                                                                                                          | B5     |
| `docs/gratitude-mini-game-design-doc.md`, `AGENTS.MD`                                                                                                                       | B7     |

---

## Phase A: the tap demo

### Task A1: The rules

After review, the repository's `G/combo.ts`, `G/gameConfig.ts` and `G/combo.test.ts` supersede the code shown here.

**Files:** Create `G/gameConfig.ts`, `G/combo.ts`, `G/combo.test.ts`.

- [x] **Step 1: Write the failing tests** in `G/combo.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createGratitudeCombo, type ComboEvent, type ComboRecord } from "./combo";
import { GAME_CONFIG, type GameConfig } from "./gameConfig";

type Ended = Extract<ComboEvent, { kind: "ended" }>;
const endOf = (events: readonly ComboEvent[]) => events.find((e): e is Ended => e.kind === "ended");

/** A seeded random source, so a failing run can be repeated. */
function seeded(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let r = Math.imul(s ^ (s >>> 15), 1 | s);
    r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r;
    return ((r ^ (r >>> 14)) >>> 0) / 2 ** 32;
  };
}

/**
 * Taps the heart `rate` times a second from t = 0 until the combo ends, with a frame between taps.
 * `jitter` spreads each gap and each frame by up to that share, from `seed`.
 */
function play(rate: number, { config = GAME_CONFIG, jitter = 0, seed = 1 } = {}) {
  const random = seeded(seed);
  const spread = () => 1 + jitter * (random() * 2 - 1);
  const combo = createGratitudeCombo(config);
  const events: ComboEvent[] = [];
  let nextTap = 0;
  for (let t = 0; t < 20_000; t += 16 * spread()) {
    for (; nextTap <= t; nextTap += (1000 / rate) * spread())
      events.push(...combo.tapHeart(nextTap));
    events.push(...combo.advanceTo(t));
    const end = endOf(events);
    if (end)
      return {
        record: end.record,
        events,
        limited: events.filter((e) => e.kind === "limited").length,
      };
  }
  throw new Error(`A combo at ${rate} taps a second never ended`);
}

/** Feeds a record's hit times, and nothing else, to a fresh combo. */
function replay(record: ComboRecord): ComboRecord | undefined {
  const combo = createGratitudeCombo();
  const events = record.hitTimes.flatMap((t) => combo.tapHeart(t));
  events.push(...combo.advanceTo(record.durationMs + 0.5));
  if (!endOf(events)) events.push(...combo.endCombo(record.durationMs));
  return endOf(events)?.record;
}

describe("createGratitudeCombo", () => {
  it("sends with one tap when no second tap catches the heart", () => {
    const combo = createGratitudeCombo();
    combo.tapHeart(5000);
    expect(combo.advanceTo(5000 + GAME_CONFIG.catchWindowMs - 1)).toEqual([]);
    const end = endOf(combo.advanceTo(5000 + GAME_CONFIG.catchWindowMs));
    expect(end).toMatchObject({
      caught: false,
      record: {
        hits: 1,
        hitTimes: [0],
        durationMs: GAME_CONFIG.catchWindowMs,
        total: GAME_CONFIG.gratitudePerHit,
      },
    });
  });

  it("starts the bar, full, when a second tap catches the heart", () => {
    const combo = createGratitudeCombo();
    combo.tapHeart(0);
    expect(combo.tapHeart(300).map((e) => e.kind)).toEqual(["caught", "hit", "tier"]);
    expect(combo.view).toMatchObject({ phase: "running", tier: 0, barFill: 1 });
  });

  it("lasts longer and reaches a higher tier and total the faster the taps", () => {
    const [calm, eager, mashing] = [3, 6, 13].map((rate) => play(rate).record);
    expect(calm.durationMs).toBeLessThan(eager.durationMs);
    expect(eager.durationMs).toBeLessThan(mashing.durationMs);
    expect(calm.total).toBeLessThan(eager.total);
    expect(eager.total).toBeLessThan(mashing.total);
    expect(calm.peakTier).toBeLessThan(mashing.peakTier);
  });

  it("counts no more hits than the rate limit allows", () => {
    const { record, limited } = play(40);
    expect(limited).toBeGreaterThan(0);
    for (const start of record.hitTimes) {
      const inOneSecond = record.hitTimes.filter((t) => t >= start && t < start + 1000).length;
      expect(inOneSecond).toBeLessThanOrEqual(GAME_CONFIG.tapsPerSecond + GAME_CONFIG.burst);
    }
  });

  it("only ever climbs the tiers", () => {
    const tiers = play(13).events.flatMap((e) => (e.kind === "tier" ? [e.tier] : []));
    expect(tiers.length).toBeGreaterThan(2);
    tiers.slice(1).forEach((tier, i) => expect(tier).toBeGreaterThan(tiers[i]));
  });

  it("stops at the safety limit however long the bar would last", () => {
    const slowDrain: GameConfig = { ...GAME_CONFIG, drainStart: 0.001 };
    expect(play(10, { config: slowDrain }).record.durationMs).toBe(slowDrain.maxDurationMs);
  });

  it("ends at once, with its result, when the page goes hidden", () => {
    const combo = createGratitudeCombo();
    [0, 200, 400].forEach((t) => combo.tapHeart(t));
    expect(endOf(combo.endCombo(500))).toMatchObject({
      caught: true,
      record: { hits: 3, durationMs: 500 },
    });
  });

  it("ends without a record when closed before the first tap", () => {
    const combo = createGratitudeCombo();
    expect(combo.endCombo(100)).toEqual([]);
    expect(combo.tapHeart(200)).toEqual([]);
  });

  it("records one time per hit, rising from 0, within the safety limit", () => {
    for (const rate of [3, 8, 16]) {
      const { record } = play(rate, { jitter: 0.2 });
      expect(record.hitTimes).toHaveLength(record.hits);
      expect(record.hitTimes[0]).toBe(0);
      record.hitTimes
        .slice(1)
        .forEach((t, i) => expect(t).toBeGreaterThanOrEqual(record.hitTimes[i]));
      expect(record.durationMs).toBeLessThanOrEqual(GAME_CONFIG.maxDurationMs);
    }
  });

  it("brings 照れ no sooner than the 7th tap at any steady speed", () => {
    for (let rate = 2; rate <= 16; rate++) {
      let hits = 0;
      for (const e of play(rate).events) {
        if (e.kind === "hit") hits++;
        if (e.kind === "tier" && e.tier === 1)
          expect(hits, `at ${rate} taps a second`).toBeGreaterThanOrEqual(7);
      }
    }
  });

  it("gives the same record when replayed from its hit times, however the frames fell", () => {
    for (const seed of [1, 2, 3, 4, 5]) {
      const { record } = play(4 + seed * 2, { jitter: 0.4, seed });
      expect(replay(record)).toEqual(record);
    }
  });
});
```

- [x] **Step 2: Run them and see them fail.** `pnpm --filter frontend exec vitest run src/gratitude/combo.test.ts`. Expected: FAIL, the modules don't exist.

- [x] **Step 3: Write `G/gameConfig.ts`:**

```ts
/** The mini-game's rules as numbers. A finished combo records `version`, so a replay runs with the
 * numbers it was played with; change the version whenever a rule number changes. */
export interface GameConfig {
  version: string;
  /** Gratitude a hit earns at ×1. */
  gratitudePerHit: number;
  /** A touch on the heart this soon after the first tap catches it; otherwise the first tap sends. */
  catchWindowMs: number;
  /** A combo ends this long after its first hit, whatever the bar says. */
  maxDurationMs: number;
  /** The bar drains `drainStart` bars a second at the catch, doubling every `drainDoublingS`. */
  drainStart: number;
  drainDoublingS: number;
  /** Hit n, from the third, adds gainFloor + gainAboveFloor × gainDecay^(n − 3) of the bar. */
  gainFloor: number;
  gainAboveFloor: number;
  gainDecay: number;
  /** Taps a second that count, beyond a burst of `burst`. */
  tapsPerSecond: number;
  burst: number;
  /** The multiplier's target is 1 + perHit × (hits in the last window − freeHits), up to max. */
  multiplier: {
    windowMs: number;
    freeHits: number;
    perHit: number;
    max: number;
    /** A hit closes this share of the gap to a higher target at once. */
    hitNudge: number;
    /** Between hits it eases toward the target at these rates, a second. */
    rise: number;
    fall: number;
  };
  /** The gratitude total each tier starts at: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
  tierStarts: readonly [number, number, number, number, number];
  /** A tier-up freezes the combo clock this long. */
  tierUpFreezeMs: number;
}

export const GAME_CONFIG: GameConfig = {
  version: "2026-09-26",
  gratitudePerHit: 10,
  catchWindowMs: 920,
  maxDurationMs: 8000,
  drainStart: 0.36,
  drainDoublingS: 1.6,
  gainFloor: 0.2,
  gainAboveFloor: 0.1,
  gainDecay: 0.93,
  tapsPerSecond: 16,
  burst: 4,
  multiplier: {
    windowMs: 1000,
    freeHits: 2,
    perHit: 0.55,
    max: 8,
    hitNudge: 0.35,
    rise: 6,
    fall: 2.5,
  },
  tierStarts: [1, 100, 320, 1100, 3000],
  tierUpFreezeMs: 60,
};

/** How the game looks and answers a touch: the prototype's numbers. A combo doesn't record these. */
export const FEEL_CONFIG = {
  /** The one dial every effect scales by: day to day, and for the presentation. */
  intensity: { everyday: 0.7, full: 1 },
  /** 昇天's climax holds everything this long before the soul rises. */
  climaxFreezeMs: 140,
  /** A first tap is a release within this travel and hold. */
  tapSlopPx: 12,
  tapHoldMs: 800,
  /** Mini hearts: sprayed by taps from ドキドキ up, sweated off the heart, and 昇天's rain. */
  miniHearts: {
    fromTier: 2,
    sizes: [14, 22],
    tones: ["#FF4F9A", "#FF7DB5", "#FF2F7E", "#FFA6CB"],
    /** px/s: a tap's spray. */
    speed: [380, 720],
    /** Degrees either side of a spray's direction. */
    sprayDeg: 36,
    /** px/s²: light, so they hang and bounce. */
    gravity: 1000,
    floorBounce: 0.72,
    wallBounce: 0.8,
    miniBounce: 1,
    /** Two in flight touch only once their hearts overlap by this share. */
    touch: 0.5,
    /** px/s: two in flight closing slower than this pass by instead of knocking. */
    knock: 260,
    floorGrip: 0.95,
    /** px/s: a landing slower than this rests. */
    settle: 190,
    /** deg/s at most. */
    spin: 540,
    /** s at rest before fading, and s to fade. */
    linger: [2, 4],
    fade: [0.5, 0.9],
    /** px: the heap never climbs past this. */
    pileMax: 110,
    /** Hearts at once; past it the oldest fades out fast. */
    live: 90,
    /** 1/s: rolling friction. */
    roll: 6,
    /** px/s: slower than this, held up for a quarter second, it settles. */
    sleep: 45,
    /** px/s: a hit this hard knocks a settled one loose. */
    wake: 520,
    /** px: how far a tap's shove reaches, and its push right under the finger in px/s. */
    reach: 150,
    kick: 950,
    /** Drops a second by tier: a drip at ドキドキ, a sweat at オーバーヒート, heavier at 昇天. */
    sweatPerSecond: [0, 0, 0.35, 2.2, 4.5],
    sweatSizes: [12, 18],
    /** s a drop beads on the heart's edge before it lets go. */
    bead: [0.35, 0.6],
    rainGravity: 1500,
    rainMax: 24,
  },
};
```

- [x] **Step 4: Write `G/combo.ts`:**

```ts
import { GAME_CONFIG, type GameConfig } from "./gameConfig";

export type Method = "tap" | "stroke" | "shake";
/** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
export type Tier = 0 | 1 | 2 | 3 | 4;
export type ComboPhase = "ready" | "sending" | "running" | "ended";

/** A finished combo, as the draft schema's `gratitude` table records it. */
export interface ComboRecord {
  /** The method the combo ended in. */
  method: Method;
  /** Where in hitTimes the combo committed to stroke or shake: 0 if it started there, null for taps only. */
  switchedAtHit: number | null;
  hits: number;
  /** Milliseconds after the first hit, one per hit. */
  hitTimes: number[];
  /** From the first hit to the end. */
  durationMs: number;
  /** Gratitude, multiplier included. */
  total: number;
  peakMult: number;
  peakTier: Tier;
  gameConfigVersion: string;
}

export type ComboEvent =
  /** `secondsAdded`: how much the hit raised the seconds left; 0 when the bar isn't running yet. */
  | { kind: "hit"; gratitude: number; secondsAdded: number }
  /** A touch past the rate limit: it animates but adds nothing. */
  | { kind: "limited" }
  | { kind: "caught" }
  | { kind: "tier"; tier: Tier }
  /** `caught`: false for a one-tap send, or an end before the catch. */
  | { kind: "ended"; record: ComboRecord; caught: boolean };

/** The combo as of the latest call, for drawing. */
export interface ComboView {
  phase: ComboPhase;
  hits: number;
  total: number;
  multiplier: number;
  /** Null until the catch: ありがと's face and slam wait for it. */
  tier: Tier | null;
  /** Seconds left if the hits stopped now; 0 unless the combo is running. */
  secondsLeft: number;
  /** secondsLeft over the seconds a full bar lasts at the catch, 0–1. */
  barFill: number;
  /** A tier-up has frozen the combo clock. */
  frozen: boolean;
}

export interface GratitudeCombo {
  readonly view: ComboView;
  /** A touch-down on the heart at `t` ms; for the first tap, its release. */
  tapHeart: (t: number) => ComboEvent[];
  /** Brings the rules to `t` ms: the catch window closing, hits leaving the cadence window, the bar emptying, the safety stop. */
  advanceTo: (t: number) => ComboEvent[];
  /** Ends it at `t` ms, because the page went hidden or the screen closed. Before the first tap it ends without a record. */
  endCombo: (t: number) => ComboEvent[];
}

export function tierFor(total: number, starts: GameConfig["tierStarts"]): Tier {
  if (total >= starts[4]) return 4;
  if (total >= starts[3]) return 3;
  if (total >= starts[2]) return 2;
  if (total >= starts[1]) return 1;
  return 0;
}

type Pending = { t: number; kind: "sendEnd" | "cadence" | "empty" | "cap" };

/** Seconds a full bar lasts from the catch with no more hits: the HUD's scale. */
export function fullBarSeconds(config: GameConfig = GAME_CONFIG): number {
  const T = config.drainDoublingS;
  return T * Math.log2(1 + Math.LN2 / (T * config.drainStart));
}

/**
 * The gratitude combo's rules, with no DOM and no clock of their own: every call is passed the time.
 * State changes only at events (hits, a hit leaving the cadence window, the ends) and is computed in
 * closed form between them, so a replay of the same hit times gives the same record however the
 * frames fell. Times are held in whole milliseconds after the first hit.
 */
export function createGratitudeCombo(config: GameConfig = GAME_CONFIG): GratitudeCombo {
  const M = config.multiplier;
  const T = config.drainDoublingS;
  /** Bars drained between combo seconds a and b: K × (2^(b/T) − 2^(a/T)). */
  const K = (config.drainStart * T) / Math.LN2;
  const grow = (comboS: number) => 2 ** (comboS / T);
  /** Seconds a bar lasts from combo second `comboS` with no more hits. */
  const lasts = (bar: number, comboS: number) => T * Math.log2(bar / K + grow(comboS)) - comboS;
  const fullBar = fullBarSeconds(config);

  let phase: ComboPhase = "ready";
  /** The caller's time of the first hit. */
  let origin = 0;
  // The state as of the latest event, at `at` ms after the first hit.
  let at = 0;
  let bar = 0;
  /** Time since the catch, less tier-up freezes. */
  let comboMs = 0;
  let mult = 1;
  let frozenUntil = 0;
  let milliTokens = config.burst * 1000;
  let tokensAt = 0;
  let total = 0;
  let peakMult = 1;
  let shownTier: Tier | null = null;
  /** The latest time the combo was brought to. */
  let latest = 0;
  const hitTimes: number[] = [];
  /** Hit times still in the cadence window, oldest first. */
  const cadence: number[] = [];

  const target = () => Math.min(M.max, 1 + M.perHit * Math.max(0, cadence.length - M.freeHits));

  /** The state at `x` ≥ `at`, with no event between. */
  function stateAt(x: number) {
    const elapsed = Math.max(0, x - Math.max(at, frozenUntil));
    if (phase !== "running" || elapsed === 0) return { bar, comboMs, mult };
    const goal = target();
    const rate = goal > mult ? M.rise : M.fall;
    return {
      bar: bar - K * (grow((comboMs + elapsed) / 1000) - grow(comboMs / 1000)),
      comboMs: comboMs + elapsed,
      mult: goal + (mult - goal) * Math.exp((-rate * elapsed) / 1000),
    };
  }

  function settleAt(x: number) {
    ({ bar, comboMs, mult } = stateAt(x));
    at = x;
    peakMult = Math.max(peakMult, mult);
  }

  function nextPending(): Pending | null {
    if (phase === "sending") return { t: config.catchWindowMs, kind: "sendEnd" };
    if (phase !== "running") return null;
    let next: Pending = { t: config.maxDurationMs, kind: "cap" };
    const leaves = cadence.length > 0 ? cadence[0] + M.windowMs : Infinity;
    if (leaves < next.t) next = { t: leaves, kind: "cadence" };
    const empties = Math.max(at, frozenUntil) + lasts(bar, comboMs / 1000) * 1000;
    if (empties < next.t) next = { t: empties, kind: "empty" };
    return next;
  }

  function finish(end: number, caught: boolean, events: ComboEvent[]) {
    settleAt(end);
    phase = "ended";
    latest = end;
    events.push({
      kind: "ended",
      caught,
      record: {
        method: "tap",
        switchedAtHit: null,
        hits: hitTimes.length,
        hitTimes: [...hitTimes],
        durationMs: Math.round(end),
        total,
        peakMult: Math.round(peakMult * 100) / 100,
        peakTier: tierFor(total, config.tierStarts),
        gameConfigVersion: config.version,
      },
    });
  }

  /** Runs every event due by `x`; true if one of them ended the combo. */
  function advance(x: number, events: ComboEvent[]): boolean {
    for (let next = nextPending(); next && next.t <= x; next = nextPending()) {
      if (next.kind !== "cadence") {
        finish(next.t, next.kind !== "sendEnd", events);
        return true;
      }
      settleAt(next.t);
      cadence.shift();
    }
    latest = Math.max(latest, x);
    return false;
  }

  return {
    get view(): ComboView {
      const now = stateAt(Math.max(latest, at));
      const secondsLeft = phase === "running" ? Math.max(0, lasts(now.bar, now.comboMs / 1000)) : 0;
      return {
        phase,
        hits: hitTimes.length,
        total,
        multiplier: now.mult,
        tier: shownTier,
        secondsLeft,
        barFill: Math.min(1, secondsLeft / fullBar),
        frozen: latest < frozenUntil,
      };
    },

    tapHeart(t) {
      const events: ComboEvent[] = [];
      if (phase === "ended") return events;
      if (phase === "ready") origin = t;
      // Whole milliseconds, never before an event already run, so a replay meets the same order.
      const x = Math.max(Math.round(t - origin), at);
      if (advance(x, events)) return events;

      milliTokens = Math.min(
        config.burst * 1000,
        milliTokens + (x - tokensAt) * config.tapsPerSecond,
      );
      tokensAt = x;
      if (milliTokens < 1000) {
        events.push({ kind: "limited" });
        return events;
      }
      milliTokens -= 1000;

      settleAt(x);
      const before = phase === "running" ? lasts(bar, comboMs / 1000) : 0;
      hitTimes.push(x);
      cadence.push(x);
      if (phase === "ready") phase = "sending";
      else if (phase === "sending") {
        phase = "running";
        bar = 1;
        comboMs = 0;
        events.push({ kind: "caught" });
      } else {
        const n = hitTimes.length;
        bar = Math.min(
          1,
          bar + config.gainFloor + config.gainAboveFloor * config.gainDecay ** (n - 3),
        );
      }

      const goal = target();
      if (goal > mult) mult += (goal - mult) * M.hitNudge;
      peakMult = Math.max(peakMult, mult);
      const gratitude = Math.round(config.gratitudePerHit * mult);
      total += gratitude;
      const secondsAdded = before > 0 ? Math.max(0, lasts(bar, comboMs / 1000) - before) : 0;
      events.push({ kind: "hit", gratitude, secondsAdded });

      if (phase === "running") {
        const tier = tierFor(total, config.tierStarts);
        if (shownTier === null || tier > shownTier) {
          shownTier = tier;
          frozenUntil = Math.max(frozenUntil, x + config.tierUpFreezeMs);
          events.push({ kind: "tier", tier });
        }
      }
      latest = Math.max(latest, x);
      return events;
    },

    advanceTo(t) {
      const events: ComboEvent[] = [];
      if (phase === "sending" || phase === "running") advance(t - origin, events);
      return events;
    },

    endCombo(t) {
      const events: ComboEvent[] = [];
      if (phase === "ended") return events;
      if (phase === "ready") {
        phase = "ended";
        return events;
      }
      const x = Math.max(Math.round(t - origin), at);
      if (!advance(x, events)) finish(x, phase === "running", events);
      return events;
    },
  };
}
```

- [x] **Step 5: Run the tests.** Expected: PASS, all of them.
- [x] **Step 6: Checks, then commit** `feat: add the gratitude mini-game's rules`.

### Task A2: Touch input

After review, the repository's `G/touchInput.ts` and `G/touchInput.test.ts` supersede the code shown here.

**Files:** Create `G/touchInput.ts`, `G/touchInput.test.ts`.

- [x] **Step 1: Write the failing tests:**

```ts
// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { isOnHeart, listenForTouches, type HeartArea } from "./touchInput";

const heart: HeartArea = { cx: 200, cy: 400, width: 220, height: 212 };

let stage: HTMLDivElement;
let stop: () => void;
const onHeartDown = vi.fn();
const onHeartTap = vi.fn();

/** A pointer event at stage point (x, y), `t` ms into the test. */
function pointer(type: string, x: number, y: number, t: number, pointerId = 1) {
  const e = new PointerEvent(type, {
    clientX: x,
    clientY: y,
    pointerId,
    bubbles: true,
    cancelable: true,
  });
  Object.defineProperty(e, "timeStamp", { value: t });
  stage.dispatchEvent(e);
}

beforeEach(() => {
  stage = document.createElement("div");
  document.body.append(stage);
  stop = listenForTouches(
    stage,
    {
      heartArea: () => heart,
      toStage: (e) => ({ x: e.clientX, y: e.clientY }),
      tapSlopPx: 12,
      tapHoldMs: 800,
    },
    { onHeartDown, onHeartTap },
  );
});

afterEach(() => {
  stop();
  stage.remove();
  vi.clearAllMocks();
});

describe("isOnHeart", () => {
  it("takes a touch just inside the heart's resting box and refuses one just outside it", () => {
    const right = heart.cx + heart.width / 2;
    const bottom = heart.cy + heart.height / 2;
    expect(isOnHeart(right - 1, heart.cy, heart)).toBe(true);
    expect(isOnHeart(heart.cx, bottom - 1, heart)).toBe(true);
    expect(isOnHeart(right + heart.width * 0.1, heart.cy, heart)).toBe(false);
    expect(isOnHeart(right + 1, bottom + 1, heart)).toBe(false);
  });
});

describe("listenForTouches", () => {
  it("reports a finger going down on the heart, and ignores one beside it", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0);
    pointer("pointerdown", heart.cx + heart.width, heart.cy, 10, 2);
    expect(onHeartDown).toHaveBeenCalledTimes(1);
    expect(onHeartDown).toHaveBeenCalledWith(0, heart.cx, heart.cy);
  });

  it("counts every finger on the heart", () => {
    pointer("pointerdown", heart.cx - 30, heart.cy, 0, 1);
    pointer("pointerdown", heart.cx + 30, heart.cy, 5, 2);
    expect(onHeartDown).toHaveBeenCalledTimes(2);
  });

  it("reports a quick lift as a tap, and a drag or a hold as neither", () => {
    pointer("pointerdown", heart.cx, heart.cy, 0);
    pointer("pointerup", heart.cx, heart.cy, 120);
    pointer("pointerdown", heart.cx, heart.cy, 1000, 2);
    pointer("pointermove", heart.cx + 20, heart.cy, 1050, 2);
    pointer("pointerup", heart.cx + 20, heart.cy, 1100, 2);
    pointer("pointerdown", heart.cx, heart.cy, 2000, 3);
    pointer("pointerup", heart.cx, heart.cy, 2900, 3);
    expect(onHeartTap).toHaveBeenCalledTimes(1);
    expect(onHeartTap).toHaveBeenCalledWith(120, heart.cx, heart.cy);
  });
});
```

- [x] **Step 2: Run them and see them fail.**
- [x] **Step 3: Write `G/touchInput.ts`:**

```ts
/** The heart's resting box, in the stage's own pixels. */
export interface HeartArea {
  cx: number;
  cy: number;
  width: number;
  height: number;
}

/**
 * On the heart at rest: inside its box, or inside the ellipse through the box's edges grown by 7%,
 * which reaches a little past the middle of each side. The area never follows the heart's squash or
 * tremor, so an animation can't move the target out from under a thumb.
 */
export function isOnHeart(x: number, y: number, heart: HeartArea): boolean {
  const dx = (x - heart.cx) / (heart.width / 2);
  const dy = (y - heart.cy) / (heart.height / 2);
  return dx * dx + dy * dy < 1.15 || (Math.abs(dx) < 1 && Math.abs(dy) < 1);
}

export interface TouchHandlers {
  /** A finger went down on the heart. */
  onHeartDown: (t: number, x: number, y: number) => void;
  /** A finger lifted off the heart without dragging or holding: the first tap. */
  onHeartTap: (t: number, x: number, y: number) => void;
}

export interface TouchOptions {
  /** Read on every touch, so a resize can move it. */
  heartArea: () => HeartArea;
  /** A pointer's position in the stage's own pixels. */
  toStage: (e: PointerEvent) => { x: number; y: number };
  /** A touch that travels further is a drag. */
  tapSlopPx: number;
  /** A touch held longer is a hold. */
  tapHoldMs: number;
}

interface Grab {
  x: number;
  y: number;
  t: number;
  dragged: boolean;
}

/** Reports touches on the heart until the returned function is called. Every finger counts. */
export function listenForTouches(
  stage: HTMLElement,
  options: TouchOptions,
  handlers: TouchHandlers,
): () => void {
  const grabs = new Map<number, Grab>();

  const onDown = (e: PointerEvent) => {
    if (e.button > 0) return;
    const { x, y } = options.toStage(e);
    if (!isOnHeart(x, y, options.heartArea())) return;
    e.preventDefault();
    grabs.set(e.pointerId, { x, y, t: e.timeStamp, dragged: false });
    handlers.onHeartDown(e.timeStamp, x, y);
  };
  const onMove = (e: PointerEvent) => {
    const grab = grabs.get(e.pointerId);
    if (!grab || grab.dragged) return;
    const { x, y } = options.toStage(e);
    if (Math.hypot(x - grab.x, y - grab.y) > options.tapSlopPx) grab.dragged = true;
  };
  const onUp = (e: PointerEvent) => {
    const grab = grabs.get(e.pointerId);
    grabs.delete(e.pointerId);
    if (!grab || grab.dragged || e.timeStamp - grab.t >= options.tapHoldMs) return;
    handlers.onHeartTap(e.timeStamp, grab.x, grab.y);
  };
  const onCancel = (e: PointerEvent) => grabs.delete(e.pointerId);

  stage.addEventListener("pointerdown", onDown);
  stage.addEventListener("pointermove", onMove);
  stage.addEventListener("pointerup", onUp);
  stage.addEventListener("pointercancel", onCancel);
  return () => {
    stage.removeEventListener("pointerdown", onDown);
    stage.removeEventListener("pointermove", onMove);
    stage.removeEventListener("pointerup", onUp);
    stage.removeEventListener("pointercancel", onCancel);
  };
}
```

- [x] **Step 4: Run the tests.** Expected: PASS.
- [x] **Step 5: Checks, then commit** `feat: tell taps on the gratitude heart from drags and holds`.

### Task A3: The art and the words

**Files:** Create `G/seededRandom.ts`, `G/easing.ts`, `G/heartArt.ts`, `G/heartArt.test.ts`, `G/tierNames.ts`, `G/popInWords.ts`.

- [ ] **Step 1: Write `G/seededRandom.ts` and `G/easing.ts`:**

```ts
/** A seeded random source (xorshift32), so art made from a seed looks the same on every load. */
export function seededRandom(seed: number): () => number {
  let s = seed >>> 0 || 0x9e3779b9;
  return () => {
    s ^= s << 13;
    s >>>= 0;
    s ^= s >>> 17;
    s ^= s << 5;
    s >>>= 0;
    return s / 4294967296;
  };
}
```

```ts
export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const easeInOutSine = (t: number) => -(Math.cos(Math.PI * t) - 1) / 2;
export const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
/** tokens.css's curves, spelled out: Web Animations can't read CSS variables. */
export const EASE_SPRING = "cubic-bezier(0.34, 1.7, 0.5, 1)";
export const EASE_OUT = "cubic-bezier(0.16, 1, 0.3, 1)";
export const EASE_PEEL = "cubic-bezier(0.2, 0.7, 0.2, 1)";
```

- [ ] **Step 2: Write the failing test** `G/heartArt.test.ts`. The heart path runs from x 22 to 218 and y 22 to 212, so the outline must reach those edges, and its normals must point outward there:

```ts
import { describe, expect, it } from "vitest";
import { heartOutline } from "./heartArt";

describe("heartOutline", () => {
  it("goes all the way round the heart, with outward normals at its edges", () => {
    const points = heartOutline(144);
    const xs = points.map((p) => p.x);
    const ys = points.map((p) => p.y);
    expect(Math.min(...xs)).toBeCloseTo(22, 0);
    expect(Math.max(...xs)).toBeCloseTo(218, 0);
    expect(Math.min(...ys)).toBeCloseTo(22, 0);
    expect(Math.max(...ys)).toBeCloseTo(212, 0);
    const left = points.reduce((a, p) => (p.x < a.x ? p : a));
    const right = points.reduce((a, p) => (p.x > a.x ? p : a));
    expect(left.nx).toBeLessThan(-0.9);
    expect(right.nx).toBeGreaterThan(0.9);
    for (const p of points) expect(Math.hypot(p.nx, p.ny)).toBeCloseTo(1, 5);
    for (let i = 1; i < points.length; i++) {
      const gap = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
      expect(gap).toBeLessThan(12);
    }
  });
});
```

- [ ] **Step 3: Run it and see it fail.**
- [ ] **Step 4: Port the art into `G/heartArt.ts`** (the contract's exports):
  - The colors and paths: PJ 141 (`INK`, `PINK`), 178–180 (`HEART_D`, `MINI_D`, `EYE_HEART`).
  - `heartOutline(count)` replaces PJ's DOM sampling (`getPointAtLength`, PJ 261–315). Sample `HEART_D`'s six cubic Béziers by parameter, `count` points spread evenly across the segments. Take each normal from the curve's derivative, unit length, flipped to point away from (120, 120) as PJ 310 does.
  - `bigHeartLayers(uid)` splits PJ's `heartMarkup` (182–259) into six SVGs with the same `viewBox="0 0 240 232"`. Each layer has its own `<defs>`, with ids suffixed by `uid` and by the layer, and PC's class on its root `<svg>`:
    - `h-body`: the gradient fill, the inner rim's blur and the lower highlight (193–196). It's the only one without `position:absolute`, so it sizes the stack.
    - `h-flush`: 197, clipped to the heart.
    - `h-pale`: 199.
    - `h-gloss`: 243–247.
    - `h-face`: the faces and hatches (200–241), the nose (249–252) and the sweat drop (254–257), with no filters.
    - `h-ink`: `data-v="0"` and the three boiling outlines: `heartOutline(72)` jittered ±1.8px by `seededRandom(911 * (v + 1))`, smoothed as PJ 284–289 does, stroke widths 3.8, 4.3 and 4.8.
  - `miniHeartSvg(fill)` = PJ 317–318 with a 2.4 ink stroke.
  - `stampHeartSvg()` = PJ 319–320, plus a copy of `MINI_D` under it, offset (1, 2) in `rgba(28,24,36,.16)`. That replaces PC's filter on `.gr-stamp svg`, since repeated art carries no CSS filter.
  - `GLINT_SVG`, `PUFF_SVG`, `BEAD_SVG`, `HAZE_WAVE_SVG` = PJ 341–343 and 349. `SOUL_SVG` = PJ 350–357.
  - `focusLinesSvg` = PJ `focusSVG` (359–369), drawn with `seededRandom`.
  - `svgDataUrl(svg)` returns `"data:image/svg+xml," + encodeURIComponent(svg)`, for `<img>` sprites.
- [ ] **Step 5: Write `G/tierNames.ts`** from PJ 50–58 (`jp`, `en`), keyed 0–4.
- [ ] **Step 6: Write `G/popInWords.ts`:**
  - `POP_IN_WORDS` = PJ 61–75, keyed by tier 0–4 (PJ's 1–5) plus `stroke` and `shake`. Every word and gloss stays as it is (build-contract item 50).
  - `createPopInPicker(random)` never picks the word it picked last from the same bank (PJ 1822–1827).
- [ ] **Step 7: Run the test.** Expected: PASS. Then run checks and commit `feat: add the gratitude heart's art and words`.

### Task A4: Mini hearts

**Files:** Create `G/miniHeartPhysics.ts`, `G/miniHeartPhysics.test.ts`, `G/miniHeartLayer.ts`.

- [ ] **Step 1: Write the failing tests.** They pin behaviors. If PJ's physics needs a longer time bound than one of these, raise the bound and say so; never weaken the behavior.

```ts
import { describe, expect, it } from "vitest";
import { FEEL_CONFIG } from "./gameConfig";
import { createMiniHeartPhysics, type MiniHeartPhysics } from "./miniHeartPhysics";
import { seededRandom } from "./seededRandom";

const bounds = { width: 390, height: 741, ceiling: 256 };
const heart = { x: 195, y: 420, width: 226, height: 218 };
const STEP = 1 / 120;

const run = (physics: MiniHeartPhysics, seconds: number) => {
  for (let t = 0; t < seconds; t += STEP) physics.step(STEP);
};
/** Steps until every heart rests, for at most `limit` seconds. */
const settle = (physics: MiniHeartPhysics, limit = 10) => {
  for (let t = 0; t < limit && !physics.hearts.every((h) => h.resting); t += STEP)
    physics.step(STEP);
};

describe("createMiniHeartPhysics", () => {
  it("sprays hearts that bounce, settle into a pile along the bottom, then fade away", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(1));
    physics.sprayFromTap(195, 380, heart, 3);
    expect(physics.hearts).toHaveLength(3);
    settle(physics);
    expect(physics.hearts.every((h) => h.resting)).toBe(true);
    for (const h of physics.hearts) {
      expect(h.y + h.size / 2).toBeLessThanOrEqual(bounds.height);
      expect(h.y).toBeGreaterThan(bounds.height - FEEL_CONFIG.miniHearts.pileMax - h.size);
    }
    run(physics, 6);
    expect(physics.hearts).toHaveLength(0);
  });

  it("shoves a settled heart away from a tap beside it", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(2));
    physics.sprayFromTap(195, 380, heart, 3);
    settle(physics);
    const [target] = physics.hearts;
    const tap = { x: target.x + 20, y: target.y };
    const before = Math.hypot(target.x - tap.x, target.y - tap.y);
    physics.shoveAwayFrom(tap.x, tap.y);
    run(physics, 0.1);
    const after = physics.hearts.find((h) => h.id === target.id);
    if (!after) throw new Error("The shoved heart vanished");
    expect(Math.hypot(after.x - tap.x, after.y - tap.y)).toBeGreaterThan(before);
  });

  it("keeps no more hearts in play than the live cap", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(3));
    for (let i = 0; i < 80; i++) {
      physics.sprayFromTap(195, 380, heart, 3);
      run(physics, 1 / 30);
      const inPlay = physics.hearts.filter((h) => h.opacity === 1).length;
      expect(inPlay).toBeLessThanOrEqual(FEEL_CONFIG.miniHearts.live);
    }
  });

  it("keeps every heart between the walls", () => {
    const physics = createMiniHeartPhysics(bounds, seededRandom(4));
    for (let i = 0; i < 20; i++) physics.sprayFromTap(20, 380, heart, 3);
    for (let t = 0; t < 4; t += STEP) {
      physics.step(STEP);
      for (const h of physics.hearts) {
        expect(h.x).toBeGreaterThanOrEqual(0);
        expect(h.x).toBeLessThanOrEqual(bounds.width);
      }
    }
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Port the pile into `G/miniHeartPhysics.ts`.** Sources: PJ 1477–1683 (`spawnBody`, `oldestIndex`, `sleepBody`, `wakeBody`, `removeBody`, `pileStep`, `collide`, `tapShove` and `sweatDrop`), 1685–1707 (`throwMini`, `tapBurst`) and 1729–1734 (`pileDrop`). Changes:
  - Bodies are data. They have no elements, and `el`, `cls`, `html` and `layer` become `kind` ("mini" or "rain") and `tone` (an index into `FEEL_CONFIG.miniHearts.tones`).
  - The physics keeps its own clock, advanced by `step(dt)`: 0 while the screen is frozen.
  - `hearts` exposes each body's `x`, `y`, `size`, `rotation`, `scale` (a bead swelling, then the fade's shrink, as PJ's `placeBody`) and `opacity` (the fade), plus `resting`.
  - Constants come from `FEEL_CONFIG.miniHearts`. Sweat edges come from `heartOutline(72)`. Randomness comes from the injected source.
  - The floor is `height − 8`, and the ceiling is `bounds.ceiling + 2`.
  - Drop the log hooks, `dropToRest`, `pileStepFor`, `strokeBurst` and `impactBurst`. Phase B adds the last two back.
- [ ] **Step 4: Write `G/miniHeartLayer.ts`:**
  - Draw each heart as an `<img class="gr-p">`: mini hearts from `svgDataUrl(miniHeartSvg(tone))`, rain from `svgDataUrl(stampHeartSvg())`. Make each URL once.
  - Rain goes in `behind` and minis in `front` (PJ 689–690).
  - Each frame, set `transform` to `translate(x − size/2, y − size/2) rotate(rotation) scale(scale)`, plus `opacity`.
  - Reuse elements by heart id, and remove the elements of hearts that are gone. `clear()` removes them all.
- [ ] **Step 5: Run the tests.** Expected: PASS. Then run checks and commit `feat: add the gratitude mini hearts`.

### Task A5: Styles

**Files:** Create `G/gratitude-mini-game.css` from PC.

- [ ] **Step 1: Port PC**, keeping lines 7–269 and 284–311, 322–344 and 452–460, with these changes:
  - **The root** `.gr` also gets `z-index: var(--z-sheet)`: it's portaled over the phone, like the sticker detail. Add `.gr-ground { position: absolute; inset: 0; pointer-events: none; }` for the tier backgrounds' container.
  - **Fine print:** drop `.gr-fine`; the screen uses the app's `.fine`.
  - **The top:** `.gr-piece-art` holds a `StickerFigure`, and `.gr-photo` holds a `PhotoSticker`, which draws its own rim and tilt. Drop `.gr-photo-face`, and keep `.gr-photo`'s position and `.gr-photo-dot`.
  - **The heart:** rename `.gr-heart-svg` to `.gr-heart-layers` everywhere. `.gr-heart-layers` is `position: relative` and carries PC's two drop-shadows (PC 175). `.gr-heart-layers > svg` is `position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible`, and `.gr-heart-layers > .h-body` is `position: relative; height: auto`. PC's `.h-flush`, `.h-pale`, `.h-gloss` and `.h-ink` rules now apply to those layers' root `<svg>`s, so the gloss's translate and sway are compositor moves.
  - **Sprites:** `.gr-p img { display: block; width: 100%; height: 100%; }`. Drop the `.gr-stamp svg` filter and the `.gr-drop` rules.
  - **Lettering:** `.gr-cap` loses its `filter`, and `.gr-cap::before` gains `text-shadow: 2px 4px 3px rgba(28, 24, 36, 0.24)`.
  - **The receipt:** `.gr-receipt.is-on` plays PJ 2233's entrance as a CSS animation, from `scale(1.06) translateY(-6px)` and opacity 0, over 380ms on `var(--ease-peel)`. Under reduced motion it doesn't play. Size `.gr-rc-photo .photo-sticker` to the box.
  - **New:**
    - `.gr-frames`, the frame-time readout: absolute at left 12px, bottom 12px, z-index 60, `rgba(28,24,36,.82)` with `#f2f1f6` text in the `.fine` type, and no pointer events.
    - `.gr-failure`, the stopped line: absolute at left and right 20px, bottom 24px, z-index 60, Liner Lift on `--shadow-lift`, ink text, 14px, 600, selectable.
  - **Removed with their features:** the chip (270–282), fog (312–320), ghost, demo, iOS and giver rules (346–450). `.gr-tip`, `.gr-corner*`, `.gr-dent`, `.gr-shakemarks`, `.gr-speedfield` and `.gr-line` stay, for phase B.
- [ ] **Step 2: Checks, then commit** `feat: add the gratitude mini-game's styles`.

### Task A6: The heart and the ground

**Files:** Create `G/heartFaces.ts`, `G/heartMotion.ts`, `G/tierBackground.ts` (the contract's exports).

- [ ] **Step 1: `heartFaceFor`** = PJ `faceFor` (1086–1096), re-keyed (PJ `T` = tier + 1). A null tier is `face: "none"`. The nose's 1,800 stays: it sits inside オーバーヒート's 1,100–3,000.
- [ ] **Step 2: `createHeartMotion`** ports the heart's part of PJ `draw` (1149–1304), with PJ's constants:
  - **Position** springs to rest (1166–1171).
  - **Squash** (1175–1182): `squash(s)` is PJ's `sq.v -= s`.
  - **Breathing** at ready (1185–1188), and the **heartbeat** from tier 2 (1189–1193).
  - **Wind-up** while sending (1238–1241), from `sendingProgress` eased with `easeInOutSine`, toward the giver's angle.
  - **Tremor** from tier 3 (1250–1255), except while limp.
  - **Limp** (1265–1266): `goLimp()` ramps it over 0.5s of play time, as PJ `anchorLimp`.
  - **Stretch composition** (1268–1269).
  - **Screen shake and punch**, with the heart held out of both (1271–1280): `shake(a)` is PJ's `kick`; `punch(p)` sets the punch.
  - **The flight** (1154–1162, 2126–2128): `flyToGiver()` resolves when it lands, after 0.38s of play time, shrinking 1 → 0.2 and stretching along its path. Under reduced motion it's a 250ms fade instead (2121–2124).
  - **`fadeOut()`** fades the heart over 300ms, for the tidy-up (2201).
  - `step` returns the page, anchor and body transforms, the heart's opacity and its centre.
  - **Not yet:** jelly, impact, lean, pull, sway, tilt and loose (1163–1165, 1194–1249, 1256–1264). Phase B adds them.
- [ ] **Step 3: `createTierBackground`** builds PJ's ground (679–683, without `speedField`) inside `ground`.
  - `show(tier, intensity)` = PJ `applyBg` (1076–1085) without the drops, reading reduced motion through its getter.
  - `step(real)` flips the focus lines at 8fps and turns the rays (1290–1291).
  - `setLayout` regenerates two `focusLinesSvg`s (seeds 4242 and 7777) around the heart and places the beam (822–825).
  - `ascend(on, intensity)` = the climax's beam and white-out (2150–2151, 2159–2160).
  - `flash()` = `flashScreen` (2179–2184).
  - `hideAll()` = the tidy-up's resets (2199).
- [ ] **Step 4: Checks, then commit** `feat: add the gratitude heart's motion, faces and ground`.

### Task A7: The HUD, lettering and particles

**Files:** Create `G/comboHud.ts`, `G/tierSlamAndPopIns.ts`, `G/particleEffects.ts` (the contract's exports).

- [ ] **Step 1: `createComboHud`** builds PJ's HUD (752–767) inside `hud`.
  - `show(on)` toggles its shown state.
  - `step` = `drawHud` (1307–1331), with changes:
    - The fill is `view.barFill`: the seconds left over a full bar's seconds (SPEC "On screen").
    - The seconds label shows `view.secondsLeft` to one decimal.
    - It runs hot under 30% and blinks under 12% (keep PC's timings), and shivers when low and `running`, except under reduced motion.
    - The amount counts up as 1323–1326, with en-US thousands separators, and the multiplier shows one decimal.
    - The multiplier sticker pulses whenever its whole number rises (1049–1050, 1366–1372).
  - `hit(secondsAdded)` = `tickGain` (1334–1365), plus the amount's pulse (1010):
    - The sliver's width is `secondsAdded / fullBarSeconds()` of the track.
    - The label is `+0.07s` (two decimals under 0.1s, otherwise one), at most one every 0.13s.
    - Below 0.005s nothing shows.
- [ ] **Step 2: `createLettering`:**
  - `slamTierName` = PJ `slam` (1738–1764); `showPopInWord` = `popIn` (1766–1805) with `nextSlot` (1811–1821) and `SLOTS` (603).
  - Words come from `createPopInPicker`. Size scales with the fixed `intensity`, as PJ's heat does.
  - **Placing never reads layout.** After `document.fonts.ready`, measure every word, gloss and slam text once, in a hidden probe, as width per pixel of font size, and scale by each word's size. Until measured, estimate 1em for each Japanese character and 0.56em for each gloss character at 11px.
  - `clear()` removes every word.
- [ ] **Step 3: `createParticleEffects`** ports PJ 1375–1470:
  - `particle`/`fly`: pooled per kind, with PJ's caps.
  - `rise`, `glint`, `steam`, `bead`, `burst`, and `stampAt` as `stamp`, keeping 16 with the oldest fading.
  - Sprites are `<img>`s from `svgDataUrl` of heartArt's SVGs, one URL per kind and tone, made once. Reduced motion follows PJ (1400–1406).
  - `tidy()` = the stamps' part of PJ's tidy-up (2195–2197, 2203–2204).
- [ ] **Step 4: Checks, then commit** `feat: add the gratitude HUD, lettering and particles`.

### Task A8: Endings, frame times and the engine

**Files:** Create `G/gameEndings.ts`, `G/frameTimeReadout.ts`, `G/miniGameEngine.ts`.

- [ ] **Step 1: `G/gameEndings.ts`** (the contract's exports):
  - `flyHeartToGiver`: `heart.flyToGiver()`, then PJ `hitGiver` (2131–2139): the giver's picture squashes, the dot pops, `burst(6)` at `giverPoint()`, and `say` "Sent to <handle>."
  - `playAscension`, PJ `climax` (2140–2162):
    - `freeze(140)`, `background.flash()`, `forceFace({ face: "limp", blush: 0, sweat: false, ink: false, pale: true })`.
    - `heart.goLimp()`, `background.ascend(true, intensity)`.
    - `wait(240)`, the 昇天 slam, a 昇天 pop-in, `wait(380)`, another.
    - The soul rises to the giver: PJ `soulRise` (2168–2178) as one animation on `soul`, with `wait(1500)`.
    - The giver is hit as above, `ascend(false)`, `wait(250)`.
  - `sighAndTidy`: PJ `fuu` (2185–2193) on the React-rendered `fuu` with `wait(1000)`, then PJ `tidy` (2194–2205): `effects.tidy()`, `physics.clear()`, `miniHearts.clear()`, `background.hideAll()`, `heart.fadeOut()`, `wait(400)`.
- [ ] **Step 2: Write `G/frameTimeReadout.ts`:**

```ts
/** A readout of recent frame times, for measuring on a phone, where LINE's browser has no developer tools. */
export interface FrameTimeReadout {
  frame: (ms: number) => void;
  destroy: () => void;
}

/** The readout covers this much play. */
const SPAN_MS = 10_000;

export function createFrameTimeReadout(host: HTMLElement): FrameTimeReadout {
  const el = document.createElement("p");
  el.className = "gr-frames";
  el.setAttribute("aria-hidden", "true");
  host.append(el);
  const frames: { at: number; ms: number }[] = [];
  let clock = 0;
  let shownAt = -Infinity;
  return {
    frame(ms) {
      clock += ms;
      frames.push({ at: clock, ms });
      while (frames.length > 0 && clock - frames[0].at > SPAN_MS) frames.shift();
      if (clock - shownAt < 500) return;
      shownAt = clock;
      let worst = 0;
      let over20 = 0;
      let over34 = 0;
      for (const f of frames) {
        worst = Math.max(worst, f.ms);
        if (f.ms > 20) over20++;
        if (f.ms > 34) over34++;
      }
      const fps = (frames.length / Math.min(SPAN_MS, clock)) * 1000;
      el.textContent = `last 10s · worst ${worst.toFixed(0)}ms · ${over20} over 20ms · ${over34} over 34ms · ${fps.toFixed(0)} fps`;
    },
    destroy() {
      el.remove();
    },
  };
}
```

- [ ] **Step 3: Write `G/miniGameEngine.ts`:**

```ts
import { createGratitudeCombo, type ComboEvent, type ComboRecord, type Tier } from "./combo";
import { createComboHud } from "./comboHud";
import { createFrameTimeReadout } from "./frameTimeReadout";
import { FEEL_CONFIG, GAME_CONFIG } from "./gameConfig";
import { flyHeartToGiver, playAscension, sighAndTidy, type EndingParts } from "./gameEndings";
import { bigHeartLayers, SOUL_SVG } from "./heartArt";
import { heartFaceFor, type HeartFace } from "./heartFaces";
import { createHeartMotion, type HeartLayout } from "./heartMotion";
import { createMiniHeartLayer } from "./miniHeartLayer";
import { createMiniHeartPhysics, type HeartBox } from "./miniHeartPhysics";
import { createParticleEffects } from "./particleEffects";
import { seededRandom } from "./seededRandom";
import { createTierBackground } from "./tierBackground";
import { TIER_NAMES } from "./tierNames";
import { createLettering } from "./tierSlamAndPopIns";
import { listenForTouches } from "./touchInput";

/** The screen's parts that React renders; the engine fills and moves them. */
export interface MiniGameParts {
  root: HTMLElement;
  /** Everything that shakes: the ground, the top, the HUD and the stage. */
  page: HTMLElement;
  ground: HTMLElement;
  hud: HTMLElement;
  stage: HTMLElement;
  hint: HTMLElement;
  /** A polite live region. */
  live: HTMLElement;
  giverPhoto: HTMLElement;
  giverDot: HTMLElement;
  fuu: HTMLElement;
}

export interface MiniGameOptions {
  /** As printed: "@alice". */
  giverHandle: string;
  intensity: number;
  reduced: boolean;
  showFrameTimes: boolean;
  /** The finished combo, before its ending plays. */
  onRecord: (record: ComboRecord) => void;
  /** The ending has played, or the page went hidden: time for the receipt. */
  onFinished: (ending: { caught: boolean; record: ComboRecord }) => void;
  /** The frame loop failed and stopped. */
  onError: (message: string) => void;
}

export interface MiniGameEngine {
  /** The screen is closing: a combo in play ends and is recorded. */
  close: () => void;
  setReduced: (reduced: boolean) => void;
  destroy: () => void;
}

/** The screen's size when it has none yet, as in a test's DOM. */
const FALLBACK = { width: 390, height: 741 };
/** The top and the HUD sit above the heart. */
const TOP = 176;
const HUD_TOP = 172;
const HUD_HEIGHT = 80;

let mounts = 0;

/**
 * The gratitude mini-game on one animation-frame loop: touches and keys go to the combo's rules,
 * whose events drive every effect, and each frame redraws the heart, the HUD, the ground and the
 * mini hearts. React renders the screen's parts once and hears only the record and the ending.
 */
export function mountMiniGameEngine(
  parts: MiniGameParts,
  options: MiniGameOptions,
): MiniGameEngine {
  const { root, page, ground, hint, live, giverPhoto, giverDot, fuu } = parts;
  const mount = ++mounts;
  const random = seededRandom(0xa11ce + mount * 7);
  const combo = createGratitudeCombo(GAME_CONFIG);
  const { intensity } = options;
  let reduced = options.reduced;

  // The stage's layers, back to front: stamps, 昇天's rain, the heart, mini hearts, the soul, effects, lettering.
  const layer = (className: string) => {
    const el = document.createElement("div");
    el.className = className;
    parts.stage.append(el);
    return el;
  };
  const stampsLayer = layer("gr-layer");
  const behind = layer("gr-layer");
  const anchor = layer("gr-heart-anchor");
  const front = layer("gr-layer");
  const soul = layer("gr-soul");
  const effectsLayer = layer("gr-layer");
  const captions = layer("gr-layer");
  soul.innerHTML = SOUL_SVG;

  const body = document.createElement("div");
  body.className = "gr-heart-body";
  const art = bigHeartLayers(`h${mount}`);
  body.innerHTML = `<div class="gr-heart-layers">${art.body}${art.flush}${art.pale}${art.gloss}${art.face}${art.ink}</div>`;
  const ink = body.querySelector(".h-ink");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gr-heart-btn";
  button.setAttribute("aria-label", `Send gratitude to ${options.giverHandle}`);
  body.append(button);
  anchor.append(body);

  const hud = createComboHud(parts.hud, { reduced: () => reduced, random });
  const background = createTierBackground(ground, () => reduced);
  const lettering = createLettering(captions, { intensity, random });
  const effects = createParticleEffects(
    { stamps: stampsLayer, effects: effectsLayer },
    { reduced: () => reduced, random },
  );
  const miniHearts = createMiniHeartLayer({ front, behind });
  const physics = createMiniHeartPhysics({ ...FALLBACK, ceiling: TOP + HUD_HEIGHT }, random);
  const readout = options.showFrameTimes ? createFrameTimeReadout(root) : null;

  // Layout, read when the screen mounts or resizes, never per frame.
  let size = { ...FALLBACK };
  let rect = { left: 0, top: 0, scale: 1 };
  const layoutFor = (width: number, height: number): HeartLayout => {
    const w = Math.min(width * 0.58, 232);
    const h = (w * 232) / 240;
    const top = TOP + HUD_HEIGHT;
    return {
      rest: { x: width / 2, y: Math.max(top + (height - top) * 0.38, top + h * 0.5 + 12) },
      width: w,
      height: h,
      giver: {
        x: giverPhoto.offsetLeft + giverPhoto.offsetWidth / 2 || 128,
        y: giverPhoto.offsetTop + giverPhoto.offsetHeight / 2 || 120,
      },
      screen: { width, height },
    };
  };
  let L = layoutFor(size.width, size.height);
  const heart = createHeartMotion(L, random);
  const applyLayout = () => {
    size = {
      width: root.clientWidth || FALLBACK.width,
      height: root.clientHeight || FALLBACK.height,
    };
    const box = root.getBoundingClientRect();
    rect = { left: box.left, top: box.top, scale: box.width / size.width || 1 };
    L = layoutFor(size.width, size.height);
    heart.setLayout(L);
    body.style.width = `${L.width}px`;
    parts.hud.style.setProperty("--hud-top", `${HUD_TOP}px`);
    hint.style.top = `${L.rest.y + L.height * 0.5 + 22}px`;
    root.style.setProperty("--rc-top", `${Math.max(TOP + HUD_HEIGHT - 10, L.rest.y - 110)}px`);
    background.setLayout(size.width, size.height, { x: L.rest.x, y: L.rest.y, height: L.height });
    lettering.setLayout(size.width, size.height, TOP + HUD_HEIGHT);
    physics.setBounds({ ...size, ceiling: TOP + HUD_HEIGHT });
  };
  applyLayout();
  const resizes =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          if (root.clientWidth !== size.width || root.clientHeight !== size.height) applyLayout();
        })
      : null;
  resizes?.observe(root);

  const heartBox = (): HeartBox => ({ x: L.rest.x, y: L.rest.y, width: L.width, height: L.height });
  const say = (text: string) => {
    live.textContent = text;
  };

  root.dataset.phase = "ready";
  root.dataset.tier = "";
  root.dataset.hud = "off";
  root.dataset.reduced = reduced ? "1" : "0";

  let face = heartFaceFor(null, intensity, 0);
  let forced: Partial<HeartFace> | null = null;
  const writeFace = () => {
    const f = { ...face, ...forced };
    body.dataset.face = f.face;
    body.dataset.blush = String(f.blush);
    body.dataset.sweat = f.sweat ? "1" : "0";
    body.dataset.ink = f.ink ? "1" : "0";
    body.dataset.nose = f.nose ? "1" : "0";
    body.dataset.pale = f.pale ? "1" : "0";
  };
  const showFace = () => {
    const view = combo.view;
    face = heartFaceFor(view.tier, intensity, view.total);
    writeFace();
  };
  writeFace();

  // Play time stops while a tier-up or the climax holds the screen; endings wait on it.
  let play = 0;
  let wall = 0;
  let heldUntil = 0;
  const waits: { at: number; resolve: () => void }[] = [];
  let sweat = 0;
  let lastAnnounce = -Infinity;
  let sendingSince = 0;
  let ending = false;
  let alive = true;
  let running = true;
  let raf = 0;
  let last = 0;

  const endingParts: EndingParts = {
    heart,
    background,
    lettering,
    effects,
    physics,
    miniHearts,
    hud,
    giverPhoto,
    giverDot,
    giverPoint: () => L.giver,
    fuu,
    soul,
    heartBox,
    wait: (ms) => new Promise((resolve) => waits.push({ at: play + ms / 1000, resolve })),
    freeze: (ms) => {
      heldUntil = Math.max(heldUntil, performance.now() + ms);
    },
    forceFace: (f) => {
      forced = f;
      writeFace();
    },
    reduced: () => reduced,
    intensity,
    say,
    giverHandle: options.giverHandle,
  };

  const finish = (caught: boolean, record: ComboRecord) => {
    if (!alive) return;
    root.dataset.phase = "done";
    root.dataset.hud = "off";
    hud.show(false);
    options.onFinished({ caught, record });
  };

  async function end(record: ComboRecord, caught: boolean, hidden: boolean) {
    ending = true;
    root.dataset.phase = "ending";
    try {
      options.onRecord(record);
    } catch (error) {
      // The record is the app's to keep; its failure shouldn't strand the person mid-ending.
      console.error("Keeping the gratitude failed; the ending plays on", error);
    }
    if (hidden) return finish(caught, record);
    if (!caught) await flyHeartToGiver(endingParts);
    else {
      if (combo.view.tier === 4 && !reduced) await playAscension(endingParts);
      else await flyHeartToGiver(endingParts);
      await sighAndTidy(endingParts);
    }
    finish(caught, record);
  }

  const onCaught = () => {
    root.dataset.phase = "running";
    root.dataset.hud = "on";
    hud.show(true);
    say("Caught it. Keep tapping before the bar runs out.");
  };

  const onTierUp = (tier: Tier) => {
    root.dataset.tier = String(tier);
    background.show(tier, intensity);
    if (!reduced) heart.punch(0.035 * (0.6 + intensity));
    lettering.slamTierName(TIER_NAMES[tier].jp, TIER_NAMES[tier].en);
    if (tier === 2) effects.burst(5, L.rest);
  };

  const onHit = (secondsAdded: number, x: number, y: number, tierUp: boolean) => {
    const view = combo.view;
    const tier = view.tier ?? 0;
    const hits = view.hits;
    const box = heartBox();
    heart.squash(3.3);
    hud.hit(secondsAdded);
    effects.stamp(x, y);
    effects.rise(1 + (tier >= 2 ? Math.round(intensity * 1.5) : 0), box);
    const every = tier >= 2 ? 2 : 3;
    if (!tierUp && hits % every === 0) lettering.showPopInWord(tier, box);
    if (tier === 0 && hits % 2 === 0) effects.glint(box);
    if (tier === 1 && hits % 4 === 0) effects.bead(box);
    if (tier >= 2 && !reduced) heart.shake(tier >= 3 ? 5 * intensity : 2 * intensity);
    if (tier === 2 && hits % 5 === 0) effects.burst(2, L.rest);
    if (tier >= 3 && hits % 2 === 0) effects.steam(Math.max(1, Math.round(intensity * 2)), box);
    if (tier >= 3 && hits % 2 === 1) physics.rainFromTop();
    if (!reduced && physics.hearts.length > 0) physics.shoveAwayFrom(x, y);
    if (tier >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
      physics.sprayFromTap(x, y, box, Math.min(3, 1 + Math.floor((view.multiplier - 1) / 3)));
    }
    if (tier === 4 && hits % 3 === 0) effects.glint(box);
    if (play - lastAnnounce > 1.6) {
      lastAnnounce = play;
      say(`${view.total.toLocaleString("en-US")} gratitude, times ${view.multiplier.toFixed(1)}`);
    }
  };

  const handle = (events: readonly ComboEvent[], x: number, y: number, hidden = false) => {
    const tierUp = events.some((e) => e.kind === "tier");
    for (const e of events) {
      if (e.kind === "caught") onCaught();
      else if (e.kind === "hit") onHit(e.secondsAdded, x, y, tierUp);
      else if (e.kind === "limited") {
        heart.squash(3.3);
        effects.stamp(x, y);
      } else if (e.kind === "tier") onTierUp(e.tier);
      else void end(e.record, e.caught, hidden);
    }
    showFace();
  };

  const firstTap = (t: number, x: number, y: number) => {
    const events = combo.tapHeart(t);
    if (!events.some((e) => e.kind === "hit")) return;
    sendingSince = t;
    root.dataset.phase = "sending";
    effects.stamp(x, y);
    effects.rise(1, heartBox());
    handle(
      events.filter((e) => e.kind !== "hit"),
      x,
      y,
    );
  };

  const stopTouches = listenForTouches(
    parts.stage,
    {
      heartArea: () => ({ cx: L.rest.x, cy: L.rest.y, width: L.width, height: L.height }),
      toStage: (e) => ({
        x: (e.clientX - rect.left) / rect.scale,
        y: (e.clientY - rect.top) / rect.scale,
      }),
      tapSlopPx: FEEL_CONFIG.tapSlopPx,
      tapHoldMs: FEEL_CONFIG.tapHoldMs,
    },
    {
      onHeartDown: (t, x, y) => {
        if (!running || ending) return;
        const phase = combo.view.phase;
        if (phase === "ready") heart.squash(3.6);
        else if (phase === "sending" || phase === "running") handle(combo.tapHeart(t), x, y);
      },
      onHeartTap: (t, x, y) => {
        if (running && !ending && combo.view.phase === "ready") firstTap(t, x, y);
      },
    },
  );

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    if (!running || ending) return;
    // Keyboard taps land on the heart's middle; performance.now keeps them on the loop's clock.
    const x = L.rest.x;
    const y = L.rest.y + 10;
    const phase = combo.view.phase;
    if (phase === "ready" && !e.repeat) {
      heart.squash(3.6);
      firstTap(performance.now(), x, y);
    } else if (phase === "sending" || phase === "running") {
      handle(combo.tapHeart(performance.now()), x, y);
    }
  };
  button.addEventListener("keydown", onKey);
  // touch-action stops panning and zooming; this also keeps WebKit from bouncing the page mid-mash.
  const holdStill = (e: TouchEvent) => e.preventDefault();
  parts.stage.addEventListener("touchmove", holdStill, { passive: false });

  // A combo in play ends the moment the page is hidden or goes away, so its record is sent in time.
  const onHidden = () => {
    if (document.visibilityState !== "hidden") return;
    endNow(true);
  };
  const onPageHide = () => endNow(true);
  const endNow = (hidden: boolean) => {
    const phase = combo.view.phase;
    if (ending || (phase !== "sending" && phase !== "running")) return;
    handle(combo.endCombo(performance.now()), L.rest.x, L.rest.y, hidden);
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", onPageHide);

  const fail = (error: unknown) => {
    running = false;
    cancelAnimationFrame(raf);
    console.error("The gratitude mini-game stopped", error, combo.view);
    options.onError(error instanceof Error ? error.message : String(error));
  };

  const frame = (now: number) => {
    if (!running) return;
    raf = requestAnimationFrame(frame);
    try {
      const realMs = last ? now - last : 16;
      last = now;
      readout?.frame(realMs);
      const real = Math.min(0.05, realMs / 1000);
      wall += real;
      const due = combo.advanceTo(now);
      if (due.length > 0) handle(due, L.rest.x, L.rest.y);
      const view = combo.view;
      const dt = view.frozen || now < heldUntil ? 0 : real;
      play += dt;
      for (const w of waits.filter((x) => play >= x.at)) {
        waits.splice(waits.indexOf(w), 1);
        w.resolve();
      }

      const tier = view.tier ?? 0;
      if (view.phase === "running" && tier >= 2 && !reduced) {
        sweat += FEEL_CONFIG.miniHearts.sweatPerSecond[tier] * (0.7 + 0.5 * intensity) * dt;
        for (; sweat >= 1; sweat -= 1) physics.sweatFromHeart(heartBox());
      }
      physics.step(dt);
      miniHearts.draw(physics.hearts);

      const sendingProgress =
        view.phase === "sending" ? (now - sendingSince) / GAME_CONFIG.catchWindowMs : 0;
      const f = heart.step(dt, real, {
        phase: view.phase,
        tier: view.tier,
        intensity,
        reduced,
        sendingProgress,
      });
      page.style.transform = f.page;
      anchor.style.transform = f.anchor;
      anchor.style.opacity = String(f.opacity);
      body.style.transform = f.body;
      if (face.ink && !reduced) ink?.setAttribute("data-v", String(Math.floor(wall * 12) % 3));

      background.step(real);
      hud.step(real, {
        total: view.total,
        multiplier: view.multiplier,
        secondsLeft: view.secondsLeft,
        barFill: view.barFill,
        running: view.phase === "running",
      });

      // Once the receipt is up and the pile has melted, nothing moves: the loop sleeps.
      if (root.dataset.phase === "done" && physics.hearts.length === 0 && !readout) {
        running = false;
        cancelAnimationFrame(raf);
      }
    } catch (error) {
      fail(error);
    }
  };
  raf = requestAnimationFrame(frame);

  return {
    close: () => endNow(false),
    setReduced: (next) => {
      reduced = next;
      root.dataset.reduced = next ? "1" : "0";
    },
    destroy: () => {
      alive = false;
      running = false;
      cancelAnimationFrame(raf);
      stopTouches();
      button.removeEventListener("keydown", onKey);
      parts.stage.removeEventListener("touchmove", holdStill);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      resizes?.disconnect();
      readout?.destroy();
      lettering.clear();
      effects.tidy();
      miniHearts.clear();
      // A remount (StrictMode's included) builds into the same elements, so everything built goes.
      parts.stage.replaceChildren();
      parts.hud.replaceChildren();
      ground.replaceChildren();
      page.style.transform = "";
      for (const key of ["phase", "tier", "hud", "reduced"]) delete root.dataset[key];
    },
  };
}
```

- [ ] **Step 4: Checks** (typecheck proves the modules meet the contract), then commit `feat: run the gratitude mini-game on one frame loop`.

### Task A9: The screen

**Files:** Create `G/GratitudeMiniGame.tsx`, `G/GratitudeMiniGame.test.tsx`.

- [ ] **Step 1: Write the failing tests:**

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GratitudeMiniGame, type GratitudeResult } from "./GratitudeMiniGame";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const sticker = {
  id: "s1",
  no: 147,
  timeUsed: 292,
  createdAt: Date.UTC(2026, 8, 23),
  urls: { png: "blob:sticker" },
  width: 400,
  height: 400,
};
const giver = { handle: "alice", displayName: "Alice Sato" };
const onEnd = vi.fn<(result: GratitudeResult) => void>();
const onClose = vi.fn();

let host: HTMLDivElement;
let root: Root;
const heart = () => {
  const el = document.querySelector<HTMLButtonElement>(".gr-heart-btn");
  if (!el) throw new Error("No heart on screen");
  return el;
};
const play = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

beforeEach(() => {
  vi.useFakeTimers({
    toFake: [
      "setTimeout",
      "clearTimeout",
      "requestAnimationFrame",
      "cancelAnimationFrame",
      "performance",
      "Date",
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
  root = createRoot(host);
  act(() =>
    root.render(
      <GratitudeMiniGame
        sticker={sticker}
        giver={giver}
        intensity={0.7}
        showFrameTimes={false}
        onEnd={onEnd}
        onClose={onClose}
      />,
    ),
  );
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
  onEnd.mockReset();
  onClose.mockReset();
});

describe("GratitudeMiniGame", () => {
  it("sends with one tap: the heart flies to the giver and the receipt says so", async () => {
    act(() => {
      heart().dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }));
    });
    await play(3000);
    expect(onEnd).toHaveBeenCalledTimes(1);
    expect(onEnd).toHaveBeenCalledWith(expect.objectContaining({ stickerId: "s1", hits: 1 }));
    expect(document.querySelector(".gr-receipt")?.textContent).toContain("Sent to @alice");
  });

  it("closes without a result before any tap", () => {
    act(() => document.querySelector<HTMLButtonElement>(".gr-close")?.click());
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onEnd).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Write `G/GratitudeMiniGame.tsx`:**

```tsx
import { Heart, Wind, X } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { formatClock, formatDay, formatHandle, formatNo } from "../stickers/format";
import { StickerFigure } from "../stickers/StickerFigure";
import type { StickerUrls } from "../stickers/stickerUrls";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { ComboRecord } from "./combo";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";
import { TIER_NAMES } from "./tierNames";
import "./gratitude-mini-game.css";

/** A finished combo and the sticker it thanks: what the app keeps. */
export interface GratitudeResult extends ComboRecord {
  stickerId: string;
}

interface Props {
  sticker: {
    id: string;
    no: number;
    timeUsed: number;
    createdAt: number;
    urls: StickerUrls;
    width: number;
    height: number;
  };
  /** Who gave the sticker, and gets the gratitude. */
  giver: { handle: string; displayName: string; pictureUrl?: string };
  /** The effects' dial, 0 to 1. */
  intensity: number;
  showFrameTimes: boolean;
  /** The combo's result, the moment it ends and before its ending plays. */
  onEnd?: (result: GratitudeResult) => void;
  onClose: () => void;
}

function need<E extends Element>(el: E | null, what: string): E {
  if (!el) throw new Error(`The gratitude mini-game is missing its ${what}`);
  return el;
}

/** Send gratitude, over the whole phone: the sticker and its giver, the heart, the combo, the receipt. */
export function GratitudeMiniGame({
  sticker,
  giver,
  intensity,
  showFrameTimes,
  onEnd,
  onClose,
}: Props) {
  const reduced = useReducedMotion();
  const [ending, setEnding] = useState<{ caught: boolean; record: ComboRecord } | null>(null);
  const [failure, setFailure] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const page = useRef<HTMLDivElement>(null);
  const ground = useRef<HTMLDivElement>(null);
  const hud = useRef<HTMLDivElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const hint = useRef<HTMLParagraphElement>(null);
  const live = useRef<HTMLParagraphElement>(null);
  const photo = useRef<HTMLDivElement>(null);
  const dot = useRef<HTMLSpanElement>(null);
  const fuu = useRef<HTMLDivElement>(null);
  const engine = useRef<MiniGameEngine | null>(null);
  const handle = formatHandle(giver.handle);

  // The engine mounts once per screen; its callbacks read the latest props through this.
  const latest = useRef({ onEnd, stickerId: sticker.id, reduced });
  useLayoutEffect(() => {
    latest.current = { onEnd, stickerId: sticker.id, reduced };
  });

  useLayoutEffect(() => {
    const mounted = mountMiniGameEngine(
      {
        root: need(root.current, "root"),
        page: need(page.current, "page"),
        ground: need(ground.current, "ground"),
        hud: need(hud.current, "HUD"),
        stage: need(stage.current, "stage"),
        hint: need(hint.current, "hint"),
        live: need(live.current, "live region"),
        giverPhoto: need(photo.current, "giver's picture"),
        giverDot: need(dot.current, "giver's heart dot"),
        fuu: need(fuu.current, "sigh"),
      },
      {
        giverHandle: handle,
        intensity,
        reduced: latest.current.reduced,
        showFrameTimes,
        onRecord: (record) =>
          latest.current.onEnd?.({ ...record, stickerId: latest.current.stickerId }),
        onFinished: setEnding,
        onError: setFailure,
      },
    );
    engine.current = mounted;
    return () => {
      engine.current = null;
      mounted.destroy();
    };
    // One screen, one engine: a different giver or sticker opens a new screen.
  }, []);

  useEffect(() => engine.current?.setReduced(reduced), [reduced]);

  // LINE's header shows the page title.
  useEffect(() => {
    const was = document.title;
    document.title = "Send gratitude";
    return () => {
      document.title = was;
    };
  }, []);

  const close = () => {
    engine.current?.close();
    onClose();
  };
  useFocusTrap(root, { onEscape: close });

  const tier = ending ? TIER_NAMES[ending.record.peakTier] : null;
  const screen = (
    <div className="gr" ref={root} role="dialog" aria-label="Send gratitude" tabIndex={-1}>
      <div className="gr-page" ref={page}>
        <div className="gr-ground" ref={ground} />
        <header className="gr-top">
          <figure className="gr-piece">
            <StickerFigure
              className="gr-piece-art"
              urls={sticker.urls}
              width={sticker.width}
              height={sticker.height}
            />
          </figure>
          <div className="gr-photo" ref={photo}>
            <PhotoSticker src={giver.pictureUrl} name={giver.displayName} size={56} />
            <span className="gr-photo-dot" ref={dot} aria-hidden>
              <span className="gr-dot">
                <Heart weight="fill" />
              </span>
            </span>
          </div>
          <div className="gr-from">
            <p className="fine">From</p>
            <p className="gr-from-name">{handle}</p>
            <p className="fine">
              {formatNo(sticker.no)} · {formatClock(sticker.timeUsed)} ·{" "}
              {formatDay(sticker.createdAt)}
            </p>
          </div>
          <button type="button" className="gr-close" aria-label="Close" onClick={close}>
            <X />
          </button>
        </header>
        <div className="gr-hud" ref={hud} aria-hidden />
        <div className="gr-stage" ref={stage} />
        <p className="gr-hint" ref={hint}>
          Tap the heart
        </p>
      </div>
      <div className="gr-fuu" ref={fuu} aria-hidden>
        <span>fuu…</span>
        <Wind />
      </div>
      <p className="gr-sr" ref={live} aria-live="polite" />
      {ending && (
        <section
          className="gr-receipt is-on"
          data-kind={ending.caught ? "combo" : "sent"}
          aria-label="Gratitude sent"
        >
          <div className="gr-rc-row">
            <div className="gr-rc-photo">
              <PhotoSticker src={giver.pictureUrl} name={giver.displayName} size={58} />
              <span className="gr-photo-dot" aria-hidden>
                <span className="gr-dot">
                  <Heart weight="fill" />
                </span>
              </span>
            </div>
            <div className="gr-rc-text">
              {ending.caught && tier ? (
                <>
                  <p className="gr-rc-figure">
                    {ending.record.total.toLocaleString("en-US")}
                    <small> ♡</small>
                  </p>
                  <p className="gr-rc-head">gratitude to {handle}</p>
                  <p className="gr-rc-sub fine">
                    best ×{ending.record.peakMult.toFixed(1)} ·{" "}
                    {(ending.record.durationMs / 1000).toFixed(1)}s{"\n"}
                    {tier.jp} {tier.en} · {ending.record.method}
                  </p>
                </>
              ) : (
                <>
                  <p className="gr-rc-head">Sent to {handle} ♡</p>
                  <p className="gr-rc-sub fine">For {formatNo(sticker.no)}</p>
                </>
              )}
            </div>
          </div>
          <div className="gr-rc-actions">
            <LabelButton block icon={<StickerBoardIcon />} onClick={onClose}>
              Back to your board
            </LabelButton>
          </div>
        </section>
      )}
      {failure && (
        <p className="gr-failure" role="alert">
          The mini-game stopped: {failure}
        </p>
      )}
    </div>
  );
  // Over the whole phone, tabs included, as the sticker detail is.
  const phone = document.querySelector<HTMLElement>(".phone");
  return phone ? createPortal(screen, phone) : screen;
}
```

- [ ] **Step 4: Run the tests.** Expected: PASS. If the engine can't run in happy-dom, fix the engine or the module at fault; don't weaken the tests.
- [ ] **Step 5: Checks, then commit** `feat: add the Send gratitude screen`.

### Task A10: The hidden test menu

**Files:** Create `apps/frontend/src/ui/useLongPress.ts`, `…/ui/useLongPress.test.tsx`, `apps/frontend/src/sticker-board/testMenuSettings.ts`, `…/TestMenuSheet.tsx`, `…/test-menu-sheet.css`. Modify `…/sticker-board/StickerBoard.tsx`.

- [ ] **Step 1: Write the failing tests** `ui/useLongPress.test.tsx`:

```tsx
// @vitest-environment happy-dom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useLongPress } from "./useLongPress";

declare global {
  var IS_REACT_ACT_ENVIRONMENT: boolean;
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;

const onLongPress = vi.fn();
const onClick = vi.fn();

function Chip() {
  return (
    <button {...useLongPress(onLongPress)} onClick={onClick}>
      Alice
    </button>
  );
}

let host: HTMLDivElement;
let root: Root;
const chip = () => {
  const el = host.querySelector("button");
  if (!el) throw new Error("The chip didn't render");
  return el;
};
const pointer = (type: string, x = 10, y = 10) =>
  act(() => {
    chip().dispatchEvent(
      new PointerEvent(type, { bubbles: true, button: 0, clientX: x, clientY: y }),
    );
  });
const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });
const click = () => act(() => chip().click());

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  act(() => root.render(<Chip />));
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useLongPress", () => {
  it("runs after a half-second hold, and the release doesn't click", () => {
    pointer("pointerdown");
    wait(500);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    pointer("pointerup");
    click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it("lets a quick tap click without running", () => {
    pointer("pointerdown");
    wait(200);
    pointer("pointerup");
    click();
    wait(500);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("doesn't run for a finger that drags", () => {
    pointer("pointerdown");
    pointer("pointermove", 40, 10);
    wait(600);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("runs at once on a right-click", () => {
    act(() => {
      chip().dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, cancelable: true }));
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
  });

  it("lets the next tap click after a hold that never released on the chip", () => {
    pointer("pointerdown");
    wait(500);
    pointer("pointerleave");
    pointer("pointerdown");
    pointer("pointerup");
    click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Write `ui/useLongPress.ts`:**

```ts
import { useEffect, useLayoutEffect, useRef, type MouseEvent, type PointerEvent } from "react";

/** A finger that moves this far is dragging, not holding. */
const MOVE_SLOP_PX = 10;

/**
 * Press and hold: after `delayMs` held still, `onLongPress` runs and the click the release would make
 * is swallowed. A right-click runs it at once. Spread the result onto the element.
 */
export function useLongPress(onLongPress: () => void, delayMs = 500) {
  const latest = useRef(onLongPress);
  useLayoutEffect(() => {
    latest.current = onLongPress;
  });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const start = useRef<{ x: number; y: number } | null>(null);
  /** The hold ran, so the release's click must not. */
  const held = useRef(false);

  const cancel = () => {
    clearTimeout(timer.current);
    timer.current = undefined;
    start.current = null;
  };
  useEffect(() => () => clearTimeout(timer.current), []);

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.button !== 0) return;
      held.current = false;
      start.current = { x: e.clientX, y: e.clientY };
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = undefined;
        start.current = null;
        held.current = true;
        latest.current();
      }, delayMs);
    },
    onPointerMove: (e: PointerEvent) => {
      const from = start.current;
      if (from && Math.hypot(e.clientX - from.x, e.clientY - from.y) > MOVE_SLOP_PX) cancel();
    },
    onPointerUp: cancel,
    onPointerCancel: cancel,
    onPointerLeave: cancel,
    onClickCapture: (e: MouseEvent) => {
      if (!held.current) return;
      held.current = false;
      e.preventDefault();
      e.stopPropagation();
    },
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault();
      // A long press can also raise contextmenu; the hold has already run for it.
      if (held.current) return;
      cancel();
      latest.current();
    },
  };
}
```

- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Write `sticker-board/testMenuSettings.ts`, `TestMenuSheet.tsx` and `test-menu-sheet.css`:**

```ts
/** The hidden test menu's switches, kept on this device. */
export interface TestMenuSettings {
  /** The mini-game's intensity dial at full, the design's setting for the presentation. */
  fullEffects: boolean;
  /** A readout of frame times on the mini-game, for measuring on a phone. */
  showFrameTimes: boolean;
}

const KEY = "draw.testMenu";
const OFF: TestMenuSettings = { fullEffects: false, showFrameTimes: false };

export function readTestMenuSettings(): TestMenuSettings {
  let stored: string | null;
  try {
    stored = localStorage.getItem(KEY);
  } catch (error) {
    console.error("The test menu's settings couldn't be read", error);
    return OFF;
  }
  if (stored === null) return OFF;
  let value: unknown;
  try {
    value = JSON.parse(stored);
  } catch (error) {
    console.error(`The test menu's settings aren't JSON: ${stored}`, error);
    return OFF;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "fullEffects" in value &&
    typeof value.fullEffects === "boolean" &&
    "showFrameTimes" in value &&
    typeof value.showFrameTimes === "boolean"
  )
    return { fullEffects: value.fullEffects, showFrameTimes: value.showFrameTimes };
  console.error(`Skipped unreadable test menu settings: ${stored}`);
  return OFF;
}

export function saveTestMenuSettings(settings: TestMenuSettings): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(settings));
  } catch (error) {
    console.error("The test menu's settings couldn't be saved", error);
  }
}
```

```tsx
import { Heart } from "@phosphor-icons/react";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { LabelButton } from "../ui/LabelButton";
import { Sheet } from "../ui/Sheet";
import type { TestMenuSettings } from "./testMenuSettings";
import "./test-menu-sheet.css";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Opens the gratitude mini-game for the newest sticker; null while the board has none. */
  onTryMiniGame: (() => void) | null;
  settings: TestMenuSettings;
  onSettingsChange: (settings: TestMenuSettings) => void;
}

/** Test tools, in a sheet opened by holding your name on the board. */
export function TestMenuSheet({ open, onClose, onTryMiniGame, settings, onSettingsChange }: Props) {
  const body = useRef<HTMLDivElement>(null);

  // Focus moves into the sheet as it opens, and back to where it was when it closes.
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    body.current?.focus();
    return () => previous?.focus();
  }, [open]);

  const sheet = (
    <>
      {open && <div className="test-menu__scrim" onClick={onClose} />}
      <Sheet label="Tests" open={open} onClose={onClose}>
        <div className="test-menu" ref={body} tabIndex={-1}>
          <h2 className="test-menu__title">Tests</h2>
          <LabelButton
            block
            icon={<Heart />}
            disabled={!onTryMiniGame}
            onClick={onTryMiniGame ?? undefined}
          >
            Try the gratitude mini-game
          </LabelButton>
          {!onTryMiniGame && <p className="fine test-menu__note">Draw a sticker first</p>}
          <label className="test-menu__switch">
            <input
              type="checkbox"
              role="switch"
              checked={settings.fullEffects}
              onChange={(e) => onSettingsChange({ ...settings, fullEffects: e.target.checked })}
            />
            Full effects
          </label>
          <label className="test-menu__switch">
            <input
              type="checkbox"
              role="switch"
              checked={settings.showFrameTimes}
              onChange={(e) => onSettingsChange({ ...settings, showFrameTimes: e.target.checked })}
            />
            Show frame times
          </label>
        </div>
      </Sheet>
    </>
  );
  // Over the whole phone, as the sticker detail is: the board's own layers stack above its sheets.
  const phone = document.querySelector<HTMLElement>(".phone");
  return phone ? createPortal(sheet, phone) : sheet;
}
```

```css
/* ---------- The hidden test menu, in a sheet over the board ---------- */

.test-menu__scrim {
  position: absolute;
  inset: 0;
  z-index: var(--z-sheet);
  background: rgba(28, 24, 36, 0.36);
  animation: test-menu-fade var(--t-peel) var(--ease-out);
}

@keyframes test-menu-fade {
  from {
    opacity: 0;
  }
}

.test-menu {
  display: grid;
  gap: 12px;
}

/* Focused only so a screen reader starts reading here as the sheet opens. */
.test-menu:focus {
  outline: none;
}

.test-menu__title {
  margin: 0;
  font: 800 18px/1.1 var(--font-ui);
  font-stretch: var(--w-title);
  letter-spacing: -0.01em;
}

.test-menu__note {
  margin: -4px 0 0;
}

.test-menu__switch {
  display: flex;
  align-items: center;
  gap: 10px;
  min-height: 44px;
  font: 600 15px/1.2 var(--font-ui);
}

.test-menu__switch input {
  width: 20px;
  height: 20px;
  margin: 0;
  accent-color: var(--ink);
}
```

- [ ] **Step 6: Open it from the board** in `sticker-board/StickerBoard.tsx`:
  - Imports:
    ```ts
    import { FEEL_CONFIG } from "../gratitude/gameConfig";
    import { GratitudeMiniGame } from "../gratitude/GratitudeMiniGame";
    import { useLongPress } from "../ui/useLongPress";
    import { readTestMenuSettings, saveTestMenuSettings } from "./testMenuSettings";
    import { TestMenuSheet } from "./TestMenuSheet";
    ```
  - After `const [turned, setTurned] = useState(false);`:
    ```ts
    const [testMenuOpen, setTestMenuOpen] = useState(false);
    const [testSettings, setTestSettings] = useState(readTestMenuSettings);
    /** The sticker the gratitude mini-game is open for, from the test menu. */
    const [thanking, setThanking] = useState<BoardSticker | null>(null);
    const holdName = useLongPress(() => setTestMenuOpen(true));
    ```
  - After `const onBoard = …;`:
    ```ts
    const newest = onBoard.reduce<BoardSticker | null>(
      (latest, s) => (!latest || s.createdAt > latest.createdAt ? s : latest),
      null,
    );
    ```
  - The name button (`className="board-who"`) gains `{...holdName}` before its `onClick`.
  - After the `{giving && giftSender && (…)}` block:
    ```tsx
    <TestMenuSheet
      open={testMenuOpen}
      onClose={() => setTestMenuOpen(false)}
      onTryMiniGame={
        newest
          ? () => {
              setTestMenuOpen(false);
              setThanking(newest);
            }
          : null
      }
      settings={testSettings}
      onSettingsChange={(next) => {
        setTestSettings(next);
        saveTestMenuSettings(next);
      }}
    />;
    {
      thanking && (
        <GratitudeMiniGame
          sticker={thanking}
          giver={{ handle: me.handle, displayName: me.displayName, pictureUrl: me.pictureUrl }}
          intensity={
            testSettings.fullEffects ? FEEL_CONFIG.intensity.full : FEEL_CONFIG.intensity.everyday
          }
          showFrameTimes={testSettings.showFrameTimes}
          onClose={() => setThanking(null)}
        />
      );
    }
    ```
- [ ] **Step 7: Try it in the dev server** (`pnpm --filter frontend dev`; LIFF Mock stands in for LINE):
  - Hold the name chip for half a second: the Tests sheet opens, and the board doesn't turn over. A tap still turns it over.
  - "Try the gratitude mini-game" opens the screen for the newest sticker. With no stickers it's disabled, with its note.
  - One tap sends. Tapping on catches and runs the combo up the tiers.
- [ ] **Step 8: Checks, then commit** `feat: open the gratitude mini-game from a hidden test menu`.

### Task A11: Verify the tap demo

- [ ] **Step 1:** `pnpm check:full` passes, and knip reports nothing new under `gratitude/`.
- [ ] **Step 2: Looks.**
  - Screenshots at 390×844 in the dev server, each beside its reference state: `front-calm`, `front-sent`, `flip-arigato`, `flip-tere`, `front-receipt`, `flip-dokidoki`, `flip-overheat`, `flip-high-mult`, `flip-low-timer`, `flip-shoten`, `flip-receipt`.
  - Reach each in the app by scripted taps: dispatch pointer events on the heart's centre from the page at a steady rate. With Full effects on, match the reference's heat.
  - List every difference. Fix what's in scope; report the rest.
- [ ] **Step 3: Reduced motion** (emulated): no screen shake, sprays or sweat; rising hearts fade up in place; the heart fades instead of flying; the numbers are unchanged.
- [ ] **Step 4: Speed.**
  - In Chromium with the CPU slowed 4× (CDP `Emulation.setCPUThrottlingRate`) and Full effects on, script a two-thumb mash: alternating points on the heart, 13 a second, until the combo ends at 昇天.
  - Record every frame's time with a requestAnimationFrame loop in the page. Report the frames over 34ms and the worst frame, with the script that measured them.
  - Check the loop sleeps once the receipt is up and the pile has gone: no requestAnimationFrame callbacks in a 2-second trace.
- [ ] **Step 5:** Add `src/gratitude` to AGENTS.MD's architecture list: "the Gratitude mini-game: its rules (`combo.ts`), the drawing engine and the Send gratitude screen".
- [ ] **Step 6: Report:** commits, screenshots, remaining differences, performance numbers with their command, decisions taken, and questions.
- [ ] **Step 7: Owner check on an iPhone inside LINE, with Show frame times on:**
  - taps feel immediate, and two thumbs both count
  - nothing scrolls, zooms or selects
  - the frame times at 昇天

---

## Phase B: stroke, shake and the motion ask

### Task B1: The detectors

**Files:** Create `G/strokeDetector.ts`, `G/shakeDetector.ts`, `G/detectors.test.ts`. Modify `G/gameConfig.ts`.

- [ ] **Step 1: Write the failing tests** `G/detectors.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { createShakeDetector, type ShakeRules } from "./shakeDetector";
import { createStrokeDetector, type StrokePass, type StrokeRules } from "./strokeDetector";

const STROKE: StrokeRules = { minRunPx: 40, fastPxPerMs: 0.38, turnPx: 12, pauseMs: 900 };
const SHAKE: ShakeRules = { deadZone: 6, minPeak: 11, minGapMs: 60, maxGapMs: 480, resetMs: 650 };

/** A thumb stroking up and down `runs` times over `span` px, `msPerRun` each, sampled every 8 ms. */
function stroke(runs: number, { span = 120, msPerRun = 125, from = 0 } = {}) {
  const detector = createStrokeDetector(STROKE);
  const passes: StrokePass[] = [];
  detector.fingerDown(200, 300, from);
  for (let t = 0; t <= runs * msPerRun + 60; t += 8) {
    const phase = Math.min(t / msPerRun, runs + 0.5);
    const y = 300 - span * (phase % 2 < 1 ? phase % 1 : 1 - (phase % 1));
    const pass = detector.fingerMove(200, y, from + t);
    if (pass) passes.push(pass);
  }
  return { detector, passes };
}

describe("createStrokeDetector", () => {
  it("unlocks after five fast passes, and not after four", () => {
    expect(stroke(5).detector.fastStreak).toBe(5);
    expect(stroke(4).detector.fastStreak).toBe(4);
  });

  it("counts strokes in any direction", () => {
    const detector = createStrokeDetector(STROKE);
    detector.fingerDown(100, 100, 0);
    let last: StrokePass | null = null;
    for (let t = 0; t <= 5 * 125 + 60; t += 8) {
      const phase = Math.min(t / 125, 5.5);
      const k = phase % 2 < 1 ? phase % 1 : 1 - (phase % 1);
      last = detector.fingerMove(100 + 90 * k, 100 + 90 * k, t) ?? last;
    }
    expect(last?.fastStreak).toBe(5);
  });

  it("breaks the streak on a slow pass", () => {
    const { passes } = stroke(4, { msPerRun: 500 });
    expect(passes.every((p) => !p.fast && p.fastStreak === 0)).toBe(true);
  });

  it("breaks the streak on a pause", () => {
    const detector = createStrokeDetector(STROKE);
    detector.fingerDown(200, 300, 0);
    for (let t = 0; t <= 3 * 125 + 60; t += 8) {
      const phase = Math.min(t / 125, 3.5);
      detector.fingerMove(200, 300 - 120 * (phase % 2 < 1 ? phase % 1 : 1 - (phase % 1)), t);
    }
    expect(detector.fastStreak).toBe(3);
    detector.fingerMove(200, 300, 2000);
    expect(detector.fastStreak).toBe(0);
  });
});

/** Samples of a sideways shake at `hz` and `peak` m/s², every 16 ms for `ms`. */
function shake(hz: number, peak: number, ms: number) {
  const detector = createShakeDetector(SHAKE);
  let top = 0;
  for (let t = 0; t <= ms; t += 16) {
    const reversal = detector.addMotionSample(peak * Math.sin((t / 1000) * 2 * Math.PI * hz), 0, t);
    if (reversal) top = Math.max(top, reversal.run);
  }
  return top;
}

describe("createShakeDetector", () => {
  it("counts a hard rhythmic shake past sixteen reversals", () => {
    expect(shake(4.4, 17, 4000)).toBeGreaterThanOrEqual(16);
  });

  it("ignores a slow sway and a soft wobble", () => {
    expect(shake(0.8, 17, 4000)).toBe(0);
    expect(shake(4.4, 8, 4000)).toBe(0);
  });

  it("ignores a single jolt", () => {
    const detector = createShakeDetector(SHAKE);
    const samples = [0, 20, -18, 0, 0, 0].map((a, i) => detector.addMotionSample(a, 0, i * 16));
    expect(samples.filter((r) => r && r.run > 1)).toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Write the detectors** (PJ 530–598, typed; unlike PJ, a slow pass breaks the streak, as SPEC's tests ask):

```ts
/** A run along the thumb's path, ended by the thumb doubling back. */
export interface StrokePass {
  /** px along the run. */
  length: number;
  /** px/ms over the run. */
  speed: number;
  fast: boolean;
  /** The run, end to end, and where the thumb turned. */
  dx: number;
  dy: number;
  end: { x: number; y: number };
  /** Fast passes in a row, this one included. */
  fastStreak: number;
}

export interface StrokeRules {
  /** A run shorter than this isn't a pass. */
  minRunPx: number;
  /** A pass at least this fast counts toward the streak. */
  fastPxPerMs: number;
  /** Doubling back this far ends a run. */
  turnPx: number;
  /** A pause this long breaks the streak. */
  pauseMs: number;
}

export interface StrokeDetector {
  fingerDown: (x: number, y: number, t: number) => void;
  /** A pass when the thumb has just doubled back after a long enough run. */
  fingerMove: (x: number, y: number, t: number) => StrokePass | null;
  fingerUp: () => void;
  readonly fastStreak: number;
}

/**
 * Passes of a thumb stroking back and forth, anywhere on the screen. A run is measured along its own
 * direction, so up and down, sideways and diagonal strokes count alike. A slow pass or a pause
 * breaks the streak of fast ones.
 */
export function createStrokeDetector(rules: StrokeRules): StrokeDetector {
  let down = false;
  let streak = 0;
  let lastPassAt = -Infinity;
  /** Where the current run began, and when. */
  let from: { x: number; y: number; t: number } | null = null;
  /** The run's furthest point so far, its distance along the run, and its direction. */
  let far: { x: number; y: number; t: number; d: number; ux: number; uy: number } | null = null;

  return {
    get fastStreak() {
      return streak;
    },
    fingerDown(x, y, t) {
      down = true;
      from = { x, y, t };
      far = null;
    },
    fingerMove(x, y, t) {
      if (!down || !from) return null;
      if (t - lastPassAt > rules.pauseMs) streak = 0;
      const sx = x - from.x;
      const sy = y - from.y;
      if (!far) {
        const d = Math.hypot(sx, sy);
        if (d > 10) far = { x, y, t, d, ux: sx / d, uy: sy / d };
        return null;
      }
      const along = sx * far.ux + sy * far.uy;
      if (along >= far.d) {
        // Still going, and the run follows the thumb round a curve.
        const d = Math.hypot(sx, sy);
        far = { x, y, t, d, ux: d ? sx / d : far.ux, uy: d ? sy / d : far.uy };
        return null;
      }
      if (far.d - along <= rules.turnPx) return null;
      const length = far.d;
      const speed = length / Math.max(1, far.t - from.t);
      const pass = { dx: far.x - from.x, dy: far.y - from.y, end: { x: far.x, y: far.y } };
      // The next run starts where this one turned.
      from = { x: far.x, y: far.y, t: far.t };
      const nx = x - from.x;
      const ny = y - from.y;
      const nd = Math.hypot(nx, ny) || 1;
      far = { x, y, t, d: Math.hypot(nx, ny), ux: nx / nd, uy: ny / nd };
      if (length < rules.minRunPx) return null;
      const fast = speed >= rules.fastPxPerMs;
      streak = fast ? streak + 1 : 0;
      if (fast) lastPassAt = t;
      return { length, speed, fast, ...pass, fastStreak: streak };
    },
    fingerUp() {
      down = false;
      from = null;
      far = null;
    },
  };
}
```

```ts
/** One reversal of a rhythmic shake. */
export interface ShakeReversal {
  /** Rhythmic reversals in a row, this one included. */
  run: number;
  /** The way the phone moved, along its dominant axis. */
  direction: { x: number; y: number };
  /** The peak acceleration since the last reversal, in m/s². */
  strength: number;
}

export interface ShakeRules {
  /** Below this the hand's tremor is ignored, in m/s². */
  deadZone: number;
  /** A reversal counts only after a peak this hard. */
  minPeak: number;
  /** Reversals this far apart, in ms, are a rhythm. */
  minGapMs: number;
  maxGapMs: number;
  /** Calm this long breaks the run. */
  resetMs: number;
}

export interface ShakeDetector {
  /** One sample, gravity taken out, in m/s². */
  addMotionSample: (ax: number, ay: number, t: number) => ShakeReversal | null;
}

/** Rhythmic shaking: alternating peaks at a shaking pace, so one jolt from a train never counts. */
export function createShakeDetector(rules: ShakeRules): ShakeDetector {
  let sign = 0;
  let peak = 0;
  let lastFlip = -Infinity;
  let run = 0;
  return {
    addMotionSample(ax, ay, t) {
      const sideways = Math.abs(ax) >= Math.abs(ay);
      const a = sideways ? ax : ay;
      const size = Math.abs(a);
      peak = Math.max(peak, size);
      if (t - lastFlip > rules.resetMs) run = 0;
      const s = Math.sign(a);
      if (size <= rules.deadZone || s === 0 || s === sign) return null;
      const gap = t - lastFlip;
      const strength = peak;
      sign = s;
      lastFlip = t;
      peak = 0;
      if (strength < rules.minPeak || gap <= rules.minGapMs || gap >= rules.maxGapMs) return null;
      run++;
      return { run, direction: sideways ? { x: s, y: 0 } : { x: 0, y: s }, strength };
    },
  };
}
```

- [ ] **Step 4: Add their numbers to `FEEL_CONFIG`** in `G/gameConfig.ts`, after `tapHoldMs`:

```ts
  /** A thumb stroking back and forth, anywhere on the screen: PJ's PHYS and StrokeDetector. */
  stroke: {
    minRunPx: 40,
    fastPxPerMs: 0.38,
    turnPx: 12,
    pauseMs: 900,
    unlockPasses: 5,
    /** A drag on the heart this long is a try at stroking it; after three, the tip says how. */
    tryTravelPx: 40,
    triesForTip: 3,
  },
  /** Shaking the phone in a rhythm: PJ's PHYS and ShakeDetector. */
  shake: {
    deadZone: 6,
    minPeak: 11,
    minGapMs: 60,
    maxGapMs: 480,
    resetMs: 650,
    keepShakingAt: 4,
    cornerAt: 11,
    unlockAt: 16,
  },
```

- [ ] **Step 5: Run the tests.** Expected: PASS. Then run checks and commit `feat: detect stroking and shaking for the gratitude mini-game`.

### Task B2: The combo takes strokes and shakes

**Files:** Modify `G/gameConfig.ts`, `G/combo.ts`, `G/combo.test.ts`.

- [ ] **Step 1: Append the failing tests** to `G/combo.test.ts`:

```ts
/** Unlocks `method` at t = 0, then feeds it `rate` times a second until the combo ends. */
function playMethod(method: "stroke" | "shake", rate: number) {
  const combo = createGratitudeCombo();
  const count = method === "stroke" ? combo.countStrokePass : combo.countShakeReversal;
  const events = combo.commitTo(method, 0);
  let next = 1000 / rate;
  for (let t = 0; t < 20_000; t += 16) {
    for (; next <= t; next += 1000 / rate) events.push(...count(next));
    events.push(...combo.advanceTo(t));
    const end = endOf(events);
    if (end) return { record: end.record, events };
  }
  throw new Error(`A ${method} combo at ${rate} a second never ended`);
}

describe("strokes and shakes", () => {
  it("starts the bar at once when stroke unlocks before any tap", () => {
    const combo = createGratitudeCombo();
    expect(combo.commitTo("stroke", 0).map((e) => e.kind)).toEqual(["caught", "hit", "tier"]);
    expect(combo.view).toMatchObject({ phase: "running", method: "stroke", barFill: 1 });
  });

  it("brings 照れ on the 5th stroke or shake", () => {
    for (const method of ["stroke", "shake"] as const) {
      for (const rate of [5, 8]) {
        let hits = 0;
        for (const e of playMethod(method, rate).events) {
          if (e.kind === "hit") hits++;
          if (e.kind === "tier" && e.tier === 1) expect(hits, `${method} at ${rate}`).toBe(5);
        }
      }
    }
  });

  it("ignores taps once committed to stroke, and strokes before it", () => {
    const combo = createGratitudeCombo();
    expect(combo.countStrokePass(0)).toEqual([]);
    combo.tapHeart(0);
    combo.tapHeart(200);
    combo.commitTo("stroke", 400);
    expect(combo.tapHeart(500)).toEqual([]);
    expect(combo.view.hits).toBe(3);
  });

  it("counts no more passes a second than the stroke limit allows", () => {
    const { record } = playMethod("stroke", 40);
    for (const start of record.hitTimes) {
      const inOneSecond = record.hitTimes.filter((t) => t >= start && t < start + 1000).length;
      expect(inOneSecond).toBeLessThanOrEqual(GAME_CONFIG.passesPerSecond + GAME_CONFIG.burst);
    }
  });

  it("replays combos that started in stroke or shake, or switched to one from taps", () => {
    const combo = createGratitudeCombo();
    const events = [0, 180, 360, 540].flatMap((t) => combo.tapHeart(t));
    events.push(...combo.commitTo("stroke", 700));
    for (let t = 820; !endOf(events) && t < 20_000; t += 125) {
      events.push(...combo.countStrokePass(t), ...combo.advanceTo(t));
    }
    const switched = endOf(events)?.record;
    expect(switched).toMatchObject({ method: "stroke", switchedAtHit: 4 });
    if (!switched) throw new Error("The combo never ended");
    const records = [switched, playMethod("stroke", 8).record, playMethod("shake", 8).record];
    for (const record of records) {
      const label = `${record.method} from hit ${record.switchedAtHit}`;
      expect(replayGratitudeCombo(record), label).toEqual(record);
    }
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Extend `GameConfig`.** In the interface, replace the `tapsPerSecond` and `burst` lines and their comment with:

```ts
/** Hits a second that count for each method, beyond a burst of `burst`. */
tapsPerSecond: number;
passesPerSecond: number;
reversalsPerSecond: number;
burst: number;
/** A stroke pass or a shake reversal counts as this many hits, except as a combo's first hit. */
methodWeight: number;
```

and in `GAME_CONFIG`, after `tapsPerSecond: 16,`, add `passesPerSecond: 10,` and `reversalsPerSecond: 14,`, and after `burst: 4,` add `methodWeight: 1.5,`. The version stays: tap combos replay the same.

- [ ] **Step 4: Replace `G/combo.ts`** with:

```ts
import { GAME_CONFIG, type GameConfig } from "./gameConfig";

export type Method = "tap" | "stroke" | "shake";
/** 0–4: ありがと, 照れ, ドキドキ, オーバーヒート, 昇天. */
export type Tier = 0 | 1 | 2 | 3 | 4;
export type ComboPhase = "ready" | "sending" | "running" | "ended";

/** A finished combo, as the draft schema's `gratitude` table records it. */
export interface ComboRecord {
  /** The method the combo ended in. */
  method: Method;
  /** Where in hitTimes the combo committed to stroke or shake: 0 if it started there, null for taps only. */
  switchedAtHit: number | null;
  hits: number;
  /** Milliseconds after the first hit, one per hit. */
  hitTimes: number[];
  /** From the first hit to the end. */
  durationMs: number;
  /** Gratitude, multiplier included. */
  total: number;
  peakMult: number;
  peakTier: Tier;
  gameConfigVersion: string;
}

export type ComboEvent =
  /** `secondsAdded`: how much the hit raised the seconds left; 0 when the bar isn't running yet. */
  | { kind: "hit"; gratitude: number; secondsAdded: number }
  /** A touch past the rate limit: it animates but adds nothing. */
  | { kind: "limited" }
  | { kind: "caught" }
  | { kind: "tier"; tier: Tier }
  /** `caught`: false for a one-tap send, or an end before the catch. */
  | { kind: "ended"; record: ComboRecord; caught: boolean };

/** The combo as of the latest call, for drawing. */
export interface ComboView {
  phase: ComboPhase;
  /** Tap until the combo commits to stroke or shake. */
  method: Method;
  hits: number;
  total: number;
  multiplier: number;
  /** Null until the catch: ありがと's face and slam wait for it. */
  tier: Tier | null;
  /** Seconds left if the hits stopped now; 0 unless the combo is running. */
  secondsLeft: number;
  /** secondsLeft over the seconds a full bar lasts at the catch, 0–1. */
  barFill: number;
  /** A tier-up has frozen the combo clock. */
  frozen: boolean;
}

export interface GratitudeCombo {
  readonly view: ComboView;
  /** A touch-down on the heart at `t` ms; for the first tap, its release. Ignored once committed to stroke or shake. */
  tapHeart: (t: number) => ComboEvent[];
  /** The detector unlocked stroke or shake at `t`: the combo commits to it, starting or catching it first if need be, and that pass or reversal is a hit. */
  commitTo: (method: "stroke" | "shake", t: number) => ComboEvent[];
  /** A fast pass, once committed to stroke. */
  countStrokePass: (t: number) => ComboEvent[];
  /** A rhythmic reversal, once committed to shake. */
  countShakeReversal: (t: number) => ComboEvent[];
  /** Brings the rules to `t` ms: the catch window closing, hits leaving the cadence window, the bar emptying, the safety stop. */
  advanceTo: (t: number) => ComboEvent[];
  /** Ends it at `t` ms, because the page went hidden or the screen closed. Before the first tap it ends without a record. */
  endCombo: (t: number) => ComboEvent[];
}

function tierFor(total: number, starts: GameConfig["tierStarts"]): Tier {
  if (total >= starts[3]) return 4;
  if (total >= starts[2]) return 3;
  if (total >= starts[1]) return 2;
  if (total >= starts[0]) return 1;
  return 0;
}

type Pending = { t: number; kind: "sendEnd" | "cadence" | "empty" | "cap" };

/** The bar's drain in closed form, one curve for the rules and the HUD's scale so they agree exactly. */
function barDrain(config: GameConfig) {
  const T = config.drainDoublingS;
  /** Bars drained between combo seconds a and b: K × (2^(b/T) − 2^(a/T)). */
  const K = (config.drainStart * T) / Math.LN2;
  const grow = (comboS: number) => 2 ** (comboS / T);
  /** Seconds a bar lasts from combo second `comboS` with no more hits. */
  const lasts = (bar: number, comboS: number) => T * Math.log2(bar / K + grow(comboS)) - comboS;
  return { K, grow, lasts };
}

/** Seconds a full bar lasts from the catch with no more hits: the HUD's scale. */
export function fullBarSeconds(config: GameConfig = GAME_CONFIG): number {
  return barDrain(config).lasts(1, 0);
}

/**
 * The gratitude combo's rules, with no DOM and no clock of their own: every call is passed the time.
 * State changes only at events (hits, a hit leaving the cadence window, the ends) and is computed in
 * closed form between them, so a replay of the same hits gives the same record however the frames
 * fell. Times are held in whole milliseconds after the first hit.
 */
export function createGratitudeCombo(config: GameConfig = GAME_CONFIG): GratitudeCombo {
  const M = config.multiplier;
  const { K, grow, lasts } = barDrain(config);
  const fullBar = lasts(1, 0);
  const perSecond: Record<Method, number> = {
    tap: config.tapsPerSecond,
    stroke: config.passesPerSecond,
    shake: config.reversalsPerSecond,
  };

  let phase: ComboPhase = "ready";
  let method: Method = "tap";
  let switchedAtHit: number | null = null;
  /** The caller's time of the first hit. */
  let origin = 0;
  // The state as of the latest event, at `at` ms after the first hit.
  let at = 0;
  let bar = 0;
  /** Time since the catch, less tier-up freezes. */
  let comboMs = 0;
  let mult = 1;
  let frozenUntil = 0;
  /** A token bucket per method, in thousandths of a hit, so refills stay whole numbers. */
  const tokens: Record<Method, { milli: number; at: number }> = {
    tap: { milli: config.burst * 1000, at: 0 },
    stroke: { milli: config.burst * 1000, at: 0 },
    shake: { milli: config.burst * 1000, at: 0 },
  };
  let total = 0;
  let peakMult = 1;
  let shownTier: Tier | null = null;
  /** The latest time the combo was brought to. */
  let latest = 0;
  const hitTimes: number[] = [];
  /** Hits still in the cadence window, oldest first, with their weights. */
  const cadence: { t: number; weight: number }[] = [];

  const target = () => {
    const hits = cadence.reduce((sum, h) => sum + h.weight, 0);
    return Math.min(M.max, 1 + M.perHit * Math.max(0, hits - M.freeHits));
  };

  /** The state at `x` ≥ `at`, with no event between. */
  function stateAt(x: number) {
    const elapsed = Math.max(0, x - Math.max(at, frozenUntil));
    if (phase !== "running" || elapsed === 0) return { bar, comboMs, mult };
    const goal = target();
    const rate = goal > mult ? M.rise : M.fall;
    return {
      bar: bar - K * (grow((comboMs + elapsed) / 1000) - grow(comboMs / 1000)),
      comboMs: comboMs + elapsed,
      mult: goal + (mult - goal) * Math.exp((-rate * elapsed) / 1000),
    };
  }

  function settleAt(x: number) {
    ({ bar, comboMs, mult } = stateAt(x));
    at = x;
    peakMult = Math.max(peakMult, mult);
  }

  function nextPending(): Pending | null {
    if (phase === "sending") return { t: config.catchWindowMs, kind: "sendEnd" };
    if (phase !== "running") return null;
    let next: Pending = { t: config.maxDurationMs, kind: "cap" };
    const leaves = cadence.length > 0 ? cadence[0].t + M.windowMs : Infinity;
    if (leaves < next.t) next = { t: leaves, kind: "cadence" };
    const empties = Math.max(at, frozenUntil) + lasts(bar, comboMs / 1000) * 1000;
    if (empties < next.t) next = { t: empties, kind: "empty" };
    return next;
  }

  function finish(end: number, caught: boolean, events: ComboEvent[]) {
    settleAt(end);
    phase = "ended";
    latest = end;
    events.push({
      kind: "ended",
      caught,
      record: {
        method,
        switchedAtHit,
        hits: hitTimes.length,
        hitTimes: [...hitTimes],
        durationMs: Math.round(end),
        total,
        peakMult: Math.round(peakMult * 100) / 100,
        peakTier: tierFor(total, config.tierStarts),
        gameConfigVersion: config.version,
      },
    });
  }

  /** Runs every event due by `x`; true if one of them ended the combo. */
  function advance(x: number, events: ComboEvent[]): boolean {
    for (let next = nextPending(); next && next.t <= x; next = nextPending()) {
      if (next.kind !== "cadence") {
        finish(next.t, next.kind !== "sendEnd", events);
        return true;
      }
      settleAt(next.t);
      cadence.shift();
    }
    latest = Math.max(latest, x);
    return false;
  }

  /**
   * One hit by `by` at caller time `t`. Before any hit, a tap sends and waits to be caught; a stroke
   * or shake unlock starts the bar at once. A combo's first hit weighs 1, like a tap.
   */
  function hit(by: Method, t: number): ComboEvent[] {
    const events: ComboEvent[] = [];
    if (phase === "ended") return events;
    if (phase === "ready") origin = t;
    // Whole milliseconds, never before an event already run, so a replay meets the same order.
    const x = Math.max(Math.round(t - origin), at);
    if (advance(x, events)) return events;

    const bucket = tokens[by];
    bucket.milli = Math.min(config.burst * 1000, bucket.milli + (x - bucket.at) * perSecond[by]);
    bucket.at = x;
    if (bucket.milli < 1000) {
      events.push({ kind: "limited" });
      return events;
    }
    bucket.milli -= 1000;

    settleAt(x);
    const weight = by === "tap" || hitTimes.length === 0 ? 1 : config.methodWeight;
    const before = phase === "running" ? lasts(bar, comboMs / 1000) : 0;
    hitTimes.push(x);
    cadence.push({ t: x, weight });
    if (phase === "ready" && by === "tap") phase = "sending";
    else if (phase === "ready" || phase === "sending") {
      phase = "running";
      bar = 1;
      comboMs = 0;
      events.push({ kind: "caught" });
    } else {
      const n = hitTimes.length;
      const gain = config.gainFloor + config.gainAboveFloor * config.gainDecay ** (n - 3);
      bar = Math.min(1, bar + weight * gain);
    }

    const goal = target();
    if (goal > mult) mult += (goal - mult) * M.hitNudge;
    peakMult = Math.max(peakMult, mult);
    const gratitude = Math.round(config.gratitudePerHit * mult * weight);
    total += gratitude;
    const secondsAdded = before > 0 ? Math.max(0, lasts(bar, comboMs / 1000) - before) : 0;
    events.push({ kind: "hit", gratitude, secondsAdded });

    if (phase === "running") {
      const tier = tierFor(total, config.tierStarts);
      if (shownTier === null || tier > shownTier) {
        shownTier = tier;
        frozenUntil = Math.max(frozenUntil, x + config.tierUpFreezeMs);
        events.push({ kind: "tier", tier });
      }
    }
    latest = Math.max(latest, x);
    return events;
  }

  return {
    get view(): ComboView {
      const now = stateAt(Math.max(latest, at));
      const secondsLeft = phase === "running" ? Math.max(0, lasts(now.bar, now.comboMs / 1000)) : 0;
      return {
        phase,
        method,
        hits: hitTimes.length,
        total,
        multiplier: now.mult,
        tier: shownTier,
        secondsLeft,
        barFill: Math.min(1, secondsLeft / fullBar),
        // An ended combo's clock never moves again, so a freeze it ended inside would never lift.
        frozen: phase !== "ended" && latest < frozenUntil,
      };
    },

    tapHeart: (t) => (method === "tap" ? hit("tap", t) : []),

    commitTo(by, t) {
      if (method !== "tap") return [];
      const index = hitTimes.length;
      const events = hit(by, t);
      if (events.some((e) => e.kind === "hit")) {
        method = by;
        switchedAtHit = index;
      }
      return events;
    },

    countStrokePass: (t) => (method === "stroke" ? hit("stroke", t) : []),
    countShakeReversal: (t) => (method === "shake" ? hit("shake", t) : []),

    advanceTo(t) {
      const events: ComboEvent[] = [];
      if (phase === "sending" || phase === "running") advance(t - origin, events);
      return events;
    },

    endCombo(t) {
      const events: ComboEvent[] = [];
      if (phase === "ended") return events;
      if (phase === "ready") {
        phase = "ended";
        return events;
      }
      const x = Math.max(Math.round(t - origin), at);
      if (!advance(x, events)) finish(x, phase === "running", events);
      return events;
    },
  };
}

/**
 * A record's hits played again through a fresh combo, the way they were made: taps, then from
 * `switchedAtHit` its passes or reversals. The rules are closed-form between events, so a record
 * replays to itself under the config it was played with.
 */
export function replayGratitudeCombo(
  record: ComboRecord,
  config: GameConfig = GAME_CONFIG,
): ComboRecord {
  if (record.hitTimes.length === 0) throw new Error("A gratitude record with no hits can't replay");
  const { method, switchedAtHit } = record;
  const combo = createGratitudeCombo(config);
  const events = record.hitTimes.flatMap((t, i) => {
    if (switchedAtHit === null || i < switchedAtHit) return combo.tapHeart(t);
    if (method === "tap")
      throw new Error(`A gratitude record switched at hit ${i} but ends in taps`);
    if (i === switchedAtHit) return combo.commitTo(method, t);
    return method === "stroke" ? combo.countStrokePass(t) : combo.countShakeReversal(t);
  });
  // durationMs is rounded, so a bar that ran out may have ended up to half a millisecond after it.
  events.push(...combo.advanceTo(record.durationMs + 0.5));
  if (combo.view.phase !== "ended") events.push(...combo.endCombo(record.durationMs));
  for (const e of events) if (e.kind === "ended") return e.record;
  throw new Error(`Replaying a gratitude record of ${record.hits} hits gave no record`);
}
```

- [ ] **Step 5: Run the tests.** Expected: PASS, the old and the new. Then run checks and commit `feat: count strokes and shakes in the gratitude combo`.

### Task B3: Motion permission, asked once after sign-in

**Files:** Create `apps/frontend/src/ui/motionPermission.ts`, `…/ui/motionPermission.test.ts`, `apps/frontend/src/app/MotionPermissionCard.tsx`, `…/app/motion-permission-card.css`. Modify `…/app/App.tsx`.

- [ ] **Step 1: Write the failing tests** `ui/motionPermission.test.ts`:

```ts
import { afterEach, describe, expect, it, vi } from "vitest";
import { createMotionPermission, type MotionHost } from "./motionPermission";

/** A browser with (or without) iOS's motion prompt, a device store, and a phone that can move. */
function fakeBrowser({
  askable = true,
  kept,
  answer = () => Promise.resolve("granted"),
}: { askable?: boolean; kept?: string; answer?: () => Promise<string> } = {}) {
  const storage = new Map<string, string>();
  if (kept) storage.set("draw.motion", kept);
  const listeners = new Set<() => void>();
  const requestPermission = vi.fn(answer);
  const host: MotionHost = {
    requestPermission: askable ? requestPermission : undefined,
    localStorage: {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => void storage.set(key, value),
    },
    addEventListener: (_type, listener) => void listeners.add(listener),
    removeEventListener: (_type, listener) => void listeners.delete(listener),
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  };
  return { host, storage, requestPermission, movePhone: () => listeners.forEach((l) => l()) };
}

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("createMotionPermission", () => {
  it("needs no asking where the browser has no motion prompt", () => {
    expect(createMotionPermission(fakeBrowser({ askable: false }).host).get()).toBe("not-needed");
  });

  it("asks once, and keeps the answer on the device", async () => {
    const browser = fakeBrowser();
    const permission = createMotionPermission(browser.host);
    expect(permission.get()).toBe("unasked");
    await Promise.all([permission.ask(), permission.ask()]);
    expect(browser.requestPermission).toHaveBeenCalledTimes(1);
    expect(permission.get()).toBe("granted");
    expect(browser.storage.get("draw.motion")).toBe("granted");
  });

  it("doesn't ask again after Not now", () => {
    const browser = fakeBrowser();
    createMotionPermission(browser.host).decline();
    expect(createMotionPermission(browser.host).get()).toBe("denied");
  });

  it("asks again when a kept yes brings no motion, and keeps one that does", () => {
    vi.useFakeTimers();
    const forgotten = createMotionPermission(fakeBrowser({ kept: "granted" }).host);
    const honored = fakeBrowser({ kept: "granted" });
    const still = createMotionPermission(honored.host);
    honored.movePhone();
    vi.advanceTimersByTime(1000);
    expect(forgotten.get()).toBe("unasked");
    expect(still.get()).toBe("granted");
  });

  it("counts a failed ask as no without keeping it, so the next launch asks", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const browser = fakeBrowser({ answer: () => Promise.reject(new Error("Not from a tap")) });
    const permission = createMotionPermission(browser.host);
    await permission.ask();
    expect(permission.get()).toBe("denied");
    expect(browser.storage.has("draw.motion")).toBe(false);
  });
});
```

- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Write `ui/motionPermission.ts`:**

```ts
import { useSyncExternalStore } from "react";

/**
 * The app's one answer about reading the phone's motion. iOS asks, from a tap, once for motion and
 * tilt together; other browsers need no permission. The answer is kept on this device.
 */
export type MotionPermission = "not-needed" | "unasked" | "granted" | "denied";

/** What the permission needs from the browser, so a test can stand in for it. */
export interface MotionHost {
  /** iOS's prompt; absent where motion needs no permission. */
  requestPermission?: () => Promise<string>;
  localStorage: Pick<Storage, "getItem" | "setItem">;
  addEventListener: (type: "devicemotion", listener: () => void) => void;
  removeEventListener: (type: "devicemotion", listener: () => void) => void;
  setTimeout: (run: () => void, ms: number) => number;
  clearTimeout: (id: number) => void;
}

export interface MotionPermissionStore {
  get: () => MotionPermission;
  subscribe: (listener: () => void) => () => void;
  /** Asks the platform; call it from a tap. A second call while the first is pending doesn't ask twice. */
  ask: () => Promise<MotionPermission>;
  /** Not now: it won't ask again. */
  decline: () => void;
}

const KEY = "draw.motion";
/** A kept yes that brings no motion this soon has been forgotten by the platform. */
const CHECK_MS = 1000;

export function createMotionPermission(host: MotionHost): MotionPermissionStore {
  const listeners = new Set<() => void>();
  let pending: Promise<MotionPermission> | null = null;

  const kept = (): "granted" | "denied" | null => {
    try {
      const answer = host.localStorage.getItem(KEY);
      return answer === "granted" || answer === "denied" ? answer : null;
    } catch (error) {
      console.error("The motion answer couldn't be read", error);
      return null;
    }
  };
  const keep = (answer: "granted" | "denied") => {
    try {
      host.localStorage.setItem(KEY, answer);
    } catch (error) {
      console.error("The motion answer couldn't be saved", error);
    }
  };

  let state: MotionPermission = host.requestPermission ? (kept() ?? "unasked") : "not-needed";
  const set = (next: MotionPermission) => {
    state = next;
    listeners.forEach((listener) => listener());
  };

  if (state === "granted") {
    let timer = 0;
    const heard = () => {
      host.clearTimeout(timer);
      host.removeEventListener("devicemotion", heard);
    };
    timer = host.setTimeout(() => {
      host.removeEventListener("devicemotion", heard);
      set("unasked");
    }, CHECK_MS);
    host.addEventListener("devicemotion", heard);
  }

  return {
    get: () => state,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    ask: () => {
      const request = host.requestPermission;
      if (!request) return Promise.resolve(state);
      pending ??= request()
        .then(
          (answer): MotionPermission => {
            const kept = answer === "granted" ? "granted" : "denied";
            keep(kept);
            set(kept);
            return kept;
          },
          (error: unknown): MotionPermission => {
            // Not kept: a failed ask says nothing about the person's answer, so the next launch asks.
            console.error("Asking for motion failed, so motion stays off", error);
            set("denied");
            return "denied";
          },
        )
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    decline: () => {
      keep("denied");
      set("denied");
    },
  };
}

/** iOS's motion prompt, which TypeScript's DOM types don't declare. */
function iosMotionPrompt(): (() => Promise<string>) | undefined {
  const motion: unknown = window.DeviceMotionEvent;
  if (typeof motion !== "function" || !("requestPermission" in motion)) return undefined;
  const ask = motion.requestPermission;
  if (typeof ask !== "function") return undefined;
  return async () => {
    const answer: unknown = await Reflect.apply(ask, motion, []);
    return String(answer);
  };
}

let app: MotionPermissionStore | null = null;
const appPermission = () =>
  (app ??= createMotionPermission({
    requestPermission: iosMotionPrompt(),
    // Read when used, inside the store's own guards: some browsers throw on touching blocked storage.
    localStorage: {
      getItem: (key) => window.localStorage.getItem(key),
      setItem: (key, value) => window.localStorage.setItem(key, value),
    },
    addEventListener: (type, listener) => window.addEventListener(type, listener),
    removeEventListener: (type, listener) => window.removeEventListener(type, listener),
    setTimeout: (run, ms) => window.setTimeout(run, ms),
    clearTimeout: (id) => window.clearTimeout(id),
  }));

export const askForMotion = () => appPermission().ask();
export const declineMotion = () => appPermission().decline();

export function useMotionPermission(): MotionPermission {
  const store = appPermission();
  return useSyncExternalStore(store.subscribe, store.get);
}
```

- [ ] **Step 4: Run the tests.** Expected: PASS.
- [ ] **Step 5: Write `app/MotionPermissionCard.tsx` and `app/motion-permission-card.css`:**

```tsx
import { Vibrate } from "@phosphor-icons/react";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { askForMotion, declineMotion, useMotionPermission } from "../ui/motionPermission";
import "./motion-permission-card.css";

/**
 * Asks once, where the platform asks at all (iOS), whether the app may read the phone's motion.
 * iOS shows its prompt only from inside a tap, and the shared press fires a key's click just after
 * the release, so Allow asks on pointerup as well; asking twice doesn't prompt twice.
 */
export function MotionPermissionCard() {
  const permission = useMotionPermission();
  if (permission !== "unasked") return null;
  const allow = () => void askForMotion();
  return (
    <Sheet label="Motion" onClose={declineMotion}>
      <div className="motion-card">
        <p className="motion-card__text">
          Sticker Board uses motion for some animations and interactions in the app. Would you like
          to grant permissions for motion controls?
        </p>
        <Key icon={<Vibrate />} onPointerUp={allow} onClick={allow}>
          Allow
        </Key>
        <QuietLink onClick={declineMotion}>Not now</QuietLink>
      </div>
    </Sheet>
  );
}
```

```css
/* ---------- The one motion ask, in a sheet after sign-in ---------- */

.motion-card {
  display: grid;
  gap: 14px;
}

.motion-card__text {
  margin: 0;
  font: 600 16px/1.35 var(--font-ui);
  text-wrap: pretty;
}

.motion-card .label-btn--quiet {
  justify-self: center;
}
```

- [ ] **Step 6: Mount it** in `app/App.tsx`: `import { MotionPermissionCard } from "./MotionPermissionCard";`, and render `<MotionPermissionCard />` inside `.phone`, after `<TabBar … />`.
- [ ] **Step 7: Try it in the dev server:**
  - Desktop Chrome has no prompt, so the card never shows.
  - Then stub iOS's prompt with Playwright's `addInitScript`, as `DeviceMotionEvent.requestPermission = () => Promise.resolve("granted")`. The card shows once; Allow keeps "granted"; a reload doesn't show it; Not now keeps "denied".
- [ ] **Step 8: Checks, then commit** `feat: ask for motion once, after sign-in, on iPhones`.

Nothing else changes for the Zipper or the light. Both already listen without asking, and on iOS their events start once motion is allowed.

### Task B4: Stroke on screen

**Files:** Modify `G/touchInput.ts` (+test), `G/heartMotion.ts`, `G/particleEffects.ts`, `G/miniHeartPhysics.ts`, `G/tierSlamAndPopIns.ts`, `G/miniGameEngine.ts`; `G/heartArt.ts` gains `speedFieldSvg` (PJ 370–378).

- [ ] **Step 1: Test first:**
  - Add to `touchInput.test.ts`: the first finger to move past the slop anywhere on the stage becomes the stroke finger, and reports its moves.
  - A finger that is stroking can't tap until it lifts.
  - A second finger doesn't take over the stroke.
- [ ] **Step 2: `touchInput.ts`** gains `onStrokeStart(t, x, y)`, `onStrokeMove(t, x, y)` and `onStrokeEnd()`, following PJ's `strokeId` and `grab` (918–946).
- [ ] **Step 3: The engine** feeds the stroke finger to `createStrokeDetector(FEEL_CONFIG.stroke)`:
  - **Before the unlock** (PJ `thumbMove` 1860–1894 and `tryStroke` 1896–1901):
    - A drag on the heart stretches it on a spring and throws speed lines when hard or fast.
    - A drag of `tryTravelPx` or more that doesn't unlock is a try. After `triesForTip` tries, the tip shows: "Stroke it back and forth, fast", with Phosphor's hand-swipe-right, following PJ's tip (1916–1944).
  - **The unlock:** when a pass brings `fastStreak` to `unlockPasses`, call `combo.commitTo("stroke", t)` and run PJ `unlockStroke`'s look (1902–1914): "!?" slams, the face flashes wide, a punch and a hold.
  - **After the unlock:** each fast pass is `combo.countStrokePass(t)`, with PJ's stream lines, stretch, lean and thumb glow (1208–1249, 1282–1286), the speed field, and `flingAlongStroke` (PJ `strokeBurst` 1709–1717, added back to the physics) from ドキドキ up.
  - **Pop-ins** draw from the stroke bank 30% of the time (PJ `popFor` 1806–1810).
  - **Taps** after the commit are ignored by the combo. The engine plays nothing for them.
- [ ] **Step 4: Compare with the reference states** `stroke-hint`, `stroke-unlock` and `stroke-combo`, then run checks and commit `feat: stroke the gratitude heart`.

### Task B5: Shake on screen

**Files:** Create `G/phoneMotion.ts`. Modify `G/heartMotion.ts`, `G/tierBackground.ts`, `G/miniHeartPhysics.ts`, `G/miniGameEngine.ts`; `G/heartArt.ts` gains `DENT_SVG` (PJ 348).

- [ ] **Step 1: `phoneMotion.ts`: `listenToPhoneMotion(onSample)`**, PJ `onMotion` (866–877):
  - Use `acceleration` when present; otherwise take gravity out of `accelerationIncludingGravity` with PJ's low-pass.
  - Report `(ax, ay, gx, t)`, where gx is gravity's sideways pull, for the tilt.
  - It listens whatever the permission; where motion isn't allowed, no events arrive. It returns its stop.
- [ ] **Step 2: The engine** feeds samples to `createShakeDetector(FEEL_CONFIG.shake)`, porting PJ `motionSample` (2000–2019):
  - Before the unlock, the heart sways with the wrist, tilts with the roll, and jiggles when shaken: jelly, sway and tilt (1194–1200, 1256–1264).
  - At `keepShakingAt`, the tip says "Keep shaking!", with Phosphor's vibrate (fill).
  - At `cornerAt`, a corner lifts (`cornerTo`, 1843, and PC's `.gr-corner`).
  - At `unlockAt`, call `combo.commitTo("shake", t)` and run `unlockShake` (2021–2034): "ポンッ" slams, and the heart comes loose.
  - After the unlock, each reversal is `combo.countShakeReversal(t)`, and `kickFree` sends the heart along.
  - **Loose** (`freeStep` 2041–2062): the heart ricochets off the walls. Each hard hit dents the edge (`dent` 1844–1856, `DENT_SVG`) and knocks mini hearts off the wall from ドキドキ up (`knockOffWall`, PJ `impactBurst` 1719–1727, added back to the physics). While shaking, the shake marks show (PC `.gr-shakemarks`).
  - **No mixing:** taps and strokes do nothing once committed to shake.
- [ ] **Step 3: Compare with the reference states** `shake-hint` and `shake-ricochet`, with motion simulated by dispatching `devicemotion` events carrying `acceleration`. Then run checks and commit `feat: shake the gratitude heart`.

### Task B6: Verify, then tidy up

- [ ] **Step 1:** `pnpm check:full` passes, and knip reports nothing new.
- [ ] **Step 2:** Screenshots of the stroke and shake states beside the reference, with every difference listed. Reduced motion: shake mode wobbles in place, and nothing flies.
- [ ] **Step 3: Owner check on an iPhone inside LINE:**
  - whether iOS shows the motion prompt inside LINE
  - whether the answer survives closing LINE
  - whether the Zipper and the stickers' shine answer the phone once motion is allowed
  - whether a thumb stroking anywhere unlocks stroke, with no LINE gesture firing
  - shake from start to ricochet
- [ ] **Step 4:** Report as in A11.

### Task B7: The durable design doc

**Files:** Create `docs/gratitude-mini-game-design-doc.md`. Modify `AGENTS.MD`.

- [ ] **Step 1: Write the doc:** how the game works as built, for whoever changes or tunes it next.
  - **No hardcoded numbers.** Name the fields in `gameConfig.ts` (`GAME_CONFIG`, `FEEL_CONFIG`), and write every formula with those names.
  - **What it is:** the (Gratitude) Mini-game, in AGENTS.MD's vocabulary; where it opens today; the files, and what each owns.
  - **Phases:** ready, sending, running and ended. For each: what starts it, what ends it, and what shows. A one-tap send never shows a face or the bar, and the first face waits for the catch.
  - **Input methods:**
    - Tap: on the heart's resting area. The first tap counts on release and later ones at touch-down, and every finger counts.
    - Stroke: fast passes anywhere on the screen, the streak that unlocks it, and the tip after tries.
    - Shake: rhythmic reversals, the unlock, and its need for motion permission.
    - All of them: no mixing, lift to tap, and a speed limit per method.
  - **Scoring:** gratitude per hit, the multiplier's target and how it chases it, and the method weights with the first-hit exception, as formulas.
  - **The bar:**
    - it fills at the catch or at an unlock
    - the drain doubles over time
    - each hit adds a gain, and the bar never goes past full
    - the seconds-left display and its scale
    - the ends: empty, the safety stop, hidden and closed
  - **Tiers and faces:** reached by the total and never dropping; the tier-up freeze; what each tier adds to the heart and the ground, in words.
  - **Replay and the record:**
    - state is computed in closed form between events, so a replay gives the same record
    - hit times are whole milliseconds
    - what the result records, and why: the draft schema's `gratitude` table
    - `GAME_CONFIG.version` changes whenever a rule number does
  - **Effects and motion:** the intensity dial and where it's set. The motion permission: asked once after sign-in on iPhones, and what declining turns off.
  - **Tuning:** where to change what, and which tests pin the design's intent.
- [ ] **Step 2: Check it against the code and AGENTS.MD's "Docs" rules.**
  - Every formula matches `combo.ts`.
  - Current state only: no history or research journal, and concise.
  - No personal details, American English, no banned words.
- [ ] **Step 3:** In `AGENTS.MD`'s architecture list, point the `src/gratitude` entry at the doc.
- [ ] **Step 4: Commit** `docs: describe how the gratitude mini-game works`.

## After merging

AGENTS.MD's post-merge rule applies: delete this plan and SPEC. `docs/gratitude-mini-game-design-doc.md` is the durable record; part 2 takes the result's fields from it.
