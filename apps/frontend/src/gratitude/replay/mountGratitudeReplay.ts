import type { Gratitude, ReplayV1 } from "@drawing-app/api/client";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import type { ComboRecord } from "../combo";
import { createFrameTimeReadout } from "../frameTimeReadout";
import { GAME_CONFIG } from "../gameConfig";
import { readMiniGameDemoSettings } from "../miniGameDemoSettings";
import { LIVE_STAGE_WIDTH, mountReplayEngine, type StageLayout } from "../miniGameEngine";
import { heartRest, LIVE_FRAME } from "../stageLayout";
import { createReplayClock } from "./replayClock";
import { createReplayFeed, replaySpeed } from "./replayFeed";
import { createReplayDriver } from "./replayInput";
import "../gratitude-mini-game.css";

export interface GratitudeReplayOptions {
  replay: ReplayV1;
  /** The stored combo: the replay ends on its figures, whatever the replay's own count comes to. */
  gratitude: Pick<
    Gratitude,
    "giftId" | "method" | "hits" | "total" | "peakTier" | "gameConfigVersion"
  >;
  /** Where the heart lands at the end, px in the host's box; null lands where it rests. */
  landAt: () => { x: number; y: number } | null;
  reduced: boolean;
  frames?: FrameSource;
}

export interface GratitudeReplayHandle {
  /** "landed" once the landing has played, "stopped" if stopped first; rejects if the frame loop fails. */
  finished: Promise<"landed" | "stopped">;
  stop: () => void;
  setReduced: (reduced: boolean) => void;
}

/** A replay's stage: its HUD along the top, as the drafts' inline replay has it, and a card's size until it has one. */
const REPLAY_LAYOUT: StageLayout = {
  frame: { above: 64 },
  hudTop: 10,
  fallback: { width: 268, height: 300 },
};
/** Mini hearts in play at most on a card's small stage. */
const REPLAY_MINI_HEARTS = 40;
/** The combo's first hit comes this far into the replay's clock, ms: the heart rests a moment first. */
const LEAD_IN_MS = 250;

/** The stored figures win: a replay that counts differently ends on the stored total, and says so. */
function storedTotal(record: ComboRecord, stored: GratitudeReplayOptions["gratitude"]) {
  const { total, hits, peakTier } = stored;
  if (record.total !== total || record.hits !== hits || record.peakTier !== peakTier) {
    console.warn(
      `Gift ${stored.giftId}'s replay counted ${record.total} gratitude in ${record.hits} hits, tier ${record.peakTier}; its record says ${total} in ${hits}, tier ${peakTier}, which the replay ends on`,
    );
  }
  return total;
}

function part(parent: HTMLElement, className: string) {
  const el = document.createElement("div");
  el.className = className;
  parent.append(el);
  return el;
}

/**
 * Builds the replay's stage inside `host`, sized to it, and plays the combo once. `createFeed` turns
 * the replay into its inputs; a test passes its own.
 */
export function mountGratitudeReplay(
  host: HTMLElement,
  options: GratitudeReplayOptions,
  createFeed: typeof createReplayFeed = createReplayFeed,
): GratitudeReplayHandle {
  const { replay, gratitude } = options;
  if (gratitude.gameConfigVersion !== GAME_CONFIG.version) {
    console.warn(
      `Gift ${gratitude.giftId}'s combo was played under game config ${gratitude.gameConfigVersion}; it replays under ${GAME_CONFIG.version}`,
    );
  }
  const root = part(host, "gr");
  root.dataset.mode = "replay";
  // The card says what plays, in its own live line; the stage is for the eyes.
  root.setAttribute("aria-hidden", "true");
  const page = part(root, "gr-page");
  const ground = part(page, "gr-ground");
  const hud = part(page, "gr-hud");
  const stage = part(page, "gr-stage");

  const width = root.clientWidth || REPLAY_LAYOUT.fallback.width;
  const height = root.clientHeight || REPLAY_LAYOUT.fallback.height;
  const scale = width / LIVE_STAGE_WIDTH;
  root.style.setProperty("--gr-scale", scale.toFixed(3));
  const heart = heartRest(width, height, REPLAY_LAYOUT.frame);
  const feed = createFeed(replay, {
    x: heart.x,
    y: heart.y,
    width: heart.width,
    height: heart.height,
  });
  // The feed places each input by the heart, so the recording's strokes shrink as its heart does.
  const recorded = heartRest(replay.stage[0], replay.stage[1], LIVE_FRAME);
  const speed = replaySpeed(replay.durationMs);
  const readout = readMiniGameDemoSettings().showFrameTimes ? createFrameTimeReadout(root) : null;
  const clock = createReplayClock(
    options.frames ?? browserFrames,
    speed,
    readout ? (ms) => readout.frame(ms) : undefined,
  );

  let settle: (how: "landed" | "stopped") => void = () => {};
  let fail: (error: Error) => void = () => {};
  const finished = new Promise<"landed" | "stopped">((resolve, reject) => {
    settle = resolve;
    fail = reject;
  });

  const engine = mountReplayEngine(
    { root, page, ground, hud, stage },
    {
      seed: replay.seed,
      intensity: replay.intensity,
      reduced: options.reduced,
      frames: clock,
      speed,
      layout: REPLAY_LAYOUT,
      scale,
      inputScale: heart.width / recorded.width,
      miniHearts: REPLAY_MINI_HEARTS,
      landAt: options.landAt,
      drive: createReplayDriver(feed, {
        firstHitAt: LEAD_IN_MS,
        startsWithStroke: gratitude.method === "stroke" && replay.switchedAtHit === 0,
      }),
      onEnded: (record) => storedTotal(record, gratitude),
      onLanded: () => settle("landed"),
      onError: (message) =>
        fail(new Error(`The replay of gift ${gratitude.giftId}'s gratitude stopped: ${message}`)),
    },
  );

  // Off screen nothing plays: the clock holds until the stage shows again.
  const visibility =
    typeof IntersectionObserver === "function"
      ? new IntersectionObserver((entries) => {
          if (entries.at(-1)?.isIntersecting ?? true) clock.resume();
          else clock.pause();
        })
      : null;
  visibility?.observe(root);

  let stopped = false;
  return {
    finished,
    stop: () => {
      if (stopped) return;
      stopped = true;
      visibility?.disconnect();
      engine.destroy();
      readout?.destroy();
      root.remove();
      settle("stopped");
    },
    setReduced: (reduced) => engine.setReduced(reduced),
  };
}
