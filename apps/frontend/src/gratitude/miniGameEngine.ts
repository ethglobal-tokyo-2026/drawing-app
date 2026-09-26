import { seededRandom } from "../ui/seededRandom";
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
  body.innerHTML = `<div class="gr-heart-layers">${art.body}${art.flush}${art.pale}${art.gloss}${art.ink}${art.face}</div>`;
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
        view.phase === "sending" ? Math.min(1, (now - sendingSince) / FEEL_CONFIG.windUpMs) : 0;
      const f = heart.step(dt, real, {
        phase: view.phase,
        tier: view.tier,
        intensity,
        reduced,
        sendingProgress,
      });
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
