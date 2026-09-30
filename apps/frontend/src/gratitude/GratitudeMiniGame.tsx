import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RecordGratitude, ReplayV1 } from "@drawing-app/api/client";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { formatCount } from "../i18n/format";
import { Trans, useTranslation } from "../i18n/react";
import { GratitudeIcon, StickerBoardIcon, Wind, X } from "../icons";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import { StickerFigure } from "../stickers/StickerFigure";
import type { StickerUrls } from "../stickers/stickerUrls";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { ComboRecord } from "./combo";
import { newIdempotencyKey } from "../api/idempotencyKey";
import { keepGratitudeInPlay, sendGratitude } from "./gratitudeOutbox";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";
import { loadPuffyFont } from "./puffyFont";
import { shownGloss, TIER_NAMES } from "./tierNames";
import "./gratitude-mini-game.css";

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
  onClose: () => void;
}

function need<E extends Element>(el: E | null, what: string): E {
  if (!el) throw new Error(`The gratitude mini-game is missing its ${what}`);
  return el;
}

/** POST /api/gratitude's body: the record's scored fields, not its timings, which the replay holds. */
function gratitudeFor(
  idempotencyKey: string,
  giftId: string,
  record: ComboRecord,
  replay: ReplayV1,
): RecordGratitude {
  return {
    idempotencyKey,
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
  onClose,
}: Props) {
  const { t } = useTranslation();
  const api = useApi();
  const { id: userId } = useMe();
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
    userId,
    giftId,
    reduced,
    intensity,
    showFrameTimes,
    handle,
  });
  useLayoutEffect(() => {
    latest.current = {
      api,
      userId,
      giftId,
      reduced,
      intensity,
      showFrameTimes,
      handle,
    };
  });

  useLayoutEffect(() => {
    // One combo per engine: what's kept of it in play and its finished record share a key, so the
    // record takes the kept one's place and the server gets the combo once.
    const idempotencyKey = newIdempotencyKey();
    // The gratitude outbox keeps the combo on this device as it plays, and before its request goes.
    const keepInPlay = (combo: ComboRecord, replay: ReplayV1) => {
      const { userId, giftId } = latest.current;
      if (giftId) keepGratitudeInPlay(userId, gratitudeFor(idempotencyKey, giftId, combo, replay));
    };
    const record = (combo: ComboRecord, replay: ReplayV1) => {
      const { api: client, userId, giftId } = latest.current;
      if (giftId) {
        const body = gratitudeFor(idempotencyKey, giftId, combo, replay);
        void sendGratitude(client, userId, body).then((sent) => {
          if (sent.state === "refused") setRefused(true);
        });
      }
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
        onInPlay: keepInPlay,
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

  // The lettering's Japanese glyphs, the multiplier's figures and the giver's initial arrive before
  // the first tier-up, so none swaps typefaces as it lands.
  useEffect(() => loadPuffyFont(giver.displayName), [giver.displayName]);

  // A layout effect, so on unmount the phone comes back before the focus trap returns focus to it.
  useLayoutEffect(() => {
    const restore = setPhoneAside(need(root.current, "root"));
    restorePhone.current = restore;
    return restore;
  }, []);

  // LINE's header shows the page title.
  useEffect(() => {
    const was = document.title;
    document.title = t(($) => $.gratitude.title);
    return () => {
      document.title = was;
    };
  }, [t]);

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

  const tierGloss = ended ? shownGloss(TIER_NAMES[ended.peakTier].en) : "";
  const screen = (
    <div
      className="gr"
      ref={root}
      role="dialog"
      aria-modal="true"
      aria-label={t(($) => $.gratitude.title)}
      tabIndex={-1}
    >
      <div className="gr-page" ref={page}>
        <div className="gr-ground" ref={ground} aria-hidden="true" />
        <div className="gr-top">
          <figure
            className="gr-piece"
            aria-label={t(($) => $.gratitude.sticker, { no: formatNo(sticker.no) })}
          >
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
                <GratitudeIcon />
              </span>
            </span>
          </div>
          <div className="gr-from">
            <p className="fine">{t(($) => $.gratitude.from)}</p>
            <p className="gr-from-name">{handle}</p>
            <p className="fine">
              {formatNo(sticker.no)}
              {" · "}
              <Duration seconds={sticker.timeUsed} />
              {" · "}
              {formatDay(sticker.createdAt)}
            </p>
          </div>
          <button
            type="button"
            className="gr-close"
            aria-label={t(($) => $.gratitude.close)}
            data-press
            onClick={close}
          >
            <X />
          </button>
        </div>
        <div className="gr-hud" ref={hud} aria-hidden />
        <div className="gr-stage" ref={stage} />
        <p className="gr-hint" ref={hint}>
          {/* It beats like a game's start button, to be noticed before the first tap. */}
          <span className="gr-hint-beat">
            <Trans i18nKey={($) => $.gratitude.hint} />
          </span>
        </p>
      </div>
      <div className="gr-fuu" ref={fuu} aria-hidden>
        <span>{t(($) => $.gratitude.sigh)}</span>
        <Wind />
      </div>
      <p className="gr-sr" ref={live} aria-live="polite" />
      {ended && (
        <section
          ref={receipt}
          className="gr-receipt is-on"
          aria-label={t(($) => $.gratitude.receipt.label)}
        >
          <div className="gr-rc-row">
            <div className="gr-rc-photo">
              <PhotoSticker src={giver.pictureUrl} name={giver.displayName} size={58} />
              <span className="gr-photo-dot" aria-hidden>
                <span className="gr-dot">
                  <GratitudeIcon />
                </span>
              </span>
            </div>
            <div className="gr-rc-text">
              <p className="gr-rc-figure">
                {formatCount(ended.total)}
                <GratitudeIcon />
              </p>
              <p className="gr-rc-head">{t(($) => $.gratitude.receipt.gratitudeTo, { handle })}</p>
              <p className="gr-rc-sub fine">
                {t(($) => $.gratitude.receipt.best, {
                  multiplier: ended.peakMult.toFixed(1),
                  hits: formatCount(ended.hits),
                  count: ended.hits,
                })}
                {"\n"}
                {TIER_NAMES[ended.peakTier].jp}
                {tierGloss && ` ${tierGloss}`}
              </p>
            </div>
          </div>
          <div className="gr-rc-actions">
            <LabelButton block icon={<StickerBoardIcon />} onClick={leave}>
              {t(($) => $.gratitude.receipt.backToBoard)}
            </LabelButton>
          </div>
        </section>
      )}
      {/* In plain words: the engine and the gratitude outbox log what went wrong to the console. */}
      {(failed || refused) && (
        <p className="gr-failure" role="alert">
          {failed && t(($) => $.gratitude.failures.stopped)}
          {failed && refused && <br />}
          {refused && t(($) => $.gratitude.failures.refused, { handle })}
        </p>
      )}
    </div>
  );
  // Over the whole phone, tabs included, as the sticker detail is.
  const phone = document.querySelector<HTMLElement>(".phone");
  return phone ? createPortal(screen, phone) : screen;
}
