import liff from "@line/liff";
import {
  useEffect,
  useLayoutEffect,
  useReducer,
  useRef,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { apiError } from "../api/apiClient";
import type { GiftPreview } from "@drawing-app/api/client";
import type { GiftOpening } from "../api/apiClient";
import { useApi } from "../api/useApi";
import type { PersonView } from "../api/views";
import { GiftBag } from "../giving/GiftBag";
import { Trans, useTranslation } from "../i18n/react";
import { ArrowSquareOut, HandHeart, StickerBoardIcon, X } from "../icons";
import { useIdentity } from "../identity/useIdentity";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import { useLight } from "../stickers/light";
import { StickerFigure } from "../stickers/StickerFigure";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import type { GiftForYou } from "./GiftsForYouBadge";
import { receiveFlow, type GiftPreviewView } from "./receiveFlow";
import { previewFailedScreen, refusalScreen, type EndScreen } from "./refusals";
import { usePullTab } from "./usePullTab";
import "./receive-gift-dialog.css";

/** The gift message's link's token, or a gift waiting for you, opened from your board. */
export type GiftFrom = { giftClaimToken: string } | { gift: GiftForYou };

interface Props {
  from: GiftFrom;
  /** Closes the dialog; with the received sticker's ID once Accept has received it. */
  onClose: (receivedStickerId?: string) => void;
}

/** The reveal after the snap, in step with receive-gift-dialog.css: normal, then reduced. */
const RISE_AFTER = [380, 0] as const;
const OUT_AFTER = [720, 0] as const;
/** The copy fades, the sheet drops and the bag falls before the board shows. */
const LEAVE_MS = [320, 150] as const;
/** The box the sticker fills inside the bag, and rises out of it in. */
const FIGURE_PX = 200;
/** Gifts wait a week from the seal; the preview says when the wait ends, so the tape's date is a week before. */
const GIFT_WAIT_MS = 7 * 24 * 60 * 60 * 1000;

/** Where the gift comes from: its gift message's link, or your board, where it waits for you. */
type Opening = { claim: GiftOpening } | { gift: GiftForYou };

/** A waiting gift came with everything its preview shows, and can be received. */
const previewOfWaiting = ({ gift, giver, sticker }: GiftForYou): GiftPreview => ({
  giver,
  expiresAt: gift.expiresAt,
  receivable: true,
  refusal: null,
  sticker,
});

/** How a person is printed: their handle, or their LINE name until they have one. */
const printed = (p: PersonView) => (p.handle ? formatHandle(p.handle) : p.name);

/**
 * Opening a gift message's link, over the whole phone: the sealed bag, the pull tab, the reveal and
 * Accept, or the reason the gift can't be received here. On the Back stack, as Not now is.
 */
export function ReceiveGiftDialog({ from, onClose }: Props) {
  const { t } = useTranslation();
  const api = useApi();
  const me = useIdentity();
  const reduced = useReducedMotion();
  const motion = reduced ? 1 : 0;
  useLight();
  const [screen, dispatch] = useReducer(receiveFlow, { step: "opening" });
  const [attempt, setAttempt] = useState(0);
  // LINE says which chat opened the link; the server refuses group chats. A gift from the board
  // needs no link: it's waiting for you.
  const [opening] = useState<Opening>(() =>
    "giftClaimToken" in from
      ? {
          claim: {
            giftClaimToken: from.giftClaimToken,
            liffContextType: liff.getContext()?.type ?? "none",
          },
        }
      : { gift: from.gift },
  );
  const latestClose = useRef(onClose);
  useLayoutEffect(() => {
    latestClose.current = onClose;
  });

  // One preview per attempt, which StrictMode's second run of the effect shares.
  const previewing = useRef<{ attempt: number; answer: Promise<GiftPreview> } | null>(null);
  useEffect(() => {
    if (previewing.current?.attempt !== attempt) {
      const answer =
        "claim" in opening
          ? api.previewGift(opening.claim)
          : Promise.resolve(previewOfWaiting(opening.gift));
      previewing.current = { attempt, answer };
    }
    let current = true;
    previewing.current.answer.then(
      (preview) => {
        if (current) dispatch({ type: "previewed", preview });
      },
      (error: unknown) => {
        if (!current) return;
        const failure = apiError(error);
        console.error("Opening the gift failed", failure);
        dispatch({ type: "previewFailed", error: failure });
      },
    );
    return () => {
      current = false;
    };
  }, [api, opening, attempt]);

  // The reveal plays out from the snap: the stage glides up with the sheet, then the sticker rises.
  const [reveal, setReveal] = useState<"snapped" | "rising" | "out">("snapped");
  const opened = screen.step === "unpackaged" || screen.step === "received";
  useEffect(() => {
    if (!opened) return;
    const timers = [
      setTimeout(() => setReveal("rising"), RISE_AFTER[motion]),
      setTimeout(() => setReveal("out"), OUT_AFTER[motion]),
    ];
    return () => timers.forEach(clearTimeout);
  }, [opened, motion]);

  useEffect(() => {
    if (screen.step !== "received") return;
    const { stickerId } = screen;
    const timer = setTimeout(() => latestClose.current(stickerId), LEAVE_MS[motion]);
    return () => clearTimeout(timer);
  }, [screen, motion]);

  const pull = usePullTab({ reduced, onSnap: () => dispatch({ type: "unpackaged" }) });

  // The giver stays known through the leave, so LINE's header keeps naming them.
  const shownGiver =
    screen.step === "sealed" || screen.step === "unpackaged"
      ? screen.preview.giver
      : screen.step === "refused"
        ? screen.giver
        : null;
  const [giver, setGiver] = useState<PersonView | null>(null);
  if (shownGiver && shownGiver !== giver) setGiver(shownGiver);
  // The gift stays drawn through the leave after Accept, when the flow holds only its ID.
  const preview = screen.step === "sealed" || screen.step === "unpackaged" ? screen.preview : null;
  const [shownPreview, setShownPreview] = useState<GiftPreviewView | null>(null);
  if (preview && preview !== shownPreview) setShownPreview(preview);
  const title = t(($) => $.receiving.title, {
    name: giver ? printed(giver) : "",
    context: giver ? undefined : "unknownGiver",
  });
  // LINE's header shows the page title; App names the page again once the dialog closes.
  useEffect(() => {
    document.title = title;
  }, [title]);

  const busy = (screen.step === "unpackaged" && screen.receiving) || screen.step === "received";
  const close = () => {
    if (!busy) onClose();
  };
  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(root, { onEscape: close });
  useBackToClose(true, () => {
    close();
    return !busy;
  });
  // Each screen's control takes focus as it comes: the slider, Accept, a refusal's button.
  useEffect(() => {
    root.current?.querySelector<HTMLElement>("[data-autofocus], [role=slider]")?.focus();
  }, [screen.step, reveal]);

  // Outside LINE's app, or opened from the board, there's no LINE window to go back to: the way out
  // is the board.
  const fromBoard = "gift" in opening;
  const leave =
    me.inClient && !fromBoard
      ? { label: t(($) => $.receiving.backToLine), icon: <ArrowSquareOut /> }
      : { label: t(($) => $.receiving.goToStickerBoard), icon: <StickerBoardIcon size={18} /> };
  const backToLine = () => {
    // Outside LINE's app there's no window to close, so the board shows instead.
    if (me.inClient && !fromBoard) liff.closeWindow();
    onClose();
  };
  const tryAgain = () => {
    dispatch({ type: "retry" });
    setAttempt((n) => n + 1);
  };

  const accept = () => {
    if (screen.step !== "unpackaged" || screen.receiving) return;
    const which = formatNo(screen.preview.sticker.no);
    dispatch({ type: "receive" });
    const receiving =
      "claim" in opening
        ? api.receiveGift(opening.claim)
        : api.receiveGiftForYou(opening.gift.gift.id);
    receiving.then(
      (response) => dispatch({ type: "received", response }),
      (error: unknown) => {
        const failure = apiError(error);
        console.error(`Receiving ${which} failed`, failure);
        dispatch({ type: "receiveFailed", error: failure });
      },
    );
  };

  let body: ReactNode;
  if (screen.step === "opening") {
    body = (
      <div className="receive-gift__stage" aria-hidden="true">
        <span className="receive-gift__outline" />
      </div>
    );
  } else if (screen.step === "refused" || screen.step === "failed") {
    const end =
      screen.step === "refused"
        ? refusalScreen(screen.refusal, screen.giver)
        : previewFailedScreen(screen.message);
    const refusedGiver = screen.step === "refused" ? screen.giver : null;
    body = (
      <Refusal
        end={end}
        giverHandle={refusedGiver?.handle ?? undefined}
        leave={leave}
        onLeave={backToLine}
        onBoard={() => onClose()}
        onTryAgain={tryAgain}
      />
    );
  } else if (shownPreview) {
    body = (
      <Gift
        preview={shownPreview}
        sealed={screen.step === "sealed"}
        reveal={reveal}
        pull={pull}
        opener={me.displayName}
        receiving={screen.step === "unpackaged" && screen.receiving}
        failed={screen.step === "unpackaged" ? screen.failed : undefined}
        onAccept={accept}
        onNotNow={close}
      />
    );
  }

  // Resolved once, so the dialog never moves between the page and the phone, which would remount it.
  const [phone] = useState(() => document.querySelector<HTMLElement>(".phone"));
  const classes = [
    "receive-gift",
    `is-${screen.step}`,
    screen.step === "unpackaged" && screen.receiving && "is-receiving",
    reveal !== "snapped" && "is-rising",
    reveal === "out" && "is-out",
  ];
  const dialog = (
    <div
      ref={root}
      className={classes.filter(Boolean).join(" ")}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      aria-busy={screen.step === "opening" || undefined}
      tabIndex={-1}
    >
      {body}
    </div>
  );
  return phone ? createPortal(dialog, phone) : dialog;
}

interface GiftProps {
  preview: GiftPreviewView;
  sealed: boolean;
  reveal: "snapped" | "rising" | "out";
  pull: ReturnType<typeof usePullTab>;
  /** The opener's LINE name. */
  opener: string;
  receiving: boolean;
  failed?: string;
  onAccept: () => void;
  onNotNow: () => void;
}

/** The gift itself: the sealed bag and its pull tab, then the reveal and Accept. */
function Gift({
  preview,
  sealed,
  reveal,
  pull,
  opener,
  receiving,
  failed,
  onAccept,
  onNotNow,
}: GiftProps) {
  const { t } = useTranslation();
  const { giver, sticker } = preview;
  const fit = FIGURE_PX / Math.max(sticker.width, sticker.height);
  const openPage = (e: MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    liff.openWindow({ url: e.currentTarget.href, external: false });
  };
  return (
    <>
      <header className="receive-gift__head">
        <PhotoSticker src={giver.pictureUrl} name={giver.name} size={46} />
        <h1 className="receive-gift__title">
          {t(($) => $.receiving.gift.title, { name: giver.name })}
        </h1>
      </header>
      <div className="receive-gift__stage" {...(sealed ? pull.stage : {})}>
        <GiftBag
          size="receive"
          state={sealed ? "sealed" : "torn"}
          stickerUrl={reveal === "out" ? undefined : sticker.urls.png}
          fromHandle={giver.handle ?? undefined}
          sealedAt={preview.expiresAt - GIFT_WAIT_MS}
          nsfw={sticker.nsfw}
          tear={pull.tear}
          pullTab={sealed ? pull.pullTab : undefined}
        />
        {!sealed && (
          <span className="receive-gift__figure" aria-hidden="true">
            <span style={{ width: sticker.width * fit, height: sticker.height * fit }}>
              <StickerFigure
                urls={sticker.urls}
                width={sticker.width}
                height={sticker.height}
                foil="detail"
                nsfw={sticker.nsfw}
                no={sticker.no}
              />
            </span>
          </span>
        )}
      </div>
      <p className="receive-gift__hint" aria-hidden={!sealed || undefined}>
        <Trans
          i18nKey={($) => $.receiving.gift.pullTabHint}
          components={{ b: <b />, span: <span /> }}
        />
      </p>
      {!sealed && reveal !== "snapped" && (
        <Sheet
          label={t(($) => $.receiving.gift.acceptSheet)}
          onClose={onNotNow}
          className="receive-gift__sheet"
        >
          <div className="receive-gift__copy">
            <p className="receive-gift__for">
              <Trans
                i18nKey={($) => $.receiving.gift.forYou}
                components={{
                  // Names are components' text, not values: Trans would read markup in a value.
                  name: <b>{opener}</b>,
                }}
              />
            </p>
            <p className="fine receive-gift__fine">
              <Trans
                i18nKey={($) => $.receiving.gift.finePrint}
                values={{ no: formatNo(sticker.no), day: formatDay(sticker.sealedAt) }}
                components={{
                  duration: <Duration seconds={sticker.timeUsed} />,
                  artist: <>{printed(sticker.artist)}</>,
                }}
              />
            </p>
          </div>
          <div className="receive-gift__acts">
            {failed && (
              <p className="receive-gift__problem" role="alert">
                {t(($) => $.receiving.gift.notReceived, {
                  no: formatNo(sticker.no),
                  reason: failed,
                })}
              </p>
            )}
            <Key
              tone="grape"
              size="lg"
              icon={<HandHeart />}
              onClick={onAccept}
              disabled={receiving}
              aria-busy={receiving || undefined}
              data-autofocus
            >
              {receiving ? t(($) => $.receiving.gift.accepting) : t(($) => $.receiving.gift.accept)}
            </Key>
            <QuietLink onClick={onNotNow} disabled={receiving}>
              <X /> {t(($) => $.receiving.gift.notNow)}
            </QuietLink>
            <p className="receive-gift__terms">
              <Trans
                i18nKey={($) => $.receiving.termsLine}
                components={{
                  name: <>{printed(giver)}</>,
                  terms: <a href={t(($) => $.pages.terms)} onClick={openPage} />,
                  privacy: <a href={t(($) => $.pages.privacy)} onClick={openPage} />,
                }}
              />
            </p>
          </div>
        </Sheet>
      )}
    </>
  );
}

interface RefusalProps {
  end: EndScreen;
  giverHandle?: string;
  leave: { label: string; icon: ReactNode };
  onLeave: () => void;
  onBoard: () => void;
  onTryAgain: () => void;
}

/** A gift that can't be received here: why, the bag as it stands, and the one way on. */
function Refusal({ end, giverHandle, leave, onLeave, onBoard, onTryAgain }: RefusalProps) {
  const { t } = useTranslation();
  return (
    <>
      <header className="receive-gift__end-head">
        <h1 className="receive-gift__title">{end.title}</h1>
        <p className="receive-gift__sub">{end.line}</p>
      </header>
      <div className="receive-gift__prop">
        {end.bag && (
          <GiftBag
            size="receive"
            state={end.bag.state}
            stamp={end.bag.stamp}
            nsfw={end.bag.nsfw}
            fromHandle={giverHandle}
          />
        )}
      </div>
      <div className="receive-gift__end-acts">
        {end.action === "tryAgain" ? (
          <>
            <LabelButton block onClick={onTryAgain} data-autofocus>
              {t(($) => $.receiving.tryAgain)}
            </LabelButton>
            <QuietLink onClick={onLeave}>
              {leave.icon} {leave.label}
            </QuietLink>
          </>
        ) : end.action === "board" ? (
          <LabelButton block icon={<StickerBoardIcon size={18} />} onClick={onBoard} data-autofocus>
            {t(($) => $.receiving.goToStickerBoard)}
          </LabelButton>
        ) : (
          <LabelButton block icon={leave.icon} onClick={onLeave} data-autofocus>
            {leave.label}
          </LabelButton>
        )}
      </div>
    </>
  );
}
