import type { ReplayV1 } from "@drawing-app/api/client";
import { seededRandom } from "../ui/seededRandom";
import {
  createGratitudeCombo,
  type ComboEvent,
  type ComboRecord,
  type Method,
  type Tier,
} from "./combo";
import { createComboHud } from "./comboHud";
import { EASE_OUT, EASE_SPRING, clamp } from "./easing";
import { createFrameTimeReadout } from "./frameTimeReadout";
import { FEEL_CONFIG, GAME_CONFIG } from "./gameConfig";
import { flyHeartToGiver, playAscension, sighAndTidy, type EndingParts } from "./gameEndings";
import { bigHeartLayers, HAND_SWIPE_SVG, SOUL_SVG, VIBRATE_SVG } from "./heartArt";
import { heartFaceFor, type HeartFace } from "./heartFaces";
import { createHeartMotion, type HeartLayout, type WallHit } from "./heartMotion";
import { createMiniHeartLayer } from "./miniHeartLayer";
import { createMiniHeartPhysics, type HeartBox } from "./miniHeartPhysics";
import { createParticleEffects } from "./particleEffects";
import { listenToPhoneMotion } from "./phoneMotion";
import { createReplayRecorder } from "./replayRecorder";
import { createShakeDetector, type ShakeReversal } from "./shakeDetector";
import { createStrokeDetector } from "./strokeDetector";
import { createTierBackground } from "./tierBackground";
import { TIER_NAMES } from "./tierNames";
import { createLettering } from "./tierSlamAndPopIns";
import { isOnHeart, listenForTouches, type HeartArea } from "./touchInput";

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
  /** The finished combo and its replay, before its ending plays. */
  onRecord: (record: ComboRecord, replay: ReplayV1) => void;
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

type Ended = Extract<ComboEvent, { kind: "ended" }>;

/** A hit's press, by how it was made. */
const SQUASH_BY_METHOD: Record<Method, number> = { tap: 3.3, stroke: 1.6, shake: 1.2 };

/** The screen's size when it has none yet, as in a test's DOM. */
const FALLBACK = { width: 390, height: 741 };
/** The top and the HUD sit above the heart. */
const TOP = 176;
const HUD_TOP = 172;
const HUD_HEIGHT = 80;

/** The tips: what to do, said only once the person is trying, and held this long in s. */
const TIPS = {
  stroke: { text: "Stroke it back and forth, fast", icon: HAND_SWIPE_SVG, holdS: 6 },
  shake: { text: "Keep shaking!", icon: VIBRATE_SVG, holdS: 2.4 },
};
type TipKind = keyof typeof TIPS;
/** ms a stroke finger counts as moving after its latest move. */
const THUMB_RECENT_MS = 250;
/** ms between writes of the heart's light while a thumb holds it, which the CSS glides between. */
const LIGHT_MS = 45;

let mounts = 0;

/** Cancelling an animation rejects its `finished`: browsers mark that handled, happy-dom doesn't. */
function animate(
  el: HTMLElement,
  frames: Keyframe[],
  options: KeyframeAnimationOptions,
): Animation {
  const animation = el.animate(frames, options);
  void animation.finished.catch(rethrowUnlessCancelled);
  return animation;
}

function rethrowUnlessCancelled(error: unknown) {
  if (!(error instanceof Error && error.name === "AbortError")) throw error;
}

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
  const seed = (0xa11ce + mount * 7) >>> 0;
  const random = seededRandom(seed);
  const combo = createGratitudeCombo(GAME_CONFIG);
  const { intensity } = options;
  const recorder = createReplayRecorder({ seed, intensity, ...FALLBACK });
  let reduced = options.reduced;

  // The stage's layers, back to front: the thumb's glow, speed lines, stamps, 昇天's rain, the heart,
  // mini hearts, the soul, effects, lettering.
  const layer = (className: string) => {
    const el = document.createElement("div");
    el.className = className;
    parts.stage.append(el);
    return el;
  };
  const thumbGlow = layer("gr-thumb-glow");
  const linesLayer = layer("gr-layer");
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
  body.innerHTML = `<div class="gr-heart-layers">${art.body}${art.flush}${art.pale}${art.gloss}${art.ink}${art.face}</div>`;
  const ink = body.querySelector(".h-ink");
  const button = document.createElement("button");
  button.type = "button";
  button.className = "gr-heart-btn";
  button.setAttribute("aria-label", `Send gratitude to ${options.giverHandle}`);
  body.append(button);
  anchor.append(body);

  const hud = createComboHud(parts.hud, { reduced: () => reduced, random });
  const background = createTierBackground(ground, page, () => reduced);
  const lettering = createLettering(captions, { intensity, random });
  const effects = createParticleEffects(
    { stamps: stampsLayer, effects: effectsLayer, lines: linesLayer },
    { reduced: () => reduced, random },
  );
  const miniHearts = createMiniHeartLayer({ front, behind });
  const physics = createMiniHeartPhysics({ ...FALLBACK, ceiling: TOP + HUD_HEIGHT }, random);
  const readout = options.showFrameTimes ? createFrameTimeReadout(root) : null;

  const tip = document.createElement("p");
  tip.className = "gr-tip";
  tip.setAttribute("aria-hidden", "true");
  const tipIcon = document.createElement("span");
  tipIcon.className = "gr-tip-ic";
  const tipText = document.createElement("span");
  tip.append(tipIcon, tipText);
  page.append(tip);

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
      ceiling: top - 20,
    };
  };
  let L = layoutFor(size.width, size.height);
  // A hard hit on an edge dents it and shakes the screen; from ドキドキ up it knocks mini hearts off.
  const onWallHit = (hit: WallHit) => {
    background.dent(hit.edge, hit.edge === "top" || hit.edge === "bottom" ? hit.x : hit.y);
    heart.shake(Math.min(5, hit.speed / 260) * (0.4 + intensity * 0.6));
    if ((combo.view.tier ?? 0) >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
      const { normal } = hit;
      const from = { x: hit.x + normal.x * 10, y: hit.y + normal.y * 10 };
      physics.knockOffWall(from.x, from.y, normal, hit.speed, throwCount());
    } else if (random() < 0.6) effects.burst(2, hit);
  };
  const heart = createHeartMotion(L, random, onWallHit);
  const applyLayout = () => {
    size = {
      width: root.clientWidth || FALLBACK.width,
      height: root.clientHeight || FALLBACK.height,
    };
    recorder.resize(size.width, size.height);
    const box = root.getBoundingClientRect();
    rect = { left: box.left, top: box.top, scale: box.width / size.width || 1 };
    L = layoutFor(size.width, size.height);
    heart.setLayout(L);
    body.style.width = `${L.width}px`;
    parts.hud.style.setProperty("--hud-top", `${HUD_TOP}px`);
    hint.style.top = `${L.rest.y + L.height * 0.5 + 22}px`;
    tip.style.top = `${L.rest.y + L.height * 0.5 + 16}px`;
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
  const heartArea = (): HeartArea => ({
    cx: L.rest.x,
    cy: L.rest.y,
    width: L.width,
    height: L.height,
  });
  /** Where the heart was last drawn. */
  let heartAt = { ...L.rest };
  const say = (text: string) => {
    live.textContent = text;
  };

  root.dataset.phase = "ready";
  root.dataset.tier = "";
  root.dataset.hud = "off";
  root.dataset.reduced = reduced ? "1" : "0";

  let face = heartFaceFor(null, intensity, 0);
  let forced: Partial<HeartFace> | null = null;
  /** A face shown for a moment over the tier's, until performance.now() passes `until`. */
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
    heartPoint: () => heartAt,
    screenWidth: () => size.width,
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

  async function end(ended: Ended, hidden: boolean) {
    const { record, caught } = ended;
    ending = true;
    stopHints();
    root.dataset.phase = "ending";
    try {
      options.onRecord(record, recorder.finish(ended));
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
    // A stroke or shake that starts the combo announces itself.
    if (combo.view.method === "tap") say("Caught it. Keep tapping before the bar runs out.");
  };

  const onTierUp = (tier: Tier) => {
    root.dataset.tier = String(tier);
    background.show(tier, intensity, combo.view.method);
    if (!reduced) heart.punch(0.035 * (0.6 + intensity));
    lettering.slamTierName(TIER_NAMES[tier].jp, TIER_NAMES[tier].en);
    if (tier === 2) effects.burst(5, L.rest);
  };

  /** Mini hearts a spray, a fling or a knock throws: more as the multiplier climbs. */
  const throwCount = () => Math.min(3, 1 + Math.floor((combo.view.multiplier - 1) / 3));

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
      lettering.showPopInWord(!tapped && random() < 0.3 ? method : tier, box);
    }
    if (tier === 0 && hits % 2 === 0) effects.glint(box);
    if (tier === 1 && hits % 4 === 0) effects.bead(box);
    if (tier >= 2 && !reduced) heart.shake(tier >= 3 ? 5 * intensity : 2 * intensity);
    if (tier === 2 && hits % 5 === 0) effects.burst(2, L.rest);
    if (tier >= 3 && hits % 2 === 0) effects.steam(Math.max(1, Math.round(intensity * 2)), box);
    if (tier >= 3 && hits % 2 === 1 && method !== "stroke") physics.rainFromTop();
    if (tapped && !reduced && physics.hearts.length > 0) physics.shoveAwayFrom(x, y);
    if (tapped && tier >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
      physics.sprayFromTap(x, y, box, throwCount());
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
    const fresh = tipShown !== kind;
    tipShown = kind;
    tipUntil = wall + TIPS[kind].holdS;
    if (fresh) {
      tipIcon.innerHTML = TIPS[kind].icon;
      tipText.textContent = TIPS[kind].text;
      tip.dataset.kind = kind;
      root.dataset.tip = "on";
      say(TIPS[kind].text);
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
  // pulls it and counts as a try; five fast passes in a row commit the combo to stroking.
  const strokes = createStrokeDetector(FEEL_CONFIG.stroke);
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
  /** The thumb's smoothed speed in px/ms, and the stroke's axis in degrees. */
  let strokeSpeed = 0;
  let strokeAngle = 90;
  let lastMoveAt = -Infinity;
  let lastLinesAt = -Infinity;
  let lightAt = -Infinity;
  let lightOwned = false;

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
    // The combo's own look first, so the unlock's slam is the one that shows.
    handle(events, x, y);
    background.show(combo.view.tier, intensity, "stroke");
    lettering.slamTierName("!?", "");
    flash = { face: "wide", until: performance.now() + 700 };
    writeFace();
    if (!reduced) heart.punch(0.05);
    endingParts.freeze(80);
    say("Stroke unlocked.");
  };

  const onStrokeStart = (t: number, x: number, y: number) => {
    if (!running || ending || combo.view.method === "shake") return;
    strokes.fingerDown(x, y, t);
    recorder.strokeStart(t, x, y);
    stroke = {
      onHeart: isOnHeart(x, y, heartArea()),
      from: { x, y },
      last: { x, y },
      travel: 0,
      samples: [{ x, y, t }],
      runFrom: { x, y },
    };
  };

  const onStrokeMove = (t: number, x: number, y: number) => {
    const s = stroke;
    if (!s || !running || ending || combo.view.method === "shake") return;
    s.travel += Math.hypot(x - s.last.x, y - s.last.y);
    s.last = { x, y };
    lastMoveAt = t;
    s.samples.push({ x, y, t });
    while (s.samples.length > 3 && t - s.samples[0].t > 180) s.samples.shift();
    const v = velocity(s.samples);
    strokeSpeed += (v.speed - strokeSpeed) * 0.35;
    const pass = strokes.fingerMove(x, y, t);
    recorder.strokeMove(t, x, y, pass?.fast === true);
    if (pass) s.runFrom = pass.end;
    // The stretch and the speed field follow the run, at any angle.
    const rx = x - s.runFrom.x;
    const ry = y - s.runFrom.y;
    if (Math.hypot(rx, ry) > 10) strokeAngle = (Math.atan2(ry, rx) * 180) / Math.PI;
    else if (v.speed > 0.05) strokeAngle = (Math.atan2(v.y, v.x) * 180) / Math.PI;

    if (combo.view.method === "stroke") {
      effects.streamLines(x, y, v);
      if (!pass?.fast) return;
      handle(combo.countStrokePass(t), x, y);
      const tier = combo.view.tier ?? 0;
      if (tier >= FEEL_CONFIG.miniHearts.fromTier && !reduced) {
        physics.flingAlongStroke(pass, throwCount());
      }
      return;
    }
    if (s.onHeart) {
      const dx = x - s.from.x;
      const dy = y - s.from.y;
      const d = Math.hypot(dx, dy);
      heart.pullTo(d, d > 8 ? (Math.atan2(dy, dx) * 180) / Math.PI : null);
      // A hard or fast drag throws speed lines.
      const fast = v.speed > 0.9;
      if ((fast || d > 100) && !reduced && t - lastLinesAt > (fast ? 50 : 90)) {
        lastLinesAt = t;
        effects.streamLines(x, y, fast ? v : { x: dx / d, y: dy / d, speed: 0.9 });
      }
      // Trying again: the tip stays.
      if (tipShown === "stroke") tipUntil = Math.max(tipUntil, wall + 4);
    }
    if (pass?.fast && pass.fastStreak >= FEEL_CONFIG.stroke.unlockPasses) unlockStroke(t, x, y);
  };

  const onStrokeEnd = () => {
    const s = stroke;
    stroke = null;
    strokes.fingerUp();
    recorder.strokeEnd();
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
  /** performance.now() until which the shake marks show. */
  let shakingUntil = 0;

  /** The way a reversal went along its axis: 1 or −1. */
  const directionOf = (reversal: ShakeReversal) => reversal.direction.x || reversal.direction.y;

  const unlockShake = (t: number, reversal: ShakeReversal) => {
    const events = combo.commitTo("shake", t);
    recorder.shake(directionOf(reversal), events);
    // No hit: the combo had already ended, and that end still plays.
    if (!events.some((e) => e.kind === "hit")) return handle(events, heartAt.x, heartAt.y);
    hideTip();
    background.liftCorner(0);
    shakingUntil = t + FEEL_CONFIG.shake.resetMs;
    // The combo's own look first, so the unlock's slam is the one that shows.
    handle(events, heartAt.x, heartAt.y);
    if (!reduced) {
      heart.comeLoose();
      heart.kickLoose(reversal.direction, reversal.strength);
    }
    lettering.slamTierName("ポンッ", "*pop*");
    flash = { face: "wide", until: performance.now() + 600 };
    writeFace();
    effects.burst(8, heartAt);
    say("The heart is loose.");
  };

  const onMotion = (ax: number, ay: number, gx: number | null, t: number) => {
    const view = combo.view;
    if (!running || ending || view.phase === "ended" || view.method === "stroke") return;
    const shaking = view.method === "shake";
    if (!shaking) {
      heart.swayWith(ax, gx);
      const size = Math.hypot(ax, ay);
      if (size > 1.5) heart.wobble(Math.min(0.1, size * 0.005));
    }
    const reversal = shakes.addMotionSample(ax, ay, t);
    if (!reversal) return;
    if (shaking) {
      shakingUntil = t + FEEL_CONFIG.shake.resetMs;
      if (reduced) heart.jiggle();
      else heart.kickLoose(reversal.direction, reversal.strength);
      const events = combo.countShakeReversal(t);
      recorder.shake(directionOf(reversal), events);
      handle(events, heartAt.x, heartAt.y);
      return;
    }
    heart.jiggle();
    if (reversal.run >= FEEL_CONFIG.shake.keepShakingAt) showTip("shake");
    if (reversal.run >= FEEL_CONFIG.shake.cornerAt) background.liftCorner(0.3);
    if (reversal.run >= FEEL_CONFIG.shake.unlockAt) unlockShake(t, reversal);
  };
  const stopMotion = listenToPhoneMotion(onMotion);

  /** The combo is over: nothing more is hinted at or held. */
  const stopHints = () => {
    hideTip();
    stroke = null;
    heart.calm();
    background.setSpeedField(0, strokeAngle);
    background.liftCorner(0);
    shakingUntil = 0;
  };

  /** A touch on the heart, or a key, goes to the combo, and the replay keeps it if the combo heard it. */
  const tapHeart = (t: number, x: number, y: number) => {
    const events = combo.tapHeart(t);
    recorder.touch(x, y, events);
    return events;
  };

  const firstTap = (t: number, x: number, y: number) => {
    const events = tapHeart(t, x, y);
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
        else if (phase === "sending" || phase === "running") handle(tapHeart(t, x, y), x, y);
      },
      onHeartTap: (t, x, y) => {
        if (running && !ending && combo.view.phase === "ready") firstTap(t, x, y);
      },
      onStrokeStart,
      onStrokeMove,
      onStrokeEnd,
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
      handle(tapHeart(performance.now(), x, y), x, y);
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
    const reason = hidden ? "hidden" : "closed";
    handle(combo.endCombo(performance.now(), reason), L.rest.x, L.rest.y, hidden);
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
        view.phase === "sending" ? Math.min(1, (now - sendingSince) / FEEL_CONFIG.windUpMs) : 0;
      if (flash && now >= flash.until) {
        flash = null;
        writeFace();
      }
      if (tipShown && wall > tipUntil) hideTip();
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
        sendingProgress,
        leanToward: thumb ? { x: thumb.x, degrees: stroking ? 7 : 3 } : null,
        strokeStretch: stroking && thumbRecent ? { speed: strokeSpeed, angle: strokeAngle } : null,
      });
      if (stroking) {
        const field = thumbRecent ? Math.min(1, strokeSpeed / 1.1) * (0.2 + 0.4 * intensity) : 0;
        background.setSpeedField(field, strokeAngle);
      }
      if (thumb) {
        thumbGlow.style.opacity = stroking ? "0.9" : "0.4";
        thumbGlow.style.transform = `translate(${thumb.x.toFixed(1)}px, ${thumb.y.toFixed(1)}px)`;
        if (now - lightAt > LIGHT_MS) {
          lightAt = now;
          lightOwned = true;
          root.style.setProperty("--lx", clamp((thumb.x / size.width) * 2 - 1, -1, 1).toFixed(3));
          root.style.setProperty("--ly", clamp((thumb.y / size.height) * 2 - 1, -1, 1).toFixed(3));
        }
      } else {
        if (thumbGlow.style.opacity !== "0") thumbGlow.style.opacity = "0";
        if (lightOwned) {
          lightOwned = false;
          root.style.removeProperty("--lx");
          root.style.removeProperty("--ly");
        }
      }
      heartAt = f;
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
      stopMotion();
      background.destroy();
      button.removeEventListener("keydown", onKey);
      parts.stage.removeEventListener("touchmove", holdStill);
      document.removeEventListener("visibilitychange", onHidden);
      window.removeEventListener("pagehide", onPageHide);
      resizes?.disconnect();
      readout?.destroy();
      tipAnimation?.cancel();
      tip.remove();
      root.style.removeProperty("--lx");
      root.style.removeProperty("--ly");
      lettering.clear();
      effects.tidy();
      miniHearts.clear();
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
