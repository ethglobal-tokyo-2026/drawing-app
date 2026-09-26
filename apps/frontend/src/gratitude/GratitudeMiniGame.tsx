import { Heart, Wind, X } from "@phosphor-icons/react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RecordGratitude, ReplayV1 } from "@drawing-app/api/client";
import { useApi } from "../api/useApi";
import { formatCount } from "../i18n/format";
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
import { newIdempotencyKey, sendGratitude } from "./gratitudeOutbox";
import { loadLetteringFonts } from "./letteringFonts";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";
import { TIER_NAMES } from "./tierNames";
import "./gratitude-mini-game.css";

/** A finished combo and the sticker its gratitude is for: what the app keeps. */
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
  /** The received gift the gratitude is for. Without one, as in the stat board's demo, nothing is recorded. */
  giftId?: string;
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

/** POST /api/gratitude's body: the record's scored fields, not its timings, which the replay holds. */
function gratitudeFor(giftId: string, record: ComboRecord, replay: ReplayV1): RecordGratitude {
  return {
    idempotencyKey: newIdempotencyKey(),
    giftId,
    method: record.method,
    hits: record.hits,
    total: record.total,
    peakMult: record.peakMult,
    peakTier: record.peakTier,
    gameConfigVersion: record.gameConfigVersion,
    replay,
  };
}

/**
 * While the game covers the phone, the phone's other children (the board's screen, the tab bar and
 * anything else open) go inert and hidden: assistive tech and Tab reach only the game, and the
 * browser stops painting what it covers. Returns what undoes it, which takes off only the `inert`
 * it added and puts back each child's own visibility.
 */
function setPhoneAside(game: HTMLElement): () => void {
  const phone = game.parentElement;
  if (!phone?.classList.contains("phone")) return () => {};
  const others = [...phone.children].filter(
    (child): child is HTMLElement => child !== game && child instanceof HTMLElement,
  );
  const madeInert = others.filter((child) => !child.hasAttribute("inert"));
  const visibility = others.map((child) => ({ child, was: child.style.visibility }));
  for (const child of madeInert) child.setAttribute("inert", "");
  for (const child of others) child.style.visibility = "hidden";
  return () => {
    for (const child of madeInert.splice(0)) child.removeAttribute("inert");
    for (const { child, was } of visibility.splice(0)) child.style.visibility = was;
  };
}

/** Send gratitude, over the whole phone: the sticker and its giver, the heart, the combo, the receipt. */
export function GratitudeMiniGame({
  sticker,
  giver,
  giftId,
  intensity,
  showFrameTimes,
  onEnd,
  onClose,
}: Props) {
  const api = useApi();
  const reduced = useReducedMotion();
  /** The finished combo, once its ending has played: the receipt shows it. */
  const [ended, setEnded] = useState<ComboRecord | null>(null);
  const [failed, setFailed] = useState(false);
  const [refused, setRefused] = useState(false);
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
  const receipt = useRef<HTMLElement>(null);
  const engine = useRef<MiniGameEngine | null>(null);
  const restorePhone = useRef<() => void>(() => {});
  const handle = formatHandle(giver.handle);

  // The engine mounts once per screen; its callbacks read the latest props through this.
  const latest = useRef({
    api,
    giftId,
    onEnd,
    stickerId: sticker.id,
    reduced,
    intensity,
    showFrameTimes,
    handle,
  });
  useLayoutEffect(() => {
    latest.current = {
      api,
      giftId,
      onEnd,
      stickerId: sticker.id,
      reduced,
      intensity,
      showFrameTimes,
      handle,
    };
  });

  useLayoutEffect(() => {
    // The gratitude outbox keeps the combo on this device before its request goes.
    const record = (combo: ComboRecord, replay: ReplayV1) => {
      const { api: client, giftId, onEnd: ended, stickerId } = latest.current;
      if (giftId) {
        void sendGratitude(client, gratitudeFor(giftId, combo, replay)).then((sent) => {
          if (sent.state === "refused") setRefused(true);
        });
      }
      ended?.({ ...combo, stickerId });
    };

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
        onRecord: record,
        onFinished: setEnded,
        onError: () => setFailed(true),
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

  // The tier names' and pop-in words' Japanese glyphs arrive before the first tier-up.
  useEffect(() => loadLetteringFonts(), []);

  // A layout effect, so on unmount the phone comes back before the focus trap returns focus to it.
  useLayoutEffect(() => {
    const restore = setPhoneAside(need(root.current, "root"));
    restorePhone.current = restore;
    return restore;
  }, []);

  // LINE's header shows the page title.
  useEffect(() => {
    const was = document.title;
    document.title = "Send gratitude";
    return () => {
      document.title = was;
    };
  }, []);

  const leave = () => {
    restorePhone.current();
    onClose();
  };
  const close = () => {
    engine.current?.close();
    leave();
  };
  useFocusTrap(root, { onEscape: close });
  // The trap focuses the first control, the X; the heart takes it, so Enter taps rather than closes.
  useEffect(() => engine.current?.focusHeart(), []);
  // The heart has gone, and disabled: the receipt's button takes focus.
  useEffect(() => {
    if (ended) receipt.current?.querySelector("button")?.focus();
  }, [ended]);
  const screen = (
    <div
      className="gr"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label="Send gratitude"
      tabIndex={-1}
    >
      <div className="gr-page" ref={page}>
        <div className="gr-ground" ref={ground} aria-hidden="true" />
        <div className="gr-top">
          <figure className="gr-piece" aria-label={`Sticker ${formatNo(sticker.no)}`}>
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
          <button type="button" className="gr-close" aria-label="Close" data-press onClick={close}>
            <X />
          </button>
        </div>
        <div className="gr-hud" ref={hud} aria-hidden />
        <div className="gr-stage" ref={stage} />
        <p className="gr-hint" ref={hint}>
          {/* It beats like a game's start button, to be noticed before the first tap. */}
          <span className="gr-hint-beat">
            Tap the heart
            <br />
            as fast as you can!
          </span>
        </p>
      </div>
      <div className="gr-fuu" ref={fuu} aria-hidden>
        <span>fuu…</span>
        <Wind />
      </div>
      <p className="gr-sr" ref={live} aria-live="polite" />
      {ended && (
        <section ref={receipt} className="gr-receipt is-on" aria-label="Gratitude sent">
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
              <p className="gr-rc-figure">
                {formatCount(ended.total)}
                <small aria-hidden="true"> ♡</small>
              </p>
              <p className="gr-rc-head">gratitude to {handle}</p>
              <p className="gr-rc-sub fine">
                best ×{ended.peakMult.toFixed(1)} · {formatCount(ended.hits)}{" "}
                {ended.hits === 1 ? "hit" : "hits"}
                {"\n"}
                {TIER_NAMES[ended.peakTier].jp} {TIER_NAMES[ended.peakTier].en}
              </p>
            </div>
          </div>
          <div className="gr-rc-actions">
            <LabelButton block icon={<StickerBoardIcon />} onClick={leave}>
              Back to your board
            </LabelButton>
          </div>
        </section>
      )}
      {/* In plain words: the engine and the gratitude outbox log what went wrong to the console. */}
      {(failed || refused) && (
        <p className="gr-failure" role="alert">
          {failed && "The game stopped. Close it and send your gratitude again."}
          {failed && refused && <br />}
          {refused && `Your gratitude didn't reach ${handle}. Close this and send it again.`}
        </p>
      )}
    </div>
  );
  // Over the whole phone, tabs included, as the sticker detail is.
  const phone = document.querySelector<HTMLElement>(".phone");
  return phone ? createPortal(screen, phone) : screen;
}
