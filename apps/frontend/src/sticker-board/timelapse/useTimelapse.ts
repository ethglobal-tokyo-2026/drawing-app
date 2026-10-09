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
import { clamp01, easeInOutSine, easeOutCubic } from "../../ui/easing";
import { browserFrames, type FrameSource } from "../../ui/frameSource";
import type { BoardSticker } from "../boardSticker";
import {
  figureTransform,
  playsInSpot,
  type FigureTransform,
  type TimelapseLayout,
} from "./timelapseFrame";
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
/** The sticker's flight from its spot onto the sheet it was drawn on, as the timelapse starts. */
export const FLIGHT_MS = 400;
/** The sticker fades out of, or back into, its ink on the sheet over this long. */
export const LAND_MS = 160;
/** Its flight back to its spot, peeled off the sheet, which fades out under it. */
export const PEEL_MS = 520;
/** How far it overshoots its own size before it sticks, as every sticker does. */
const STICK_SCALE = 1.06;
/** The sheen that sweeps the sticker once it's back, as when it's sealed. */
const SHEEN_MS = 640;

const IN_SPOT: FigureTransform = { x: 0, y: 0, scale: 1 };

const between = (a: FigureTransform, b: FigureTransform, p: number): FigureTransform => ({
  x: a.x + (b.x - a.x) * p,
  y: a.y + (b.y - a.y) * p,
  scale: a.scale + (b.scale - a.scale) * p,
});

const transformFigure = (el: HTMLElement, { x, y, scale }: FigureTransform) => {
  el.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
};

/** The settle it sticks with: up to STICK_SCALE by 70% of the way, back to its own size at the end. */
const stickAt = (u: number) =>
  1 + (STICK_SCALE - 1) * (u < 0.7 ? easeOutCubic(u / 0.7) : 1 - easeInOutSine((u - 0.7) / 0.3));

/** The flight back at `u`, 0 to 1: from its place on the sheet to its spot, settling about its middle. */
function homeward(from: FigureTransform, u: number, size: { w: number; h: number }) {
  const at = between(from, IN_SPOT, easeOutCubic(u));
  const grow = stickAt(u);
  return {
    x: at.x - ((grow - 1) * at.scale * size.w) / 2,
    y: at.y - ((grow - 1) * at.scale * size.h) / 2,
    scale: at.scale * grow,
  };
}

/** The figure as the detail shows it, whatever the timelapse did to it. */
function figureBack(el: HTMLElement | null) {
  for (const property of ["transform", "transform-origin", "opacity", "z-index"])
    el?.style.removeProperty(property);
}

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
  /** The sticker was drawn in Kyoto Seika Manga Expression Practice Mode: its timelapse may play longer. */
  kyotoSeika: boolean;
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
  /** The sticker's figure, which flies onto the sheet and back. */
  figure: HTMLElement | null;
  /** Where the figure sits on the playing sheet; null when it plays in its spot. */
  flight: FigureTransform | null;
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
  /** Where the button, the layer, its paper and its canvas attach. */
  attach: {
    button: RefCallback<HTMLButtonElement>;
    layer: RefCallback<HTMLDivElement>;
    paper: RefCallback<HTMLSpanElement>;
    canvas: RefCallback<HTMLCanvasElement>;
  };
}

/** The layer's opacity `elapsed` ms into the ending: held, then faded out on an ease-out. */
const endingOpacity = (elapsed: number, fadeMs: number) =>
  elapsed <= HOLD_MS ? 1 : (1 - Math.min(1, (elapsed - HOLD_MS) / fadeMs)) ** 3;

const toError = (error: unknown) => (error instanceof Error ? error : new Error(String(error)));

/**
 * The sticker detail's timelapse. A press loads the sticker's timelapse and prepares its fills; the
 * sticker flies onto the sheet it was drawn on, which plays from blank on a layer over the stage; the
 * finished sheet holds, the sticker peels off it back to its spot as the sheet fades, and its sheen
 * sweeps. `stop` ends it at once.
 */
export function useTimelapse({
  sticker,
  hasTimelapse,
  figure,
  reduced,
  kyotoSeika,
  createPlayer = createTimelapsePlayer,
  frames = browserFrames,
}: Options): Timelapse {
  const api = useApi();
  const [view, setView] = useState<View>(IDLE);
  const session = useRef<Session | null>(null);
  const button = useRef<HTMLButtonElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const paper = useRef<HTMLSpanElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [attach] = useState(() => ({
    button: (el: HTMLButtonElement | null) => {
      button.current = el;
    },
    layer: (el: HTMLDivElement | null) => {
      layer.current = el;
    },
    paper: (el: HTMLSpanElement | null) => {
      paper.current = el;
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

  const shown = sticker && hasTimelapse ? sticker : null;
  const current = shown && view.stickerId === shown.id ? view : IDLE;

  const end = (s: Session, next: View) => {
    if (session.current !== s) return;
    session.current = null;
    s.over = true;
    s.cancelFrame();
    if (layer.current) layer.current.style.visibility = "hidden";
    figureBack(s.figure);
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

  /** Runs `step` each frame with how far through `ms` it is, then resolves; never, once it ends. */
  const animate = (s: Session, ms: number, step: (u: number) => void) =>
    new Promise<void>((resolve) => {
      const { frames: clock } = latest.current;
      s.cancelFrame();
      const from = clock.now();
      const frame = (t: number) => {
        const u = clamp01((t - from) / ms);
        step(u);
        if (u < 1) s.cancelFrame = clock.request(frame);
        else resolve();
      };
      s.cancelFrame = clock.request(frame);
    });

  /** The paper: the part of the sheet that was drawn on, where the layout plays it. */
  const lay = (layout: TimelapseLayout) => {
    const el = paper.current;
    if (!el) return;
    const { frame, playing } = layout;
    el.style.left = `${playing.left + frame.x * playing.scale}px`;
    el.style.top = `${playing.top + frame.y * playing.scale}px`;
    el.style.width = `${frame.w * playing.scale}px`;
    el.style.height = `${frame.h * playing.scale}px`;
  };

  /**
   * The finished sheet holds; then the sticker comes up over its ink and peels off back to its spot,
   * settling as it sticks, while the sheet fades under it. In its spot, or under reduced motion, the
   * sheet fades off the sticker where it is.
   */
  const reveal = (s: Session) => {
    setView((v) => ({ ...v, phase: "ending" }));
    const { reduced: still, frames: clock } = latest.current;
    const box = s.figure;
    const flight = still ? null : s.flight;
    if (!flight) figureBack(box);
    const size = { w: box?.offsetWidth ?? 0, h: box?.offsetHeight ?? 0 };
    const fadeMs = still ? REDUCED_FADE_MS : FADE_MS;
    const total = HOLD_MS + (flight ? LAND_MS + PEEL_MS : fadeMs);
    s.cancelFrame();
    const from = clock.now();
    const frame = (t: number) => {
      const elapsed = t - from;
      const sheet = layer.current;
      if (flight && box) {
        const peel = clamp01((elapsed - HOLD_MS - LAND_MS) / PEEL_MS);
        box.style.opacity = String(clamp01((elapsed - HOLD_MS) / LAND_MS));
        transformFigure(box, homeward(flight, peel, size));
        if (sheet) sheet.style.opacity = String(1 - easeOutCubic(peel));
      } else if (sheet) sheet.style.opacity = String(endingOpacity(elapsed, fadeMs));
      if (elapsed < total) s.cancelFrame = clock.request(frame);
      else finish(s, !still);
    };
    s.cancelFrame = clock.request(frame);
  };

  /**
   * The paper comes up and the sticker flies from its spot onto its place on it, then fades into the
   * blank sheet as the first strokes land. One that plays in its spot stays under the paper.
   */
  const takeOff = async (s: Session, layout: TimelapseLayout) => {
    lay(layout);
    setView((v) => ({ ...v, phase: "playing", said: "playing" }));
    const box = s.figure;
    const flight = s.flight;
    if (!box || !flight || latest.current.reduced) return;
    box.style.transformOrigin = "0 0";
    box.style.zIndex = "1";
    await animate(s, FLIGHT_MS, (u) =>
      transformFigure(box, between(IN_SPOT, flight, easeOutCubic(u))),
    );
    void animate(s, LAND_MS, (u) => {
      box.style.opacity = String(1 - u);
    });
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
      const stage = layer.current;
      const box = figure.current;
      if (!ink || !stage || !box)
        throw new Error("The timelapse's layer or the sticker's figure is gone");
      const { reduced: still, createPlayer: create, frames: clock } = latest.current;
      s.canvas = ink;
      s.figure = box;
      // The layer covers the stage, so the figure's offset is its place on the stage.
      const figureBox = {
        x: box.offsetLeft,
        y: box.offsetTop,
        w: box.offsetWidth,
        h: box.offsetHeight,
      };
      s.player = create({
        timelapse,
        canvas: ink,
        stage: { width: stage.clientWidth, height: stage.clientHeight },
        figure: figureBox,
        reduced: still,
        kyotoSeika,
        frames: clock,
      });
      await s.player.prepare();
      if (s.over) return;
      const layout = s.player.layout();
      const [x, y, w, h] = timelapse.place;
      s.flight = playsInSpot(layout) ? null : figureTransform(layout, { x, y, w, h }, figureBox);
      await takeOff(s, layout);
      if (s.over) return;
      if ((await s.player.play()) === "stopped" || s.over) return;
      reveal(s);
    } catch (error) {
      // Logged even once stopped, when no failure line shows it.
      console.error(`Sticker ${target.id}'s timelapse couldn't play`, error);
      if (s.over) return;
      end(s, { stickerId: target.id, phase: "idle", failure: toError(error), said: null });
    }
  };

  const start = () => {
    if (!shown || session.current) return;
    const s: Session = {
      stickerId: shown.id,
      player: null,
      canvas: null,
      figure: null,
      flight: null,
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
