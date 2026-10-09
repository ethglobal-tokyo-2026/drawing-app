import {
  useEffect,
  useEffectEvent,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { useLight } from "../../stickers/light";
import { LiveResin } from "../../stickers/LiveResin";
import { madeFoil } from "../../stickers/madeFoil";
import { StickerFoil } from "../../stickers/StickerFoil";
import { sweepSheen } from "../../stickers/resinSheen";
import type { Sticker } from "@drawing-app/api/client";
import { releaseCanvas } from "../../ui/releaseCanvas";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { makeCutLine, paintDim, paintUsedStickerSilhouette, type Cutter } from "./ceremonyPaint";
import type { SealedSticker } from "./makeSticker";
import { SealedCard } from "./SealedCard";
import {
  ceremonyTime,
  cutterAt,
  flight,
  HOLD,
  sealFrame,
  stopAt,
  T,
  TOTAL,
  type Box,
  type Flight,
  type SealFrame,
} from "./sealTimeline";
import { trackSlot } from "./slotTracker";
import "./SealCeremony.css";

/** Once the seal is recorded, the cutter fades as the resin starts to pour. */
const CUTTER_FADE_MS = 160;
/** Its fresh cut grows behind it as it gets going. */
const TRAIL_GROW_MS = 700;
/** A frame after a hitch moves the ceremony on by at most this, so a hitch slows it rather than skipping it. */
const MAX_FRAME_MS = 64;
/** The sticker's turn as it lands on the card, which a foil's glint undoes. */
const LANDED_TURN_DEG = -2;
/** Until the card is there, the sticker stays on its backing: nothing flies before the seal is recorded. */
const ON_BACKING: Flight = { peel: { x: 0, y: 0 }, dx: 0, dy: 0, scale: 1 };

/** Whether a line of the card holds something to press. */
const holdsKey = (line: HTMLElement) =>
  line.matches("button") || line.querySelector("button") !== null;

interface Props {
  sticker: SealedSticker;
  /** The sticker as the server sealed it; null while the seal is on its way, and the ceremony waits at the cut. */
  sealed: Sticker | null;
  /** The seal failed: the ceremony fades back to the drawing. */
  failed: boolean;
  /**
   * Keep drawing or the shop was chosen, and the fresh sheet is already under the veil: the card
   * carries the sticker down toward the board as the veil lifts, then `onLeft` lets it go.
   */
  leaving: boolean;
  onLeft: () => void;
  /** The sheet the sticker was cut from, in the ceremony's own pixels. */
  sheet: Box;
  onKeepDrawing: () => void;
  onBoard: () => void;
  onShop: () => void;
}

const px = (v: number) => `${v}px`;
const boxStyle = (b: Box): CSSProperties => ({
  left: px(b.x),
  top: px(b.y),
  width: px(b.w),
  height: px(b.h),
});

/** Where the sticker sits on the sheet and where its resin lands, in the ceremony's pixels. */
function stage(sticker: SealedSticker, sheet: Box) {
  const k = sheet.w / sticker.inkWidth;
  const box: Box = {
    x: sheet.x + sticker.place.x * k,
    y: sheet.y + sticker.place.y * k,
    w: sticker.place.w * k,
    h: sticker.place.h * k,
  };
  // The cut inside the image's clear margin.
  const body = {
    w: box.w * (1 - (2 * sticker.pad) / sticker.width),
    h: box.h * (1 - (2 * sticker.pad) / sticker.height),
  };
  // The resin lands a little above the middle and spreads until it passes every edge.
  const x = box.w * 0.5;
  const y = box.h * 0.42;
  const r = 1.04 * Math.hypot(Math.max(x, box.w - x), Math.max(y, box.h - y));
  const contour = sticker.contour.map(([cx, cy]) => [sheet.x + cx * k, sheet.y + cy * k]);
  return { box, body, contour, pour: { x: x - r, y: y - r, w: r * 2, h: r * 2 } };
}

function need<E extends Element>(el: E | null, what: string): E {
  if (!el) throw new Error(`The seal ceremony is missing its ${what}`);
  return el;
}

/**
 * The seal ceremony, over the drawing screen: the cut runs around the ink, clear resin pours and
 * domes, the sticker peels off its backing and lands on the sealed card. It starts as soon as the
 * sticker is cut, then waits at the cut, the cutter still running round it pass after pass, until
 * the server has sealed the sticker: only then does the resin pour. One animation-frame loop writes
 * each frame of the timeline straight to the canvases, images and transforms; React only hears when
 * the card's first key has faded up. Until then a tap, Enter, Space or Escape skips to the wait, or
 * to the end once sealed; reduced motion starts there. A failed seal fades back to the drawing.
 * Keep drawing and the shop hand over at once: the fresh sheet is set up under the veil while the
 * card leaves over it.
 */
export function SealCeremony({
  sticker,
  sealed,
  failed,
  leaving,
  onLeft,
  sheet,
  onKeepDrawing,
  onBoard,
  onShop,
}: Props) {
  const reduced = useReducedMotion();
  useLight();
  // Read by the frame loop, so neither the seal's answer nor a change to reduced motion restarts it.
  const isSealed = useEffectEvent(() => sealed !== null);
  const isReduced = useEffectEvent(() => reduced);
  // The card's first key has faded up: the card takes presses, and taps and keys stop skipping.
  const [keyShown, setKeyShown] = useState(false);
  const skip = useRef<() => void>(() => {});
  // A finger's tap that skips only skips: the skip puts the card's keys under the finger, and Chromium
  // sends the tap's click to whichever one it lifts over, unless the touch's end is cancelled.
  const skippingTouch = useRef(false);
  const wake = useRef<() => void>(() => {});
  const root = useRef<HTMLDivElement>(null);
  const card = useRef<HTMLElement>(null);
  const slot = useRef<HTMLDivElement>(null);

  const { box, pour } = stage(sticker, sheet);
  const { layers } = sticker;

  useLayoutEffect(() => {
    const { box, body, contour } = stage(sticker, sheet);
    const host = need(root.current, "root");
    const el = <E extends Element>(selector: string) =>
      need(host.querySelector<E>(selector), selector);
    const parts = {
      dim: el<HTMLCanvasElement>(".seal-ceremony__dim"),
      usedStickerSilhouette: el<HTMLCanvasElement>(".seal-ceremony__used-sticker-silhouette"),
      veil: el<HTMLElement>(".seal-ceremony__veil"),
      cut: el<HTMLCanvasElement>(".seal-ceremony__cut"),
      shadow: el<HTMLElement>(".seal-ceremony__shadow"),
      sticker: el<HTMLElement>(".seal-ceremony__sticker"),
      plain: el<HTMLElement>(".seal-ceremony__plain"),
      tint: el<HTMLElement>(".seal-ceremony__tint"),
      gloss: el<HTMLElement>(".seal-ceremony__gloss"),
      pour: el<HTMLElement>(".seal-ceremony__pour"),
      front: el<HTMLElement>(".seal-ceremony__pour > b"),
      lens: el<HTMLElement>(".live-resin__lens"),
      spec: el<HTMLElement>(".live-resin__spec"),
      specFace: el<HTMLElement>(".live-resin__spec > b"),
      rim: el<HTMLElement>(".live-resin__rim"),
      sheen: el<HTMLElement>(".live-resin__sheen > b"),
    };

    const size = { w: host.offsetWidth, h: host.offsetHeight };
    const r = Math.min(devicePixelRatio || 1, 2);
    paintDim(parts.dim, size, box, sticker.maskImage, r);
    paintUsedStickerSilhouette(parts.usedStickerSilhouette, box, sticker.maskImage, r);
    const cutLine = makeCutLine(parts.cut, size, contour, r);

    // The card comes with the sealed sticker, so its slot is measured once the card is there, and
    // again whenever the card or the ceremony changes size: the card grows upward from its foot, and
    // a turn moves a card centered on a large screen without resizing it.
    let slotAt: ReturnType<typeof trackSlot> | null = null;
    let cardEl: HTMLElement | null = null;
    // No frame draws once the ceremony has ended, so a resize draws its last one again.
    let redraw = () => {};
    const cardReady = () => {
      if (slotAt) return true;
      const c = card.current;
      const s = slot.current;
      if (!c || !s) return false;
      cardEl = c;
      slotAt = trackSlot(
        () => ({
          x: c.offsetLeft + s.offsetLeft,
          y: c.offsetTop + s.offsetTop,
          w: s.offsetWidth,
          h: s.offsetHeight,
        }),
        (onResize) => {
          const resizes = new ResizeObserver(() => {
            onResize();
            redraw();
          });
          resizes.observe(c);
          resizes.observe(host);
          return () => resizes.disconnect();
        },
      );
      return true;
    };
    const recorded = () => isSealed() && cardReady();

    const opacity = (node: HTMLElement, v: number) => (node.style.opacity = String(v));
    let t = 0;
    // How long the cutter has been running round the finished cut.
    let waited = 0;
    let swept = false;
    let ended = false;
    let firstKeyShown = false;
    let stopKeys = () => {};
    const cutter = (): Cutter | null => {
      if (isReduced() || t < HOLD) return null;
      const alpha = 1 - Math.min(1, (t - HOLD) / CUTTER_FADE_MS);
      if (alpha <= 0) return null;
      return {
        at: cutterAt(waited, cutLine.length),
        trail: Math.min(1, waited / TRAIL_GROW_MS),
        alpha,
      };
    };
    const show = () => {
      // Found every frame: a line the card mounts or swaps mid-fade, as a tickets refresh can, fades
      // up in its turn.
      const lines = cardEl ? [...cardEl.querySelectorAll<HTMLElement>("[data-card-line]")] : [];
      const path: Flight = slotAt ? flight(box, body, slotAt.box()) : ON_BACKING;
      const f: SealFrame = sealFrame(t, path, lines.length);
      cutLine.draw(f.cut.progress, f.cut.alpha, cutter());
      opacity(parts.dim, f.dim);
      opacity(parts.veil, f.veil);
      opacity(parts.plain, f.plain);
      parts.front.style.transform = `scale(${f.pour.scale.toFixed(4)}) rotate(${f.pour.turn.toFixed(2)}deg)`;
      opacity(parts.pour, f.pour.opacity);
      opacity(parts.tint, f.tint);
      opacity(parts.lens, f.lens);
      opacity(parts.gloss, f.gloss);
      opacity(parts.spec, f.spec.opacity);
      parts.specFace.style.scale = String(f.spec.scale);
      opacity(parts.rim, f.rim);
      // A foil that marks how the sticker was made comes with the seal's answer, and rises with the resin.
      const foil = parts.sticker.querySelector<HTMLElement>(".sticker-foil");
      if (foil) opacity(foil, f.tint);
      const p = f.sticker;
      parts.sticker.style.transform = `perspective(1000px) translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) rotateX(${p.rotateX}deg) rotateY(${p.rotateY}deg) scale(${p.scale})`;
      const s = f.shadow;
      opacity(parts.shadow, s.opacity);
      parts.shadow.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rotate}deg) scale(${s.scale})`;
      host.toggleAttribute("data-lifted", f.lifted);
      opacity(parts.usedStickerSilhouette, f.usedStickerSilhouette);
      if (cardEl) {
        opacity(cardEl, f.card.opacity);
        cardEl.style.transform = f.card.y ? `translateY(${f.card.y}px)` : "";
        lines.forEach((node, i) => {
          const line = f.items[i];
          opacity(node, line.opacity);
          node.style.transform = line.y ? `translateY(${line.y}px)` : "";
          // A line takes presses, and reaches screen readers, once it has faded all the way up.
          node.toggleAttribute("inert", !line.shown);
        });
      }
      // It sticks with a sheen, unless it was skipped past.
      if (!swept && t >= T.land && t < TOTAL - 1 && !isReduced()) {
        swept = true;
        sweepSheen(parts.sheen, 640);
      }
      ended ||= f.done;
      // From its first key on, a press on the card is the key's, not a skip; the rest plays on.
      if (
        !firstKeyShown &&
        (ended || lines.some((node, i) => f.items[i].shown && holdsKey(node)))
      ) {
        firstKeyShown = true;
        stopKeys();
        setKeyShown(true);
      }
    };
    redraw = () => {
      if (ended) show();
    };

    let raf = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      raf = 0;
      const dt = last === null ? 0 : Math.min(MAX_FRAME_MS, now - last);
      last = now;
      if (t >= HOLD) waited += dt;
      t = ceremonyTime(t, dt, { recorded: recorded(), reduced: isReduced() });
      show();
      // Under reduced motion nothing moves while it waits: the next frame comes with the seal, or
      // with motion turned back on.
      if (t < TOTAL && !(isReduced() && t === HOLD)) raf = requestAnimationFrame(tick);
    };
    wake.current = () => {
      if (!raf && !ended) raf = requestAnimationFrame(tick);
    };
    skip.current = () => {
      if (ended) return;
      t = stopAt(recorded());
      show();
    };
    // The keys that would press a button skip, as a tap does.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
      e.preventDefault();
      skip.current();
    };
    document.addEventListener("keydown", onKey);
    stopKeys = () => document.removeEventListener("keydown", onKey);
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopKeys();
      slotAt?.stop();
      host.removeAttribute("data-lifted");
      [parts.dim, parts.usedStickerSilhouette, parts.cut].forEach(releaseCanvas);
    };
  }, [sticker, sheet]);

  // The seal is recorded, or motion is back on: the ceremony goes on from its wait.
  useEffect(() => {
    if (sealed || !reduced) wake.current();
  }, [sealed, reduced]);

  const resin: CSSProperties = {
    ...boxStyle(box),
    "--m": `url("${layers.mask}")`,
    "--mt": `url("${layers.spec}")`,
    "--mb": `url("${layers.rim}")`,
  };

  // Pink on an 18+ sticker, else the Kyoto Seika Practice Mode foil on one drawn in that mode: the
  // Other Hand Rule lets these show on your own stickers.
  const foil =
    sealed && madeFoil({ nsfw: sealed.nsfw, kyotoSeika: sealed.kyotoSeikaSubjects !== null });

  const classes = ["seal-ceremony", failed && "is-failed", leaving && "is-leaving"];
  return (
    <div
      ref={root}
      className={classes.filter(Boolean).join(" ")}
      onPointerDown={(e) => {
        skippingTouch.current = false;
        if (keyShown || failed) return;
        e.preventDefault();
        skippingTouch.current = e.pointerType === "touch";
        skip.current();
      }}
      onTouchEnd={(e) => {
        if (skippingTouch.current) e.preventDefault();
        skippingTouch.current = false;
      }}
    >
      <canvas className="seal-ceremony__dim" aria-hidden="true" />
      <canvas
        className="seal-ceremony__used-sticker-silhouette"
        style={boxStyle(box)}
        aria-hidden="true"
      />
      <span className="seal-ceremony__veil" aria-hidden="true" />
      <canvas className="seal-ceremony__cut" aria-hidden="true" />
      {/* The card and the sticker on it leave together, as one piece. */}
      <div
        className="seal-ceremony__carrier"
        onAnimationEnd={(e) => {
          if (e.target === e.currentTarget && e.animationName === "seal-ceremony-carry") onLeft();
        }}
      >
        {sealed && (
          <SealedCard
            sealed={sealed}
            keyShown={keyShown}
            leaving={leaving}
            cardRef={card}
            slotRef={slot}
            onKeepDrawing={onKeepDrawing}
            onBoard={onBoard}
            onShop={onShop}
          />
        )}
        <img
          className="seal-ceremony__shadow"
          style={boxStyle(box)}
          src={layers.shadow}
          alt=""
          decoding="sync"
        />
        <div className="seal-ceremony__sticker" style={resin} aria-hidden="true">
          {foil && sealed && (
            <StickerFoil size="board" tone={foil} no={sealed.number} turn={LANDED_TURN_DEG} />
          )}
          <img className="seal-ceremony__plain" src={layers.plain} alt="" decoding="sync" />
          <img className="seal-ceremony__tint" src={layers.tint} alt="" decoding="sync" />
          <img className="seal-ceremony__gloss" src={layers.gloss} alt="" decoding="sync" />
          <span className="seal-ceremony__pour">
            <b style={boxStyle(pour)} />
          </span>
          <LiveResin />
        </div>
      </div>
    </div>
  );
}
