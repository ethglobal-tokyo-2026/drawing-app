import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { useLight } from "../../stickers/light";
import { LiveResin } from "../../stickers/LiveResin";
import { sweepSheen } from "../../stickers/resinSheen";
import type { Sticker } from "@drawing-app/api/client";
import { useReducedMotion } from "../../ui/useReducedMotion";
import { makeCutLine, paintDim, paintUsedStickerSilhouette } from "./ceremonyPaint";
import type { SealedSticker } from "./makeSticker";
import { SealedCard } from "./SealedCard";
import {
  ceremonyTime,
  flight,
  sealFrame,
  T,
  TOTAL,
  type Box,
  type SealFrame,
} from "./sealTimeline";
import "./SealCeremony.css";

/** How long the ceremony takes to fade when the drawing screen comes back. */
const LEAVE_MS = 260;

interface Props {
  sticker: SealedSticker;
  /** The sticker as the server sealed it. */
  sealed: Sticker;
  /** The sheet the sticker was cut from, in the ceremony's own pixels. */
  sheet: Box;
  handle: string;
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
 * domes, the sticker peels off its backing and lands on the sealed card. One animation-frame loop
 * writes each frame of the timeline straight to the canvases, images and transforms; React only
 * hears that it's done. A tap, Enter, Space or Escape skips to the end; reduced motion starts there.
 */
export function SealCeremony({
  sticker,
  sealed,
  sheet,
  handle,
  onKeepDrawing,
  onBoard,
  onShop,
}: Props) {
  const reduced = useReducedMotion();
  useLight();
  const [done, setDone] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const skip = useRef<() => void>(() => {});
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
      status: el<HTMLElement>(".seal-ceremony__status"),
    };
    const cardEl = need(card.current, "card");
    const slotEl = need(slot.current, "card's slot");
    const lines = [...cardEl.querySelectorAll<HTMLElement>("[data-card-line]")];

    const size = { w: host.offsetWidth, h: host.offsetHeight };
    const r = Math.min(devicePixelRatio || 1, 2);
    paintDim(parts.dim, size, box, sticker.maskImage, r);
    paintUsedStickerSilhouette(parts.usedStickerSilhouette, box, sticker.maskImage, r);
    const drawCut = makeCutLine(parts.cut, size, contour, r);

    const path = flight(box, body, {
      x: cardEl.offsetLeft + slotEl.offsetLeft,
      y: cardEl.offsetTop + slotEl.offsetTop,
      w: slotEl.offsetWidth,
      h: slotEl.offsetHeight,
    });

    const opacity = (node: HTMLElement, v: number) => (node.style.opacity = String(v));
    let swept = false;
    let ended = false;
    let stopKeys = () => {};
    const show = (t: number) => {
      const f: SealFrame = sealFrame(t, path, lines.length);
      drawCut(f.cut.progress, f.cut.alpha);
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
      const p = f.sticker;
      parts.sticker.style.transform = `perspective(1000px) translate(${p.x}px, ${p.y}px) rotate(${p.rotate}deg) rotateX(${p.rotateX}deg) rotateY(${p.rotateY}deg) scale(${p.scale})`;
      const s = f.shadow;
      opacity(parts.shadow, s.opacity);
      parts.shadow.style.transform = `translate(${s.x}px, ${s.y}px) rotate(${s.rotate}deg) scale(${s.scale})`;
      host.toggleAttribute("data-lifted", f.lifted);
      opacity(parts.usedStickerSilhouette, f.usedStickerSilhouette);
      opacity(cardEl, f.card.opacity);
      cardEl.style.transform = f.card.y ? `translateY(${f.card.y}px)` : "";
      lines.forEach((node, i) => {
        opacity(node, f.items[i].opacity);
        node.style.transform = f.items[i].y ? `translateY(${f.items[i].y}px)` : "";
      });
      // It sticks with a sheen, unless it was skipped past.
      if (!swept && t >= T.land && t < TOTAL - 1 && !reduced) {
        swept = true;
        sweepSheen(parts.sheen, 640);
      }
      if (f.done && !ended) {
        ended = true;
        stopKeys();
        setDone(true);
      }
    };

    let raf = 0;
    let start: number | null = null;
    let skipped = false;
    const tick = (now: number) => {
      // Said a frame after the status line exists, so screen readers hear the change.
      if (start === null) parts.status.textContent = "Sealing your sticker";
      start ??= now;
      const t = ceremonyTime(now - start, { skipped, reduced });
      show(t);
      if (t < TOTAL) raf = requestAnimationFrame(tick);
    };
    skip.current = () => {
      if (ended) return;
      skipped = true;
      cancelAnimationFrame(raf);
      show(TOTAL);
    };
    // The keys that would press a button skip, as a tap does.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Escape") return;
      e.preventDefault();
      skip.current();
    };
    document.addEventListener("keydown", onKey);
    stopKeys = () => document.removeEventListener("keydown", onKey);
    if (reduced) show(TOTAL);
    else raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stopKeys();
      host.removeAttribute("data-lifted");
    };
  }, [sticker, sheet, reduced]);

  const leaveTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(leaveTimer.current), []);
  const leave = (action: () => void) => () => {
    if (reduced) return action();
    setLeaving(true);
    leaveTimer.current = setTimeout(action, LEAVE_MS);
  };

  const resin: CSSProperties = {
    ...boxStyle(box),
    "--m": `url("${layers.mask}")`,
    "--mt": `url("${layers.spec}")`,
    "--mb": `url("${layers.rim}")`,
  };

  return (
    <div
      ref={root}
      className={`seal-ceremony ${leaving ? "is-leaving" : ""}`}
      onPointerDown={(e) => {
        if (done) return;
        e.preventDefault();
        skip.current();
      }}
    >
      <p className="seal-ceremony__status visually-hidden" role="status" />
      <canvas className="seal-ceremony__dim" aria-hidden="true" />
      <canvas
        className="seal-ceremony__used-sticker-silhouette"
        style={boxStyle(box)}
        aria-hidden="true"
      />
      <span className="seal-ceremony__veil" aria-hidden="true" />
      <canvas className="seal-ceremony__cut" aria-hidden="true" />
      <SealedCard
        sealed={sealed}
        handle={handle}
        done={done}
        cardRef={card}
        slotRef={slot}
        onKeepDrawing={leave(onKeepDrawing)}
        onBoard={onBoard}
        onShop={leave(onShop)}
      />
      <img
        className="seal-ceremony__shadow"
        style={boxStyle(box)}
        src={layers.shadow}
        alt=""
        decoding="sync"
      />
      <div className="seal-ceremony__sticker" style={resin} aria-hidden="true">
        <img className="seal-ceremony__plain" src={layers.plain} alt="" decoding="sync" />
        <img className="seal-ceremony__tint" src={layers.tint} alt="" decoding="sync" />
        <img className="seal-ceremony__gloss" src={layers.gloss} alt="" decoding="sync" />
        <span className="seal-ceremony__pour">
          <b style={boxStyle(pour)} />
        </span>
        <LiveResin highlights />
      </div>
    </div>
  );
}
