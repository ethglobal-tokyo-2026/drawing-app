import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type RefCallback,
  type RefObject,
} from "react";
import { flushSync } from "react-dom";
import { apiError } from "../../api/apiClient";
import { useApi } from "../../api/useApi";
import { sheenIn, sweepSheen } from "../../stickers/resinSheen";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import type { BoardSticker } from "../boardSticker";
import {
  createTimelapsePlayer,
  type TimelapsePlayer,
  type TimelapsePlayerOptions,
} from "./timelapsePlayer";

/** The finished ink holds this long before the real sticker shows through it. */
export const HOLD_MS = 300;
/** Then the layer fades out over this long, revealing the sticker's resin, */
export const FADE_MS = 400;
/** or over this long under reduced motion, with no sheen. */
export const REDUCED_FADE_MS = 150;
/** The sheen that sweeps the sticker once it's back, as when it's sealed. */
const SHEEN_MS = 640;

export type TimelapsePhase = "idle" | "loading" | "preparing" | "playing" | "ending";
export type TimelapseSticker = Pick<BoardSticker, "id" | "no" | "width" | "height" | "urls">;
export type CreateTimelapsePlayer = (options: TimelapsePlayerOptions) => TimelapsePlayer;

interface Options {
  /** The sticker the detail shows. */
  sticker: TimelapseSticker | undefined;
  /** Whether it was sealed with its timelapse, from the detail's answer. */
  hasTimelapse: boolean;
  /** Its figure: the ink covers its box, and its resin sheens at the end. */
  figure: RefObject<HTMLElement | null>;
  reduced: boolean;
  createPlayer?: CreateTimelapsePlayer;
  frames?: FrameSource;
}

/** What the button, the layer and the failure line show. */
interface View {
  /** The sticker it's for: another sticker shows none of it. */
  stickerId: string | null;
  phase: TimelapsePhase;
  failure: Error | null;
  /** What the live line last said. */
  said: "playing" | "done" | null;
}

const IDLE: View = { stickerId: null, phase: "idle", failure: null, said: null };

/** One press's run, from loading to the reveal. */
interface Session {
  stickerId: string;
  player: TimelapsePlayer | null;
  /** The player's canvas, kept here since paging detaches the layer's refs before the session ends. */
  canvas: HTMLCanvasElement | null;
  over: boolean;
  /** Withdraws the ending's next frame. */
  cancelFrame: () => void;
}

export interface Timelapse {
  /** The shown sticker, while it has a timelapse to play; null shows no button. */
  sticker: TimelapseSticker | null;
  phase: TimelapsePhase;
  failure: Error | null;
  said: View["said"];
  /** The button: plays from idle, skips while it plays. */
  press: () => void;
  /** A tap on the sticker: skips while it plays. */
  skip: () => void;
  /** Try again, from the failure line: focus goes back to the button. */
  retry: () => void;
  /** Ends it at once; the layer hides before anything else reads the page. */
  stop: () => void;
  /** Where the button, the layer and its canvas attach. */
  attach: {
    button: RefCallback<HTMLButtonElement>;
    layer: RefCallback<HTMLDivElement>;
    canvas: RefCallback<HTMLCanvasElement>;
  };
}

/** The layer's opacity `elapsed` ms into the ending: held, then faded out on an ease-out. */
const endingOpacity = (elapsed: number, fadeMs: number) =>
  elapsed <= HOLD_MS ? 1 : (1 - Math.min(1, (elapsed - HOLD_MS) / fadeMs)) ** 3;

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

/**
 * The sticker detail's timelapse. A press loads the sticker's timelapse, prepares its fills and plays
 * its ink on a layer over the figure; the finished ink holds, the layer fades to the real sticker and
 * its sheen sweeps. `stop` ends it at once.
 */
export function useTimelapse({
  sticker,
  hasTimelapse,
  figure,
  reduced,
  createPlayer = createTimelapsePlayer,
  frames = browserFrames,
}: Options): Timelapse {
  const api = useApi();
  const [view, setView] = useState<View>(IDLE);
  const session = useRef<Session | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [attach] = useState(() => ({
    button: (el: HTMLButtonElement | null) => {
      button.current = el;
    },
    layer: (el: HTMLDivElement | null) => {
      layer.current = el;
    },
    canvas: (el: HTMLCanvasElement | null) => {
      canvas.current = el;
    },
  }));
  // Read when each step starts, so reduced motion turned on mid-play shapes the ending.
  const latest = useRef({ reduced, createPlayer, frames });
  useLayoutEffect(() => {
    latest.current = { reduced, createPlayer, frames };
  });
  // A playing player hears it too: the fills still to come show whole.
  useEffect(() => {
    session.current?.player?.setReduced(reduced);
  }, [reduced]);

  // Every sticker sealed with a timelapse has a mask, which the layer is cut to.
  const shown = sticker && hasTimelapse && sticker.urls.mask ? sticker : null;
  const current = shown && view.stickerId === shown.id ? view : IDLE;

  const end = (s: Session, next: View) => {
    if (session.current !== s) return;
    session.current = null;
    s.over = true;
    s.cancelFrame();
    if (layer.current) layer.current.style.visibility = "hidden";
    s.player?.stop();
    const ink = s.canvas;
    if (ink) {
      // iOS counts canvases against a small budget until they're collected, so this one goes now.
      ink.width = 0;
      ink.height = 0;
    }
    setView(next);
  };

  const finish = (s: Session, sheen: boolean) => {
    const band = sheen && figure.current ? sheenIn(figure.current) : null;
    if (band) sweepSheen(band, SHEEN_MS);
    end(s, { stickerId: s.stickerId, phase: "idle", failure: null, said: "done" });
  };

  const reveal = (s: Session) => {
    setView((v) => ({ ...v, phase: "ending" }));
    const { reduced: still, frames: clock } = latest.current;
    const fadeMs = still ? REDUCED_FADE_MS : FADE_MS;
    const from = clock.now();
    const frame = (t: number) => {
      const elapsed = t - from;
      if (layer.current) layer.current.style.opacity = String(endingOpacity(elapsed, fadeMs));
      if (elapsed < HOLD_MS + fadeMs) s.cancelFrame = clock.request(frame);
      else finish(s, !still);
    };
    s.cancelFrame = clock.request(frame);
  };

  const run = async (s: Session, target: TimelapseSticker) => {
    try {
      const timelapse = await api.timelapse(target.id).catch((error: unknown) => {
        throw apiError(error);
      });
      if (s.over) return;
      // The player takes the layer's canvas, so the layer goes into the page first, unseen.
      flushSync(() => setView((v) => ({ ...v, phase: "preparing" })));
      const ink = canvas.current;
      const box = figure.current;
      if (!ink || !box) throw new Error("The timelapse's layer or the sticker's figure is gone");
      const { reduced: still, createPlayer: create, frames: clock } = latest.current;
      s.canvas = ink;
      s.player = create({
        timelapse,
        canvas: ink,
        box: { width: box.offsetWidth, height: box.offsetHeight },
        image: { width: target.width, height: target.height },
        reduced: still,
        frames: clock,
      });
      await s.player.prepare();
      if (s.over) return;
      setView((v) => ({ ...v, phase: "playing", said: "playing" }));
      if ((await s.player.play()) === "stopped" || s.over) return;
      reveal(s);
    } catch (error) {
      if (s.over) return;
      console.error(`Sticker ${target.id}'s timelapse couldn't play`, error);
      end(s, { stickerId: target.id, phase: "idle", failure: toError(error), said: null });
    }
  };

  const start = () => {
    if (!shown || session.current) return;
    const s: Session = {
      stickerId: shown.id,
      player: null,
      canvas: null,
      over: false,
      cancelFrame: () => {},
    };
    session.current = s;
    setView({ stickerId: shown.id, phase: "loading", failure: null, said: null });
    void run(s, shown);
  };

  const skip = () => {
    const s = session.current;
    if (!s) return;
    if (current.phase === "playing") s.player?.skip();
    else if (current.phase === "ending") finish(s, false);
  };

  const stop = () => {
    if (session.current) end(session.current, IDLE);
    else setView(IDLE);
  };

  // Paging to another sticker, or the detail going, ends it before the next paint.
  const leave = useEffectEvent(stop);
  const shownId = sticker?.id;
  useLayoutEffect(() => () => leave(), [shownId]);

  return {
    sticker: shown,
    phase: current.phase,
    failure: current.failure,
    said: current.said,
    press: () => (current.phase === "idle" ? start() : skip()),
    skip,
    retry: () => {
      button.current?.focus();
      start();
    },
    stop,
    attach,
  };
}
