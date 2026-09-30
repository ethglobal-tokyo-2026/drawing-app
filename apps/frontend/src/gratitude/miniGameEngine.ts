import type { ReplayV1 } from "@drawing-app/api/client";
import { formatCount } from "../i18n/format";
import { i18next } from "../i18n/i18n";
import {
  isPerformanceRecorderOn,
  notePerformance,
  timeOurWork,
} from "../performance/performanceRecorder";
import { browserFrames, type FrameSource } from "../ui/frameSource";
import { seededRandom } from "../ui/seededRandom";
import {
  createGratitudeCombo,
  fullBarSeconds,
  type ComboEvent,
  type ComboPhase,
  type ComboRecord,
  type Method,
  type Tier,
} from "./combo";
import { createComboHud } from "./comboHud";
import { EASE_OUT, EASE_SPRING, clamp } from "../ui/easing";
import { createFrameTimeReadout } from "./frameTimeReadout";
import { FEEL_CONFIG, GAME_CONFIG } from "./gameConfig";
import {
  flyHeartToGiver,
  landHeart,
  playAscension,
  sighAndTidy,
  type EndingParts,
} from "./gameEndings";
import { bigHeartLayers, HAND_SWIPE_SVG, SOUL_SVG, VIBRATE_SVG } from "./heartArt";
import { heartFaceFor, type HeartFace } from "./heartFaces";
import { createHeartMotion, type HeartLayout, type WallHit } from "./heartMotion";
import { createMiniHeartLayer } from "./miniHeartLayer";
import { createMiniHeartPhysics, type HeartBox } from "./miniHeartPhysics";
import { createParticleEffects } from "./particleEffects";
import { listenToPhoneMotion } from "./phoneMotion";
import { createReplayRecorder } from "./replayRecorder";
import { createShakeDetector, type ShakeReversal } from "./shakeDetector";
import { heartRest, LIVE_FRAME, type StageFrame } from "./stageLayout";
import { createStrokeDetector } from "./strokeDetector";
import { createTierBackground } from "./tierBackground";
import { shownGloss, TIER_NAMES } from "./tierNames";
import { createLettering, UNLOCK_SLAMS } from "./tierSlamAndPopIns";
import { isOnHeart, listenForTouches, type HeartArea } from "./touchInput";
import { animate } from "./webAnimations";

/** The parts of a stage the engine fills and moves: the live screen's, or a replay's. */
export interface StageParts {
  root: HTMLElement;
  /** Everything that shakes: the ground, the top, the HUD and the stage. */
  page: HTMLElement;
  ground: HTMLElement;
  hud: HTMLElement;
  stage: HTMLElement;
}

/** The screen's parts that React renders; the engine fills and moves them. */
export interface MiniGameParts extends StageParts {
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
  /** The finished combo and its replay, before its ending plays. */
  onRecord: (record: ComboRecord, replay: ReplayV1) => void;
  /**
   * The combo in play and its replay as they stand, ended as the page going hidden would end them:
   * from the first hit, then now and then as hits come. What's left if the page goes without a word.
   */
  onInPlay: (record: ComboRecord, replay: ReplayV1) => void;
  /** The first hit started the combo. */
  onStarted: () => void;
  /** The ending has played, or the page went hidden or the loop failed: time for the receipt. */
  onFinished: (record: ComboRecord) => void;
  /**
   * The frame loop failed and stopped. No ending can play after it, so a combo in play has been
   * recorded as it stands and `onFinished` follows at once.
   */
  onError: (message: string) => void;
  /** Where frames and time come from: the browser's, unless a test drives them. */
  frames?: FrameSource;
}

export interface MiniGameEngine {
  /**
   * The X: a combo in play ends and is recorded, and its ending and receipt follow, so the screen
   * stays; true. False when no combo is in play, and the screen can close.
   */
  close: () => boolean;
  /** Focus goes to the heart, as the screen opens. */
  focusHeart: () => void;
  setReduced: (reduced: boolean) => void;
  destroy: () => void;
}

/** The rules' ways in, for an input path: times in ms on the engine's clock, places in stage px. */
export interface ComboInput {
  readonly phase: ComboPhase;
  /** A finger down on the heart: a press before the first tap, a tap once the combo runs. */
  heartDown: (t: number, x: number, y: number) => void;
  /** A finger lifting off the heart without dragging or holding: the first tap. */
  heartTap: (t: number, x: number, y: number) => void;
  strokeStart: (t: number, x: number, y: number) => void;
  /** The stroke finger moved; `fastPass` as StrokeDetector's `fingerMove` takes it. */
  strokeMove: (t: number, x: number, y: number, fastPass?: boolean | null) => void;
  strokeEnd: () => void;
  /** Commits a combo still tapping, or not started, to stroke, as a streak of fast passes does. */
  unlockStroke: (t: number, x: number, y: number) => void;
  /** The phone turned back, one way along its axis: the shake unlock, then a hit each. */
  shakeReversal: (t: number, direction: 1 | -1) => void;
  /** Ends a combo still in play at `t`, as the page going hidden or the screen closing does. */
  endAt: (t: number, reason: "hidden" | "closed") => void;
}

/** Where the HUD and the heart's area sit on a stage, px. */
export interface StageLayout {
  /** What sits above the heart's area. */
  frame: StageFrame;
  /** The HUD's top. */
  hudTop: number;
  /** The stage's size until it has one, as in a test's DOM. */
  fallback: { width: number; height: number };
}

/** A recorded combo, played on a replay's stage through the engine's own handlers. */
export interface ReplayEngineOptions {
  /** The combo's own: its effects' seed and intensity. */
  seed: number;
  intensity: number;
  reduced: boolean;
  /** The replay's clock. */
  frames: FrameSource;
  /** How fast that clock runs against real time: Web Animations play at it too. */
  speed: number;
  layout: StageLayout;
  /** The stage's width over the live game's: lettering, particles and mini hearts scale by it. */
  scale: number;
  /** The replay's px per px of the stage it was recorded on: the stroke rules scale by it. */
  inputScale: number;
  /** Mini hearts in play at most. */
  miniHearts: number;
  /** Where the heart lands at the end, px on the stage; null lands it where it rests. */
  landAt: () => { x: number; y: number } | null;
  /** Feeds the inputs due by `now`, on the engine's clock, before the rules advance to it. */
  drive: (now: number, input: ComboInput) => void;
  /** The combo has ended, as the replay counted it: the total its HUD ends on. */
  onEnded: (record: ComboRecord) => number;
  /** The heart has landed. */
  onLanded: () => void;
  /** The frame loop failed and stopped. */
  onError: (message: string) => void;
}

export type ReplayEngine = Pick<MiniGameEngine, "setReduced" | "destroy">;

/** The live game: touches, keys and the phone's motion, and the record and replay kept of them. */
interface LiveInput {
  kind: "live";
  parts: Omit<MiniGameParts, keyof StageParts>;
  onRecord: MiniGameOptions["onRecord"];
  onInPlay: MiniGameOptions["onInPlay"];
  onStarted: MiniGameOptions["onStarted"];
}

/** A recorded combo, its inputs fed each frame; it ends in a landing. */
interface ReplayInput {
  kind: "replay";
  landAt: ReplayEngineOptions["landAt"];
  drive: ReplayEngineOptions["drive"];
  onEnded: ReplayEngineOptions["onEnded"];
}

interface EngineOptions {
  /** As printed: "@alice". */
  giverHandle: string;
  intensity: number;
  reduced: boolean;
  showFrameTimes: boolean;
  /** The effects' seed: a replay's recorded one, or else one of the mount's own. */
  seed?: number;
  frames: FrameSource;
  speed: number;
  layout: StageLayout;
  scale: number;
  inputScale: number;
  miniHearts: number;
  onFinished: (record: ComboRecord) => void;
  onError: (message: string) => void;
  input: LiveInput | ReplayInput;
}

type Ended = Extract<ComboEvent, { kind: "ended" }>;

/** A hit's press, by how it was made. */
const SQUASH_BY_METHOD: Record<Method, number> = { tap: 3.3, stroke: 1.6, shake: 1.2 };

/** The live game's stage width: a smaller stage draws at its width over this. */
export const LIVE_STAGE_WIDTH = 390;
/** The live screen: its top band and HUD above the heart, and a phone's size until it has one. */
const LIVE_LAYOUT: StageLayout = {
  frame: LIVE_FRAME,
  hudTop: 172,
  fallback: { width: LIVE_STAGE_WIDTH, height: 741 },
};

/** The tips: what to do, said only once the person is trying, and held this long in s. */
const TIPS = {
  stroke: { icon: HAND_SWIPE_SVG, holdS: 6 },
  shake: { icon: VIBRATE_SVG, holdS: 2.4 },
};
type TipKind = keyof typeof TIPS;
/** ms a stroke finger counts as moving after its latest move. */
const THUMB_RECENT_MS = 250;
/** ms between writes of the heart's light while a thumb holds it, which the CSS glides between. */
const LIGHT_MS = 45;
/** A replayed shake reversal's strength in m/s²: a reversal's own isn't recorded. */
const REPLAYED_REVERSAL_STRENGTH = 14;
/** ms between keeps of a combo in play as hits come: each one writes the device's storage. */
const IN_PLAY_KEEP_MS = 500;
/**
 * Salts for the streams of the seed that the combo's own effects draw from, one each, so the same
 * hits draw the same words, word places and particles however the frames fall.
 */
const EFFECT_STREAMS = { words: 0x9e3779b9, wordPlaces: 0x85ebca6b, particles: 0xc2b2ae35 };

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
  const { onRecord, onInPlay, onStarted, frames, ...rest } = options;
  return mountEngine(parts, {
    ...rest,
    frames: frames ?? browserFrames,
    speed: 1,
    layout: LIVE_LAYOUT,
    scale: 1,
    inputScale: 1,
    miniHearts: FEEL_CONFIG.miniHearts.live,
    input: { kind: "live", parts, onRecord, onInPlay, onStarted },
  });
}

/**
 * A recorded combo on the engine's frame loop: its inputs go through the same handlers a finger's
 * do, on the replay's clock. It listens to nothing, records nothing and shows no tips.
 */
export function mountReplayEngine(parts: StageParts, options: ReplayEngineOptions): ReplayEngine {
  const { landAt, drive, onEnded, onLanded, ...rest } = options;
  const { setReduced, destroy } = mountEngine(parts, {
    ...rest,
    // Its stage is hidden from assistive tech: the card it plays in says what it shows.
    giverHandle: "",
    showFrameTimes: false,
    onFinished: onLanded,
    input: { kind: "replay", landAt, drive, onEnded },
  });
  return { setReduced, destroy };
}

function mountEngine(parts: StageParts, options: EngineOptions): MiniGameEngine {
  const { root, page, ground } = parts;
  const { frames, layout, scale, inputScale, speed } = options;
  const liveInput = options.input.kind === "live" ? options.input : null;
  const replay = options.input.kind === "replay" ? options.input : null;
  const mount = ++mounts;
  const seed = options.seed ?? (0xa11ce + mount * 7) >>> 0;
  // Per-frame jitter: the HUD's shiver, the heart's tremor and kicks, the physics. Frames draw on it.
  const random = seededRandom(seed);
  const words = seededRandom(seed ^ EFFECT_STREAMS.words);
  const combo = createGratitudeCombo(GAME_CONFIG);
  const { intensity } = options;
  const recorder = liveInput ? createReplayRecorder({ seed, intensity, ...layout.fallback }) : null;
  let reduced = options.reduced;
  /**
   * The engine's clock, ms: the time of the input being handled, else the latest frame's. Every
   * timer reads it, so an input's effects share its time, and a replay's clock drives them all.
   */
  let clock = frames.now();

  // The stage's layers, back to front: the thumb's glow, speed lines, stamps, 昇天's rain, the heart,
  // mini hearts, the soul, effects, lettering.
  const layer = (className: string, decorative = true) => {
    const el = document.createElement("div");
    el.className = className;
    if (decorative) el.setAttribute("aria-hidden", "true");
    parts.stage.append(el);
    return el;
  };
  const thumbGlow = layer("gr-thumb-glow");
  const linesLayer = layer("gr-layer");
  const stampsLayer = layer("gr-layer");
  const behind = layer("gr-layer");
  // The live heart's anchor holds its button, so assistive tech keeps it; a replay's heart is hidden.
  const anchor = layer("gr-heart-anchor", replay !== null);
  const front = layer("gr-layer");
  const soul = layer("gr-soul");
  const effectsLayer = layer("gr-layer");
  const captions = layer("gr-layer");
  soul.innerHTML = SOUL_SVG;

  const body = document.createElement("div");
  body.className = "gr-heart-body";
  const art = bigHeartLayers(`h${mount}`);
  body.innerHTML = `<div class="gr-heart-layers" aria-hidden="true">${art.body}${art.flush}${art.pale}${art.gloss}${art.ink}${art.face}</div>`;
  const ink = body.querySelector(".h-ink");
  // Only the heart's gloss reads the light, so a thumb's light goes on it, not on the whole game.
  const gloss = body.querySelector<SVGElement>(".h-gloss");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gr-heart-btn";
  button.setAttribute(
    "aria-label",
    i18next.t(($) => $.gratitude.heart, { handle: options.giverHandle }),
  );
  // A replay plays itself: its heart takes no taps.
  if (replay) button.inert = true;
  body.append(button);
  anchor.append(body);

  const hud = createComboHud(parts.hud, {
    reduced: () => reduced,
    random,
    rate: speed,
    hits: liveInput !== null,
  });
  const background = createTierBackground(ground, page, () => reduced, speed);
  const lettering = createLettering(captions, {
    intensity,
    random: seededRandom(seed ^ EFFECT_STREAMS.wordPlaces),
    words,
    reduced: () => reduced,
    now: () => clock,
    rate: speed,
    scale,
    // A replay's stage is too small for the English glosses' fine print.
    glosses: liveInput !== null,
  });
  const effects = createParticleEffects(
    { stamps: stampsLayer, effects: effectsLayer, lines: linesLayer },
    {
      reduced: () => reduced,
      random: seededRandom(seed ^ EFFECT_STREAMS.particles),
      rate: speed,
      scale,
    },
  );
  const miniHearts = createMiniHeartLayer({ front, behind }, scale);
  const physics = createMiniHeartPhysics(
    { ...layout.fallback, ceiling: layout.frame.above },
    random,
    { scale, live: options.miniHearts },
  );
  const readout = options.showFrameTimes ? createFrameTimeReadout(root) : null;

  const tip = document.createElement("p");
  tip.className = "gr-tip";
  tip.setAttribute("aria-hidden", "true");
  const tipIcon = document.createElement("span");
  tipIcon.className = "gr-tip-ic";
  const tipText = document.createElement("span");
  tip.append(tipIcon, tipText);
  if (liveInput) page.append(tip);

  // Layout, read when the screen mounts or resizes, never per frame.
  let size = { ...layout.fallback };
  let rect = { left: 0, top: 0, scale: 1 };
  /** Where the heart ends up: the middle of the giver's picture, or where a replay lands it. */
  const giverPoint = (rest: { x: number; y: number }) => {
    if (!liveInput) return replay?.landAt() ?? { x: rest.x, y: rest.y };
    const { giverPhoto } = liveInput.parts;
    return {
      x: giverPhoto.offsetLeft + giverPhoto.offsetWidth / 2 || 128,
      y: giverPhoto.offsetTop + giverPhoto.offsetHeight / 2 || 120,
    };
  };
  const layoutFor = (width: number, height: number): HeartLayout => {
    const rest = heartRest(width, height, layout.frame);
    const top = layout.frame.above;
    return {
      rest: { x: rest.x, y: rest.y },
      width: rest.width,
      height: rest.height,
      giver: giverPoint(rest),
      screen: { width, height },
      ceiling: top - 20 * scale,
    };
  };
  let L = layoutFor(size.width, size.height);
  // A hard hit on an edge dents it and shakes the screen; from ドキドキ up it knocks mini hearts off.
  // Once the combo has ended, nothing hits back.
  const onWallHit = (hit: WallHit) => {
    if (ending || combo.view.phase === "ended") return;
    // Where it hit, along the edge and across it: the top wall is the HUD's underside.
    const level = hit.edge === "top" || hit.edge === "bottom";
    background.dent(hit.edge, level ? hit.x : hit.y, level ? hit.y : hit.x);
    heart.shake(Math.min(5 * scale, hit.speed / 260) * (0.4 + intensity * 0.6));
    if ((combo.view.tier ?? 0) >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
      const { normal } = hit;
      const off = 10 * scale;
      const from = { x: hit.x + normal.x * off, y: hit.y + normal.y * off };
      const count = throwCount();
      physics.knockOffWall(from.x, from.y, normal, hit.speed, count);
      markThrow("knock", count);
    } else if (random() < 0.6) effects.burst(2, hit);
  };
  const heart = createHeartMotion(L, random, onWallHit, scale);
  const applyLayout = () => {
    size = {
      width: root.clientWidth || layout.fallback.width,
      height: root.clientHeight || layout.fallback.height,
    };
    recorder?.resize(size.width, size.height);
    const box = root.getBoundingClientRect();
    rect = { left: box.left, top: box.top, scale: box.width / size.width || 1 };
    L = layoutFor(size.width, size.height);
    heart.setLayout(L);
    body.style.width = `${L.width}px`;
    parts.hud.style.setProperty("--hud-top", `${layout.hudTop}px`);
    const above = layout.frame.above;
    if (liveInput) {
      liveInput.parts.hint.style.top = `${L.rest.y + L.height * 0.5 + 22}px`;
      tip.style.top = `${L.rest.y + L.height * 0.5 + 16}px`;
      root.style.setProperty("--rc-top", `${Math.max(above - 10, L.rest.y - 110)}px`);
    }
    background.setLayout(size.width, size.height, { x: L.rest.x, y: L.rest.y, height: L.height });
    lettering.setLayout(size.width, size.height, above);
    physics.setBounds({ ...size, ceiling: above });
  };
  applyLayout();
  const resizes =
    typeof ResizeObserver === "function"
      ? new ResizeObserver(() => {
          if (root.clientWidth !== size.width || root.clientHeight !== size.height) applyLayout();
        })
      : null;
  resizes?.observe(root);

  /** Where the heart was last drawn: its middle, and its size as a share of its resting size. */
  let heartAt = { ...L.rest, scale: 1 };
  /** The heart's resting box. */
  const restBox = (): HeartBox => ({ x: L.rest.x, y: L.rest.y, width: L.width, height: L.height });
  /** The heart as last drawn, loose or not: the effects that sit on it follow it. */
  const heartBox = (): HeartBox => ({
    x: heartAt.x,
    y: heartAt.y,
    width: L.width * heartAt.scale,
    height: L.height * heartAt.scale,
  });
  const heartArea = (): HeartArea => ({
    cx: L.rest.x,
    cy: L.rest.y,
    width: L.width,
    height: L.height,
  });
  const say = (text: string) => {
    // A replay's stage is hidden from assistive tech: its card says what plays.
    if (liveInput) liveInput.parts.live.textContent = text;
  };

  root.dataset.phase = "ready";
  root.dataset.tier = "";
  root.dataset.reduced = reduced ? "1" : "0";
  notePerformance("gratitude", "phase ready");
  // The HUD shows from the start: a full bar, until the first tap starts it.
  root.dataset.hud = "on";
  hud.show(true);
  /** The HUD as last drawn at ready, which holds still until the first tap. */
  let readyDrawn = false;

  let face = heartFaceFor(null, intensity, 0);
  let forced: Partial<HeartFace> | null = null;
  /** A face shown for a moment over the tier's, until the clock passes `until`. */
  let flash: { face: HeartFace["face"]; until: number } | null = null;
  const writeFace = () => {
    const f = { ...face, ...(flash ? { face: flash.face } : null), ...forced };
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
  let ending = false;
  let alive = true;
  let running = true;
  /** Withdraws the frame asked for. */
  let cancelFrame = () => {};
  let last: number | null = null;

  /** Resolves after `ms` of play time, which stops while the screen is held. */
  const wait = (ms: number) =>
    new Promise<void>((resolve) => waits.push({ at: play + ms / 1000, resolve }));
  /** Holds the screen, play time included, for `ms`. */
  const freeze = (ms: number) => {
    heldUntil = Math.max(heldUntil, clock + ms);
  };
  const endingParts: EndingParts | null = liveInput
    ? {
        heart,
        background,
        lettering,
        effects,
        physics,
        miniHearts,
        hud,
        giverPhoto: liveInput.parts.giverPhoto,
        giverDot: liveInput.parts.giverDot,
        giverPoint: () => L.giver,
        fuu: liveInput.parts.fuu,
        soul,
        heartBox,
        restBox,
        heartPoint: () => heartAt,
        screenWidth: () => size.width,
        wait,
        freeze,
        forceFace: (f) => {
          forced = f;
          writeFace();
        },
        reduced: () => reduced,
        intensity,
      }
    : null;

  /** The total the HUD ends on, when a replay's stored one differs from its own count. */
  let endTotal: number | null = null;

  /** The combo that has ended and been handed to `onRecord`, once it has: what the receipt shows. */
  let endedRecord: ComboRecord | null = null;

  const finish = (record: ComboRecord) => {
    if (!alive || root.dataset.phase === "done") return;
    root.dataset.phase = "done";
    notePerformance("gratitude", "phase done");
    // The live game's receipt takes the HUD's place; a replay's HUD stays on its figures.
    if (liveInput) {
      root.dataset.hud = "off";
      hud.show(false);
    }
    options.onFinished(record);
  };

  async function end(ended: Ended, hidden: boolean) {
    const { record } = ended;
    ending = true;
    stopHints();
    root.dataset.phase = "ending";
    if (isPerformanceRecorderOn()) {
      notePerformance("gratitude", `phase ending after ${record.hits} hits`);
    }
    // The heart leaves: nothing can tap it, and focus can't stay on it.
    button.disabled = true;
    if (replay) {
      const total = replay.onEnded(record);
      if (total !== record.total) {
        endTotal = total;
        hud.snapTotal(total);
      }
      // Where it lands is read now, as the card's layout may have moved since the replay began.
      L = { ...L, giver: giverPoint(L.rest) };
      heart.setLayout(L);
      await landHeart({ heart, effects });
      // Nothing stays piled on the card, so once it has melted the frame loop sleeps.
      physics.melt();
      return finish(record);
    }
    if (!liveInput || !recorder || !endingParts) return finish(record);
    try {
      liveInput.onRecord(record, recorder.finish(ended));
    } catch (error) {
      // The record is the app's to keep; its failure shouldn't strand the person mid-ending.
      console.error("Keeping the gratitude failed; the ending plays on", error);
    }
    endedRecord = record;
    if (hidden) return finish(record);
    if (combo.view.tier === 4 && !reduced) await playAscension(endingParts);
    else await flyHeartToGiver(endingParts);
    await sighAndTidy(endingParts);
    finish(record);
  }

  /** The hits of the combo in play as last kept, and when, on the engine's clock. */
  let keptInPlay = { hits: 0, at: -Infinity };
  /**
   * Keeps the combo in play as it stands, `hits` long, as its hits come: a page torn down without a
   * visibilitychange or pagehide, which would end it, still leaves it to send.
   */
  const keepInPlay = (now: number, hits: number) => {
    if (!liveInput || !recorder || hits === keptInPlay.hits) return;
    if (now - keptInPlay.at < IN_PLAY_KEEP_MS) return;
    const ended = combo.endedAt(now, "hidden");
    if (!ended) return;
    keptInPlay = { hits, at: now };
    try {
      liveInput.onInPlay(ended.record, recorder.soFar(ended));
    } catch (error) {
      // As with the record: keeping it is the app's, and its failure shouldn't stop the game.
      console.error("Keeping the combo in play on this device failed; it plays on", error);
    }
  };

  const onStarted = () => {
    root.dataset.phase = "running";
    liveInput?.onStarted();
    // The replay keeps strokes from the first hit on, so passes before it never count toward a
    // switch: it switches where the combo did.
    strokes.breakStreak();
    if (isPerformanceRecorderOn()) {
      notePerformance("gratitude", `phase running, ${combo.view.method}`);
    }
    root.dataset.hud = "on";
    hud.show(true);
    // The start's words stand before the score's; a stroke or shake that starts the combo says its own.
    lastAnnounce = play;
    if (combo.view.method === "tap") say(i18next.t(($) => $.gratitude.announcements.keepTapping));
  };

  const onTierUp = (tier: Tier) => {
    if (isPerformanceRecorderOn()) notePerformance("gratitude", `tier-up ${TIER_NAMES[tier].jp}`);
    root.dataset.tier = String(tier);
    background.show(tier, intensity, combo.view.method);
    if (!reduced) heart.punch(0.035 * (0.6 + intensity));
    const { jp, en } = TIER_NAMES[tier];
    const tierGloss = shownGloss(en);
    lettering.slamTierName(jp, tierGloss);
    if (tier === 2) effects.burst(5, heartAt);
    // ありがと comes with the first hit, whose words it leaves; each tier after it is said by name: its
    // gloss where the app shows one, otherwise the word itself.
    if (tier > 0) {
      lastAnnounce = play;
      say(tierGloss ? `${tierGloss.charAt(0).toUpperCase()}${tierGloss.slice(1)}.` : jp);
    }
  };

  /** Mini hearts a spray, a fling or a knock throws: more as the multiplier climbs. */
  const throwCount = () => Math.min(3, 1 + Math.floor((combo.view.multiplier - 1) / 3));
  /**
   * Marks mini hearts thrown for the performance recorder: what threw them, `count` if given, and the
   * pile they join. With the recorder off, it formats nothing.
   */
  const markThrow = (what: string, count?: number) => {
    if (!isPerformanceRecorderOn()) return;
    const thrown = count === undefined ? what : `${what} ${count}`;
    notePerformance("gratitude", `${thrown}, ${physics.hearts.length} mini hearts`);
  };

  const onHit = (secondsAdded: number, x: number, y: number, tierUp: boolean) => {
    const view = combo.view;
    const { method } = view;
    const tapped = method === "tap";
    const tier = view.tier ?? 0;
    const hits = view.hits;
    const box = heartBox();
    heart.squash(SQUASH_BY_METHOD[method]);
    hud.hit(secondsAdded);
    if (tapped) effects.stamp(x, y);
    effects.rise(1 + (tier >= 2 ? Math.round(intensity * 1.5) : 0), box);
    const every = tier >= 2 ? 2 : 3;
    if (!tierUp && hits % every === 0) {
      // A stroke or a shake draws on its own words some of the time.
      lettering.showPopInWord(!tapped && words() < 0.3 ? method : tier, box);
    }
    if (tier === 0 && hits % 2 === 0) effects.glint(box);
    if (tier === 1 && hits % 4 === 0) effects.bead(box);
    if (tier >= 2 && !reduced) heart.shake((tier >= 3 ? 5 : 2) * intensity * scale);
    if (tier === 2 && hits % 5 === 0) effects.burst(2, heartAt);
    if (tier >= 3 && hits % 2 === 0) effects.steam(Math.max(1, Math.round(intensity * 2)), box);
    if (tier >= 3 && hits % 2 === 1 && method !== "stroke" && !reduced) {
      physics.rainFromTop();
      markThrow("rain");
    }
    if (tapped && !reduced && physics.hearts.length > 0) physics.shoveAwayFrom(x, y);
    if (tapped && tier >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
      const count = throwCount();
      physics.sprayFromTap(x, y, box, count);
      markThrow("spray", count);
    }
    if (tier === 4 && hits % 3 === 0) effects.glint(box);
    if (play - lastAnnounce > 1.6) {
      lastAnnounce = play;
      say(
        i18next.t(($) => $.gratitude.announcements.total, {
          total: formatCount(view.total),
          multiplier: view.multiplier.toFixed(1),
        }),
      );
    }
  };

  const handle = (events: readonly ComboEvent[], x: number, y: number, hidden = false) => {
    const tierUp = events.some((e) => e.kind === "tier");
    for (const e of events) {
      if (e.kind === "started") onStarted();
      else if (e.kind === "hit") onHit(e.secondsAdded, x, y, tierUp);
      else if (e.kind === "limited") {
        // A tap past the limit still presses the heart; a stroke pass or shake reversal past it shows
        // nothing, so it never looks like a hit.
        if (combo.view.method === "tap") {
          heart.squash(SQUASH_BY_METHOD.tap);
          effects.stamp(x, y);
        }
      } else if (e.kind === "tier") onTierUp(e.tier);
      else void end(e, hidden);
    }
    showFace();
  };

  // The tip: what to do, said only once the person is trying.
  let tipShown: TipKind | null = null;
  let tipUntil = 0;
  let tipPulsedAt = -Infinity;
  let tipAnimation: Animation | null = null;
  const showTip = (kind: TipKind) => {
    // A replay shows no tips: nobody is there to take them.
    if (!liveInput) return;
    const fresh = tipShown !== kind;
    tipShown = kind;
    tipUntil = wall + TIPS[kind].holdS;
    if (fresh) {
      const text = i18next.t(($) => $.gratitude.tips[kind]);
      tipIcon.innerHTML = TIPS[kind].icon;
      tipText.textContent = text;
      tip.dataset.kind = kind;
      root.dataset.tip = "on";
      say(text);
    } else if (wall - tipPulsedAt < 0.7) return;
    tipPulsedAt = wall;
    tipAnimation?.cancel();
    tipAnimation = null;
    tip.style.opacity = "1";
    if (reduced) return;
    tipAnimation = animate(
      tip,
      fresh
        ? [
            { transform: "rotate(-2deg) scale(.55)", opacity: 0, easing: EASE_SPRING },
            { offset: 0.6, transform: "rotate(-2deg) scale(1)", opacity: 1 },
            { transform: "rotate(-2deg) scale(1)", opacity: 1 },
          ]
        : [
            { transform: "rotate(-2deg) scale(1.08)", easing: EASE_OUT },
            { transform: "rotate(-2deg) scale(1)" },
          ],
      { duration: fresh ? 420 : 220 },
    );
  };
  const hideTip = () => {
    if (!tipShown) return;
    tipShown = null;
    root.dataset.tip = "off";
    tipAnimation?.cancel();
    tip.style.opacity = "0";
    tipAnimation = reduced
      ? null
      : animate(tip, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: EASE_OUT });
  };

  // Stroking: one finger at a time, anywhere on the screen. Before the unlock a drag on the heart
  // pulls it and counts as a try; five fast passes in a row commit the combo to stroking. A replay's
  // strokes come scaled onto its stage, so the rules' lengths and speeds scale with them.
  const { minRunPx, fastPxPerMs, turnPx, pauseMs } = FEEL_CONFIG.stroke;
  const strokes = createStrokeDetector({
    minRunPx: minRunPx * inputScale,
    fastPxPerMs: fastPxPerMs * inputScale,
    turnPx: turnPx * inputScale,
    pauseMs,
  });
  let stroke: {
    onHeart: boolean;
    from: { x: number; y: number };
    last: { x: number; y: number };
    /** px the finger has travelled. */
    travel: number;
    /** Recent samples, for the thumb's velocity. */
    samples: { x: number; y: number; t: number }[];
    /** Where the current run began: where the finger went down, then where it last turned. */
    runFrom: { x: number; y: number };
  } | null = null;
  let strokeTries = 0;
  /** The thumb's smoothed speed in the recorded stage's px/ms, and the stroke's axis in degrees. */
  let strokeSpeed = 0;
  let strokeAngle = 90;
  let lastMoveAt = -Infinity;
  let lastLinesAt = -Infinity;
  let lightAt = -Infinity;
  let lightOwned = false;
  /** The speed field as last written: its opacity, and its angle as an axis kept turning smoothly. */
  let field = { opacity: 0, angle: 0 };

  /** The clock's time at which a corner a shake lifted comes down, unless the shake keeps on: 0 when down. */
  let cornerUntil = 0;
  const lowerCorner = () => {
    cornerUntil = 0;
    background.liftCorner(0);
  };

  /** Speed lines past the thumb, no more often than FEEL_CONFIG's throttle lets them. */
  const streamLinesAt = (
    t: number,
    x: number,
    y: number,
    v: { x: number; y: number; speed: number },
  ) => {
    const { fastPxPerMs, fastMs, slowMs } = FEEL_CONFIG.stroke.lines;
    const fast = v.speed / inputScale > fastPxPerMs;
    if (reduced || t - lastLinesAt <= (fast ? fastMs : slowMs)) return;
    lastLinesAt = t;
    effects.streamLines(x, y, v);
  };

  /**
   * The ground's speed field, written only when it changes enough to show. A stroke's angle turns
   * half a turn at every pass, and its lines look the same that way round, so the field keeps to
   * the axis nearest its last. With reduced motion it stays off.
   */
  const showSpeedField = (opacity: number, angle: number) => {
    const next = reduced ? 0 : opacity;
    const axis = field.angle + (((((angle - field.angle) % 180) + 270) % 180) - 90);
    const { opacityStep, angleStepDeg } = FEEL_CONFIG.stroke.speedField;
    const off = next === 0;
    if (off && field.opacity === 0) return;
    if (
      !off &&
      field.opacity !== 0 &&
      Math.abs(next - field.opacity) < opacityStep &&
      Math.abs(axis - field.angle) < angleStepDeg
    ) {
      return;
    }
    field = { opacity: next, angle: off ? field.angle : axis };
    background.setSpeedField(field.opacity, field.angle);
  };

  const velocity = (samples: readonly { x: number; y: number; t: number }[]) => {
    if (samples.length < 2) return { x: 0, y: 0, speed: 0 };
    const a = samples[Math.max(0, samples.length - 5)];
    const b = samples[samples.length - 1];
    const ms = Math.max(8, b.t - a.t);
    const x = (b.x - a.x) / ms;
    const y = (b.y - a.y) / ms;
    return { x, y, speed: Math.hypot(x, y) };
  };

  const unlockStroke = (t: number, x: number, y: number) => {
    const events = combo.commitTo("stroke", t);
    // No hit: the combo had already ended, and that end still plays.
    if (!events.some((e) => e.kind === "hit")) return handle(events, x, y);
    hideTip();
    heart.pullTo(0, null);
    // The wrist no longer moves the heart: its tilt eases back, and a lifted corner comes down.
    heart.stopSway();
    lowerCorner();
    // The combo's own look first, so the unlock's slam is the one that shows.
    handle(events, x, y);
    background.show(combo.view.tier, intensity, "stroke");
    lettering.slamTierName(UNLOCK_SLAMS.stroke.jp, shownGloss(UNLOCK_SLAMS.stroke.en));
    flash = { face: "wide", until: clock + 700 };
    writeFace();
    if (!reduced) heart.punch(0.05);
    freeze(80);
    say(i18next.t(($) => $.gratitude.announcements.strokeUnlocked));
  };

  const onStrokeStart = (t: number, x: number, y: number) => {
    clock = t;
    if (!running || ending || combo.view.method === "shake") return;
    strokes.fingerDown(x, y, t);
    recorder?.strokeStart(t, x, y);
    stroke = {
      onHeart: isOnHeart(x, y, heartArea()),
      from: { x, y },
      last: { x, y },
      travel: 0,
      samples: [{ x, y, t }],
      runFrom: { x, y },
    };
  };

  const onStrokeMove = (t: number, x: number, y: number, fastPass: boolean | null = null) => {
    clock = t;
    const s = stroke;
    if (!s || !running || ending || combo.view.method === "shake") return;
    s.travel += Math.hypot(x - s.last.x, y - s.last.y);
    s.last = { x, y };
    lastMoveAt = t;
    s.samples.push({ x, y, t });
    while (s.samples.length > 3 && t - s.samples[0].t > 180) s.samples.shift();
    const v = velocity(s.samples);
    strokeSpeed += (v.speed / inputScale - strokeSpeed) * 0.35;
    const pass = strokes.fingerMove(x, y, t, fastPass);
    recorder?.strokeMove(t, x, y, pass?.fast === true);
    if (pass) s.runFrom = pass.end;
    // The stretch and the speed field follow the run, at any angle.
    const rx = x - s.runFrom.x;
    const ry = y - s.runFrom.y;
    if (Math.hypot(rx, ry) > 10) strokeAngle = (Math.atan2(ry, rx) * 180) / Math.PI;
    else if (v.speed > 0.05) strokeAngle = (Math.atan2(v.y, v.x) * 180) / Math.PI;

    if (combo.view.method === "stroke") {
      streamLinesAt(t, x, y, v);
      if (!pass?.fast) return;
      const events = combo.countStrokePass(t);
      handle(events, x, y);
      // Only a counted pass flings mini hearts.
      const counted = events.some((e) => e.kind === "hit");
      const tier = combo.view.tier ?? 0;
      if (counted && tier >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
        const count = throwCount();
        physics.flingAlongStroke(pass, count);
        markThrow("fling", count);
      }
      return;
    }
    if (s.onHeart) {
      const dx = x - s.from.x;
      const dy = y - s.from.y;
      const d = Math.hypot(dx, dy);
      heart.pullTo(d / inputScale, d > 8 ? (Math.atan2(dy, dx) * 180) / Math.PI : null);
      // A hard or fast drag throws speed lines.
      const lines = FEEL_CONFIG.stroke.lines.fastPxPerMs * inputScale;
      if (v.speed > lines) streamLinesAt(t, x, y, v);
      else if (d / inputScale > 100) streamLinesAt(t, x, y, { x: dx / d, y: dy / d, speed: lines });
      // Trying again: the tip stays.
      if (tipShown === "stroke") tipUntil = Math.max(tipUntil, wall + 4);
    }
    const { unlockPasses, unlockPassesMidCombo } = FEEL_CONFIG.stroke;
    const passesToUnlock = combo.view.phase === "running" ? unlockPassesMidCombo : unlockPasses;
    if (pass?.fast && pass.fastStreak >= passesToUnlock) unlockStroke(t, x, y);
  };

  const onStrokeEnd = () => {
    const s = stroke;
    stroke = null;
    strokes.fingerUp();
    recorder?.strokeEnd();
    heart.pullTo(0, null);
    // A drag on the heart that didn't unlock stroking is a try; enough of them, and the tip says how.
    if (!s?.onHeart || s.travel < FEEL_CONFIG.stroke.tryTravelPx) return;
    if (!running || ending || combo.view.method !== "tap" || combo.view.phase === "ended") return;
    strokeTries++;
    if (strokeTries >= FEEL_CONFIG.stroke.triesForTip) showTip("stroke");
  };

  // Shaking: before the unlock the heart answers the wrist in place, and a hard shake in a rhythm
  // builds to the tip, a lifting corner, then the heart coming loose. Reduced motion keeps it in place.
  const shakes = createShakeDetector(FEEL_CONFIG.shake);
  /** The clock's time until which the shake marks show. */
  let shakingUntil = 0;

  /** The way a reversal went along its axis: 1 or −1. */
  const directionOf = (reversal: ShakeReversal) => reversal.direction.x || reversal.direction.y;

  const unlockShake = (t: number, reversal: ShakeReversal) => {
    const events = combo.commitTo("shake", t);
    recorder?.shake(directionOf(reversal), events);
    // No hit: the combo had already ended, and that end still plays.
    if (!events.some((e) => e.kind === "hit")) return handle(events, heartAt.x, heartAt.y);
    hideTip();
    lowerCorner();
    shakingUntil = t + FEEL_CONFIG.shake.resetMs;
    // A finger still dragging lets go of the heart: nothing leans to it, lights it or glows under it.
    heart.pullTo(0, null);
    if (stroke) {
      stroke = null;
      strokes.fingerUp();
      recorder?.strokeEnd();
    }
    // The combo's own look first, so the unlock's slam is the one that shows.
    handle(events, heartAt.x, heartAt.y);
    if (!reduced) {
      heart.comeLoose();
      heart.kickLoose(reversal.direction, reversal.strength);
    }
    lettering.slamTierName(UNLOCK_SLAMS.shake.jp, shownGloss(UNLOCK_SLAMS.shake.en));
    flash = { face: "wide", until: clock + 600 };
    writeFace();
    effects.burst(8, heartAt);
    // With reduced motion the heart stays put.
    say(
      reduced
        ? i18next.t(($) => $.gratitude.announcements.shakeUnlocked)
        : i18next.t(($) => $.gratitude.announcements.heartLoose),
    );
  };

  /** A reversal once the combo is shaking: a hit, which kicks the loose heart along. */
  const countReversal = (t: number, reversal: ShakeReversal) => {
    shakingUntil = t + FEEL_CONFIG.shake.resetMs;
    if (reduced) heart.jiggle();
    else heart.kickLoose(reversal.direction, reversal.strength);
    const events = combo.countShakeReversal(t);
    recorder?.shake(directionOf(reversal), events);
    handle(events, heartAt.x, heartAt.y);
  };

  const onMotion = (ax: number, ay: number, gx: number | null, t: number) => {
    clock = t;
    const view = combo.view;
    if (!running || ending || view.phase === "ended" || view.method === "stroke") return;
    const shaking = view.method === "shake";
    // With reduced motion the phone's moves leave the heart still: only a counted shake jiggles it.
    if (!shaking) {
      heart.swayWith(ax, gx);
      const accel = Math.hypot(ax, ay);
      if (accel > 1.5 && !reduced) heart.wobble(Math.min(0.1, accel * 0.005));
    }
    const reversal = shakes.addMotionSample(ax, ay, t);
    if (!reversal) return;
    if (shaking) return countReversal(t, reversal);
    if (!reduced) heart.jiggle();
    if (reversal.run >= FEEL_CONFIG.shake.keepShakingAt) showTip("shake");
    if (reversal.run >= FEEL_CONFIG.shake.cornerAt) {
      // It stays up while the shake keeps its rhythm, and comes down once the run lapses.
      background.liftCorner(0.3);
      cornerUntil = t + FEEL_CONFIG.shake.resetMs;
    }
    const { unlockAt, unlockAtMidCombo } = FEEL_CONFIG.shake;
    if (reversal.run >= (view.phase === "running" ? unlockAtMidCombo : unlockAt)) {
      unlockShake(t, reversal);
    }
  };
  const stopMotion = liveInput ? listenToPhoneMotion(onMotion) : null;

  /** The combo is over: nothing more is hinted at or held. */
  const stopHints = () => {
    hideTip();
    stroke = null;
    heart.calm();
    showSpeedField(0, strokeAngle);
    lowerCorner();
    shakingUntil = 0;
  };

  /** A touch on the heart, or a key, goes to the combo, and the replay keeps it if the combo heard it. */
  const tapHeart = (t: number, x: number, y: number) => {
    const events = combo.tapHeart(t);
    recorder?.touch(x, y, events);
    return events;
  };

  const onHeartDown = (t: number, x: number, y: number) => {
    clock = t;
    if (!running || ending) return;
    const phase = combo.view.phase;
    if (phase === "ready") heart.squash(3.6);
    else if (phase === "running") handle(tapHeart(t, x, y), x, y);
  };
  const onHeartTap = (t: number, x: number, y: number) => {
    clock = t;
    if (running && !ending && combo.view.phase === "ready") handle(tapHeart(t, x, y), x, y);
  };

  const stopTouches = liveInput
    ? listenForTouches(
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
        { onHeartDown, onHeartTap, onStrokeStart, onStrokeMove, onStrokeEnd },
      )
    : null;

  /**
   * A tap with no finger on the heart, from a key or a click, lands on the heart's middle: the first
   * tap while it's ready, a tap after that. The frames' clock keeps it on the loop's time.
   */
  const tapMiddle = () => {
    if (!running || ending) return;
    const t = frames.now();
    clock = t;
    const x = L.rest.x;
    const y = L.rest.y + 10;
    const phase = combo.view.phase;
    if (phase === "ready") heart.squash(3.6);
    if (phase === "ready" || phase === "running") handle(tapHeart(t, x, y), x, y);
  };

  // A finger, a mouse or a key on the heart makes its own taps, and the browser's click after it is
  // no second tap. A press counts from its down on the heart to `clickAfterPressMs` past its lift.
  const pressing = new Set<number | "key">();
  let pressLiftedAt = -Infinity;
  const lifted = (id: number | "key") => {
    if (pressing.delete(id)) pressLiftedAt = frames.now();
  };
  const onKey = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    pressing.add("key");
    // A held key's repeats are no taps.
    if (!e.repeat) tapMiddle();
  };
  const onKeyUp = (e: KeyboardEvent) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    e.preventDefault();
    lifted("key");
  };
  const onPointerDown = (e: PointerEvent) => {
    // A gesture starts with its primary pointer, so no press from an earlier one is still down.
    if (e.isPrimary) pressing.clear();
    pressing.add(e.pointerId);
  };
  const onPointerLift = (e: PointerEvent) => lifted(e.pointerId);
  // A key let go after focus has left the heart never reaches it.
  const onBlur = () => lifted("key");
  // Voice Control, Switch Control and screen readers tap the heart with a click alone.
  const onClick = () => {
    if (pressing.size > 0) return;
    if (frames.now() - pressLiftedAt < FEEL_CONFIG.clickAfterPressMs) return;
    tapMiddle();
  };
  // touch-action stops panning and zooming; this also keeps WebKit from bouncing the page mid-mash.
  const holdStill = (e: TouchEvent) => e.preventDefault();

  // A combo in play ends the moment the page is hidden or goes away, so its record is sent in time;
  // one that goes without either event leaves what keepInPlay last kept.
  const onHidden = () => {
    if (document.visibilityState !== "hidden") return;
    endNow(true);
  };
  const onPageHide = () => void endNow(true);
  /** Ends a combo in play, and says whether there was one. */
  const endNow = (hidden: boolean): boolean => {
    const phase = combo.view.phase;
    if (ending || phase !== "running") return false;
    const reason = hidden ? "hidden" : "closed";
    const t = frames.now();
    clock = t;
    handle(combo.endCombo(t, reason), L.rest.x, L.rest.y, hidden);
    return true;
  };

  if (liveInput) {
    button.addEventListener("keydown", onKey);
    button.addEventListener("keyup", onKeyUp);
    button.addEventListener("pointerdown", onPointerDown);
    button.addEventListener("click", onClick);
    button.addEventListener("blur", onBlur);
    // A pointer can lift anywhere: off the heart, and off the stage.
    window.addEventListener("pointerup", onPointerLift, true);
    window.addEventListener("pointercancel", onPointerLift, true);
    parts.stage.addEventListener("touchmove", holdStill, { passive: false });
    document.addEventListener("visibilitychange", onHidden);
    window.addEventListener("pagehide", onPageHide);
  }

  /** The handlers a replay's input path drives, each input at its own time. */
  const input: ComboInput = {
    get phase() {
      return combo.view.phase;
    },
    heartDown: onHeartDown,
    heartTap: onHeartTap,
    strokeStart: onStrokeStart,
    strokeMove: onStrokeMove,
    strokeEnd: onStrokeEnd,
    unlockStroke: (t, x, y) => {
      clock = t;
      if (running && !ending && combo.view.method === "tap") unlockStroke(t, x, y);
    },
    shakeReversal: (t, direction) => {
      clock = t;
      const { phase, method } = combo.view;
      if (!running || ending || phase === "ended" || method === "stroke") return;
      const reversal = {
        run: 0,
        direction: { x: direction, y: 0 },
        strength: REPLAYED_REVERSAL_STRENGTH,
      };
      if (method === "shake") countReversal(t, reversal);
      else unlockShake(t, reversal);
    },
    endAt: (t, reason) => {
      clock = t;
      if (ending || combo.view.phase !== "running") return;
      handle(combo.endCombo(t, reason), L.rest.x, L.rest.y);
    },
  };

  const fail = (error: unknown) => {
    running = false;
    cancelFrame();
    console.error("The gratitude mini-game stopped", error, combo.view);
    options.onError(error instanceof Error ? error.message : String(error));
    // No ending can play without the loop: a combo in play is recorded as it stands, and one
    // already in its ending goes on to the receipt.
    if (!liveInput) return;
    try {
      if (!ending) endNow(true);
      else if (endedRecord) finish(endedRecord);
    } catch (again) {
      console.error("Showing the receipt after the game stopped failed too", again);
    }
  };

  /** When the frame in progress began, which drawThisFrame reads, so no frame makes a closure. */
  let frameNow = 0;
  const drawThisFrame = () => drawFrame(frameNow);
  const frame = (now: number) => {
    if (!running) return;
    cancelFrame = frames.request(frame);
    frameNow = now;
    try {
      timeOurWork("gratitude", drawThisFrame);
    } catch (error) {
      fail(error);
    }
  };

  /** One frame: the combo's clock, the mini hearts, the heart, the ground and the HUD. */
  const drawFrame = (now: number) => {
    const realMs = last === null ? 16 : now - last;
    last = now;
    readout?.frame(realMs);
    const real = Math.min(0.05, realMs / 1000);
    wall += real;
    // A replay's inputs due by now go in first, each at its own time, then the rules catch up.
    replay?.drive(now, input);
    clock = now;
    const due = combo.advanceTo(now);
    if (due.length > 0) handle(due, L.rest.x, L.rest.y);
    const view = combo.view;
    if (view.phase === "running") keepInPlay(now, view.hits);
    const dt = view.frozen || now < heldUntil ? 0 : real;
    play += dt;
    for (const w of waits.filter((x) => play >= x.at)) {
      waits.splice(waits.indexOf(w), 1);
      w.resolve();
    }

    const tier = view.tier ?? 0;
    if (view.phase === "running" && tier >= 2 && !reduced) {
      sweat += FEEL_CONFIG.miniHearts.sweatPerSecond[tier] * (0.7 + 0.5 * intensity) * dt;
      for (; sweat >= 1; sweat -= 1) {
        physics.sweatFromHeart(heartBox());
        markThrow("sweat");
      }
    }
    physics.step(dt);
    miniHearts.draw(physics.hearts);

    if (flash && now >= flash.until) {
      flash = null;
      writeFace();
    }
    if (tipShown && wall > tipUntil) hideTip();
    // A shake given up: its run has lapsed, and the corner it lifted comes down.
    if (cornerUntil && now >= cornerUntil) lowerCorner();
    const shakingNow = now < shakingUntil ? "1" : "0";
    if (root.dataset.shaking !== shakingNow) root.dataset.shaking = shakingNow;

    // A thumb holding the heart, or stroking once stroke is unlocked: the heart leans to it,
    // its light follows it and a glow sits under it.
    const stroking = view.method === "stroke";
    const thumb = stroke && !ending && (stroking || stroke.onHeart) ? stroke.last : null;
    const thumbRecent = stroke !== null && now - lastMoveAt < THUMB_RECENT_MS;
    const f = heart.step(dt, real, {
      phase: view.phase,
      tier: view.tier,
      intensity,
      reduced,
      leanToward: thumb ? { x: thumb.x, degrees: stroking ? 7 : 3 } : null,
      strokeStretch: stroking && thumbRecent ? { speed: strokeSpeed, angle: strokeAngle } : null,
    });
    if (stroking) {
      const opacity = thumbRecent ? Math.min(1, strokeSpeed / 1.1) * (0.2 + 0.4 * intensity) : 0;
      showSpeedField(opacity, strokeAngle);
    }
    if (thumb) {
      thumbGlow.style.opacity = stroking ? "0.9" : "0.4";
      thumbGlow.style.transform = `translate(${thumb.x.toFixed(1)}px, ${thumb.y.toFixed(1)}px)`;
    } else if (thumbGlow.style.opacity !== "0") thumbGlow.style.opacity = "0";
    // The heart's light follows the thumb, except with reduced motion.
    if (thumb && !reduced) {
      if (now - lightAt > LIGHT_MS) {
        lightAt = now;
        lightOwned = true;
        gloss?.style.setProperty("--lx", clamp((thumb.x / size.width) * 2 - 1, -1, 1).toFixed(3));
        gloss?.style.setProperty("--ly", clamp((thumb.y / size.height) * 2 - 1, -1, 1).toFixed(3));
      }
    } else if (lightOwned) {
      lightOwned = false;
      gloss?.style.removeProperty("--lx");
      gloss?.style.removeProperty("--ly");
    }
    heartAt = { x: f.x, y: f.y, scale: f.scale };
    page.style.transform = f.page;
    anchor.style.transform = f.anchor;
    anchor.style.opacity = String(f.opacity);
    body.style.transform = f.body;
    if (face.ink && !reduced) ink?.setAttribute("data-v", String(Math.floor(wall * 12) % 3));

    background.step(real);
    // Before the first tap the bar shows, full, what the combo starts with.
    if (view.phase === "ready") {
      if (!readyDrawn) {
        readyDrawn = true;
        hud.step(real, {
          total: 0,
          hits: 0,
          multiplier: 1,
          secondsLeft: fullBarSeconds(),
          barFill: 1,
          running: false,
        });
      }
    } else {
      hud.step(real, {
        total: endTotal ?? view.total,
        hits: view.hits,
        multiplier: view.multiplier,
        secondsLeft: view.secondsLeft,
        barFill: view.barFill,
        running: view.phase === "running",
      });
    }

    // Once the receipt is up, the pile has melted and a replay's amount has counted up, nothing
    // moves: the loop sleeps.
    if (
      root.dataset.phase === "done" &&
      physics.hearts.length === 0 &&
      !readout &&
      !hud.counting()
    ) {
      running = false;
      cancelFrame();
    }
  };
  cancelFrame = frames.request(frame);

  return {
    close: () => endNow(false),
    focusHeart: () => button.focus({ preventScroll: true }),
    setReduced: (next) => {
      reduced = next;
      root.dataset.reduced = next ? "1" : "0";
    },
    destroy: () => {
      alive = false;
      running = false;
      cancelFrame();
      stopTouches?.();
      stopMotion?.();
      background.destroy();
      button.removeEventListener("keydown", onKey);
      button.removeEventListener("keyup", onKeyUp);
      button.removeEventListener("pointerdown", onPointerDown);
      button.removeEventListener("click", onClick);
      button.removeEventListener("blur", onBlur);
      window.removeEventListener("pointerup", onPointerLift, true);
      window.removeEventListener("pointercancel", onPointerLift, true);
      parts.stage.removeEventListener("touchmove", holdStill);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      resizes?.disconnect();
      readout?.destroy();
      tipAnimation?.cancel();
      tip.remove();
      lettering.clear();
      effects.tidy();
      miniHearts.release();
      // A remount (StrictMode's included) builds into the same elements, so everything built goes.
      parts.stage.replaceChildren();
      parts.hud.replaceChildren();
      ground.replaceChildren();
      page.style.transform = "";
      for (const key of ["phase", "tier", "hud", "reduced", "tip", "shaking"]) {
        delete root.dataset[key];
      }
    },
  };
}
