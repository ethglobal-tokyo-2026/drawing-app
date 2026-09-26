import { Heart, Wind, X } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
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
  const latest = useRef({
    onEnd,
    stickerId: sticker.id,
    reduced,
    intensity,
    showFrameTimes,
    handle,
  });
  useLayoutEffect(() => {
    latest.current = { onEnd, stickerId: sticker.id, reduced, intensity, showFrameTimes, handle };
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
        giverHandle: latest.current.handle,
        intensity: latest.current.intensity,
        reduced: latest.current.reduced,
        showFrameTimes: latest.current.showFrameTimes,
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
              {formatNo(sticker.no)} · <Duration seconds={sticker.timeUsed} /> ·{" "}
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
