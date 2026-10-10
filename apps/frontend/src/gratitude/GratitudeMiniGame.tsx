import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
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
import { ErrorDetail, ErrorLine } from "../ui/ErrorLine";
import { HitCounter } from "../ui/HitCounter";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { useLargeScreen } from "../ui/largeScreen";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { useSheetDrag } from "../ui/useSheetDrag";
import { PhonePortal } from "../ui/PhonePortal";
import type { ComboRecord } from "./combo";
import { newIdempotencyKey } from "../api/idempotencyKey";
import {
  keepGratitudeInPlay,
  onGratitudeLeftOutbox,
  sendGratitude,
  type GratitudeSendResult,
} from "./gratitudeOutbox";
import { mountMiniGameEngine, type MiniGameEngine } from "./miniGameEngine";
import { loadPuffyFont } from "./puffyFont";
import { refusalNote, type RefusalNote } from "./refusalNote";
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

/** What became of the finished combo's send: still going out, or how it ended. */
type Sending = { state: "sending" } | GratitudeSendResult;

/** The receipt's note on a send that isn't simply sent. */
interface ReceiptNote extends RefusalNote {
  kind: "sending" | "kept" | "lost" | "refused";
}

/** The receipt's note on what became of the send, and none once the server has recorded it. */
function receiptNoteFor(t: TFunction, sending: Sending | null, handle: string): ReceiptNote | null {
  switch (sending?.state) {
    case "sending":
      return { kind: "sending", text: t(($) => $.gratitude.receipt.sending) };
    case "kept":
      return { kind: "kept", text: t(($) => $.gratitude.receipt.kept, { handle }) };
    case "lost":
      return { kind: "lost", text: t(($) => $.gratitude.receipt.lost) };
    case "refused":
      return { kind: "refused", ...refusalNote(t, sending.error, handle) };
    default:
      return null;
  }
}

/** The receipt card's name for screen readers, by what its note says. */
function receiptLabelFor(t: TFunction, kind: ReceiptNote["kind"] | undefined): string {
  switch (kind) {
    case "sending":
      return t(($) => $.gratitude.receipt.labelSending);
    case "kept":
      return t(($) => $.gratitude.receipt.labelKept);
    case "lost":
      return t(($) => $.gratitude.receipt.labelLost);
    case "refused":
      return t(($) => $.gratitude.receipt.labelRefused);
    default:
      return t(($) => $.gratitude.receipt.label);
  }
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
  /** A combo is running: the X ends it, and its receipt follows, rather than closing the screen. */
  const [playing, setPlaying] = useState(false);
  /** What became of its send. Null without a gift, as in the stat board's demo: nothing goes out. */
  const [sending, setSending] = useState<Sending | null>(null);
  const [failed, setFailed] = useState(false);
  // One combo per screen: what's kept of it in play and its finished record share a key, so the
  // record takes the kept one's place and the server gets the combo once.
  const [idempotencyKey] = useState(newIdempotencyKey);
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
    // The gratitude outbox keeps the combo on this device as it plays, and before its request goes.
    const keepInPlay = (combo: ComboRecord, replay: ReplayV1) => {
      const { userId, giftId } = latest.current;
      if (giftId) keepGratitudeInPlay(userId, gratitudeFor(idempotencyKey, giftId, combo, replay));
    };
    const record = (combo: ComboRecord, replay: ReplayV1) => {
      const { api: client, userId, giftId } = latest.current;
      setPlaying(false);
      if (giftId) {
        setSending({ state: "sending" });
        // The receipt says what became of it: sent, kept on this phone to send again, refused or lost.
        void sendGratitude(
          client,
          userId,
          gratitudeFor(idempotencyKey, giftId, combo, replay),
        ).then(setSending);
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
        onStarted: () => setPlaying(true),
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
  }, [idempotencyKey]);

  // A combo kept for want of a connection and sent later, while this screen is up, updates its receipt.
  useEffect(
    () =>
      onGratitudeLeftOutbox((left) => {
        if (left.idempotencyKey === idempotencyKey) setSending(left.result);
      }),
    [idempotencyKey],
  );

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
  // A combo in play ends and shows its receipt, so it's never sent unseen; anything else closes.
  const close = () => {
    if (engine.current?.close()) return;
    leave();
  };
  // On a large screen the receipt is a card in the middle, and a swipe down its head closes it.
  const large = useLargeScreen();
  const drag = useSheetDrag(close);
  useFocusTrap(root, { onEscape: close });
  // The trap focuses the first control, the X; the heart takes it, so Enter taps rather than closes.
  useEffect(() => engine.current?.focusHeart(), []);
  // The heart has gone, and disabled: the receipt's key takes focus, not a Copy in its note.
  useEffect(() => {
    if (ended) receipt.current?.querySelector<HTMLElement>(".gr-rc-actions button")?.focus();
  }, [ended]);

  const tierGloss = ended ? shownGloss(TIER_NAMES[ended.peakTier].en) : "";
  // The receipt says sent only once the server has it. A refusal's reason, a combo kept for want of
  // a connection and one nothing could keep are written out; a send still going says so.
  const note = receiptNoteFor(t, sending, handle);
  const receiptLabel = receiptLabelFor(t, note?.kind);
  // Said once the receipt is up, and again as a send that was going settles.
  const spoken =
    !ended || note?.kind === "sending"
      ? null
      : (note?.text ??
        t(($) => $.gratitude.announcements.sent, { total: formatCount(ended.total), handle }));
  useEffect(() => {
    if (spoken !== null && live.current) live.current.textContent = spoken;
  }, [spoken]);
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
            aria-label={playing ? t(($) => $.gratitude.endAndSend) : t(($) => $.gratitude.close)}
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
          className={["gr-receipt is-on", note && "has-note", note?.detail && "has-detail"]
            .filter(Boolean)
            .join(" ")}
          style={large ? drag.style : undefined}
          aria-label={receiptLabel}
        >
          <div className="gr-rc-row" {...(large ? drag.handlers : {})}>
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
              <p className="gr-rc-head keep-phrases">
                {t(($) => $.gratitude.receipt.gratitudeTo, { handle })}
              </p>
              <div className="gr-rc-sub">
                <div className="gr-rc-combo">
                  <HitCounter hits={ended.hits} />
                  <p className="fine">
                    {t(($) => $.gratitude.receipt.bestMultiplier, {
                      multiplier: ended.peakMult.toFixed(1),
                    })}
                  </p>
                </div>
                <p className="fine">
                  {TIER_NAMES[ended.peakTier].jp}
                  {tierGloss && ` ${tierGloss}`}
                </p>
              </div>
            </div>
          </div>
          {note && (
            <div className={`gr-rc-note is-${note.kind}`}>
              <p>{note.text}</p>
              {note.detail && <ErrorDetail text={note.detail} />}
            </div>
          )}
          <div className="gr-rc-actions">
            <LabelButton block icon={<StickerBoardIcon />} onClick={leave}>
              {t(($) => $.ui.backToBoard)}
            </LabelButton>
          </div>
        </section>
      )}
      {/* In plain words: the engine logs what went wrong to the console. */}
      {failed && (
        <ErrorLine className="gr-failure">
          {ended
            ? t(($) => $.gratitude.failures.stoppedInPlay)
            : t(($) => $.gratitude.failures.stopped)}
        </ErrorLine>
      )}
    </div>
  );
  // Over the whole phone, tabs included, as the sticker detail is.
  return <PhonePortal eachRender>{screen}</PhonePortal>;
}
