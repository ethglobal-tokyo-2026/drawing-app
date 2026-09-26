import liff from "@line/liff";
import { ArrowSquareOut, HandHeart, X } from "@phosphor-icons/react";
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
import type { GiftClaimRequest, GiftPreviewResponse } from "../api/contract";
import { useApi } from "../api/useApi";
import type { PersonView } from "../api/views";
import { GiftBag } from "../giving/GiftBag";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { useIdentity } from "../identity/useIdentity";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import { StickerFigure } from "../stickers/StickerFigure";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { PhotoSticker } from "../ui/PhotoSticker";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { receiveFlow, type GiftPreviewView } from "./receiveFlow";
import { previewFailedScreen, refusalScreen, type EndScreen } from "./refusals";
import { usePullTab } from "./usePullTab";
import "./receive-gift-dialog.css";

interface Props {
  /** From the gift message's link. */
  giftClaimToken: string;
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

/** How a person is printed: their handle, or their LINE name until they have one. */
const printed = (p: PersonView) => (p.handle ? formatHandle(p.handle) : p.name);

/**
 * Opening a gift message's link, over the whole phone: the sealed bag, the pull tab, the reveal and
 * Accept, or the reason the gift can't be received here. On the Back stack, as Not now is.
 */
export function ReceiveGiftDialog({ giftClaimToken, onClose }: Props) {
  const api = useApi();
  const me = useIdentity();
  const reduced = useReducedMotion();
  const motion = reduced ? 1 : 0;
  const [screen, dispatch] = useReducer(receiveFlow, { step: "opening" });
  const [attempt, setAttempt] = useState(0);
  // LINE says which chat opened the link; the server refuses group chats.
  const [claim] = useState<GiftClaimRequest>(() => ({
    giftClaimToken,
    liffContextType: liff.getContext()?.type ?? "none",
  }));
  const latestClose = useRef(onClose);
  useLayoutEffect(() => {
    latestClose.current = onClose;
  });

  // One preview per attempt, which StrictMode's second run of the effect shares.
  const previewing = useRef<{ attempt: number; answer: Promise<GiftPreviewResponse> } | null>(null);
  useEffect(() => {
    if (previewing.current?.attempt !== attempt) {
      previewing.current = { attempt, answer: api.previewGift(claim) };
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
  }, [api, claim, attempt]);

  // The reveal plays out from the snap: the stage glides up with the sheet, then the sticker rises.
  const [reveal, setReveal] = useState<"snapped" | "rising" | "out">("snapped");
  const opened = screen.step === "torn" || screen.step === "received";
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

  const pull = usePullTab({ reduced, onSnap: () => dispatch({ type: "tore" }) });

  // The giver stays known through the leave, so LINE's header keeps naming them.
  const shownGiver =
    screen.step === "sealed" || screen.step === "torn"
      ? screen.preview.giver
      : screen.step === "refused"
        ? screen.giver
        : null;
  const [giver, setGiver] = useState<PersonView | null>(null);
  if (shownGiver && shownGiver !== giver) setGiver(shownGiver);
  // The gift stays drawn through the leave after Accept, when the flow holds only its ID.
  const preview = screen.step === "sealed" || screen.step === "torn" ? screen.preview : null;
  const [shownPreview, setShownPreview] = useState<GiftPreviewView | null>(null);
  if (preview && preview !== shownPreview) setShownPreview(preview);
  const title = giver ? `A gift from ${printed(giver)}` : "A gift";
  // LINE's header shows the page title; App names the page again once the dialog closes.
  useEffect(() => {
    document.title = title;
  }, [title]);

  const busy = (screen.step === "torn" && screen.accepting) || screen.step === "received";
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

  // Outside LINE's app there's no LINE window to close, so the way out is the board.
  const leave = me.inClient
    ? { label: "Back to LINE", icon: <ArrowSquareOut /> }
    : { label: "Go to my sticker board", icon: <StickerBoardIcon size={18} /> };
  const backToLine = () => {
    // LIFF Mock can't close its window, so on the dev server the board shows instead.
    if (me.inClient) liff.closeWindow();
    onClose();
  };
  const tryAgain = () => {
    dispatch({ type: "retry" });
    setAttempt((n) => n + 1);
  };

  const accept = () => {
    if (screen.step !== "torn" || screen.accepting) return;
    const which = formatNo(screen.preview.sticker.no);
    dispatch({ type: "accept" });
    api.receiveGift(claim).then(
      (response) => dispatch({ type: "received", response }),
      (error: unknown) => {
        const failure = apiError(error);
        console.error(`Accepting ${which} failed`, failure);
        dispatch({ type: "acceptFailed", error: failure });
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
        accepting={screen.step === "torn" && screen.accepting}
        failed={screen.step === "torn" ? screen.failed : undefined}
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
    screen.step === "torn" && screen.accepting && "is-accepting",
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
  accepting: boolean;
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
  accepting,
  failed,
  onAccept,
  onNotNow,
}: GiftProps) {
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
        <h1 className="receive-gift__title">{giver.name} sent you a sticker</h1>
      </header>
      <div className="receive-gift__stage" {...(sealed ? pull.stage : {})}>
        <GiftBag
          size="receive"
          state={sealed ? "sealed" : "torn"}
          stickerUrl={reveal === "out" ? undefined : sticker.urls.png}
          fromHandle={giver.handle ?? undefined}
          sealedAt={preview.expiresAt - GIFT_WAIT_MS}
          tear={pull.tear}
          pullTab={sealed ? pull.pullTab : undefined}
        />
        {!sealed && (
          <span className="receive-gift__figure" aria-hidden="true">
            <span style={{ width: sticker.width * fit, height: sticker.height * fit }}>
              <StickerFigure urls={sticker.urls} width={sticker.width} height={sticker.height} />
            </span>
          </span>
        )}
      </div>
      <p className="receive-gift__hint" aria-hidden={!sealed || undefined}>
        <b>Pull the tab to open it</b>
        <span>or double-tap, or press and hold</span>
      </p>
      {!sealed && reveal !== "snapped" && (
        <Sheet label="Accept this sticker" onClose={onNotNow} className="receive-gift__sheet">
          <div className="receive-gift__copy">
            <p className="receive-gift__for">
              This sticker is for you, <b>{opener}</b>.
            </p>
            <p className="fine receive-gift__fine">
              {formatNo(sticker.no)} · <Duration seconds={sticker.timeUsed} /> ·{" "}
              {formatDay(sticker.sealedAt)} · by {printed(sticker.artist)}
            </p>
          </div>
          <div className="receive-gift__acts">
            {failed && (
              <p className="receive-gift__problem" role="alert">
                {formatNo(sticker.no)} wasn’t accepted: {failed}. Tap Accept to try again.
              </p>
            )}
            <Key
              tone="grape"
              size="lg"
              icon={<HandHeart />}
              onClick={onAccept}
              disabled={accepting}
              aria-busy={accepting || undefined}
              data-autofocus
            >
              {accepting ? "Accepting…" : "Accept"}
            </Key>
            <QuietLink onClick={onNotNow} disabled={accepting}>
              <X /> Not now
            </QuietLink>
            <p className="receive-gift__terms">
              Accepting shows {printed(giver)} your LINE name and picture. You agree to the{" "}
              <a href="/terms.html" onClick={openPage}>
                Terms
              </a>{" "}
              and{" "}
              <a href="/privacy.html" onClick={openPage}>
                Privacy Policy
              </a>
              .
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
            fromHandle={giverHandle}
          />
        )}
      </div>
      <div className="receive-gift__end-acts">
        {end.action === "tryAgain" ? (
          <>
            <LabelButton block onClick={onTryAgain} data-autofocus>
              Try again
            </LabelButton>
            <QuietLink onClick={onLeave}>
              {leave.icon} {leave.label}
            </QuietLink>
          </>
        ) : end.action === "board" ? (
          <LabelButton block icon={<StickerBoardIcon size={18} />} onClick={onBoard} data-autofocus>
            Go to my sticker board
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
