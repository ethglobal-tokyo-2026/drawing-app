import {
  ArrowUUpLeft,
  CaretRight,
  PaperPlaneTilt,
  Question,
  Sticker as StickerGlyph,
  X,
} from "@phosphor-icons/react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useFocusTrap } from "../ui/useFocusTrap";
import { useReducedMotion } from "../ui/useReducedMotion";
import { CantFindThem } from "./CantFindThem";
import { GiftBag } from "./GiftBag";
import type { GiftSender } from "./giftSender";
import { deviceGiftStore } from "./giftStore";
import type { GiveFlowState } from "./giveFlow";
import { createLocalGiftBackend } from "./localGiftBackend";
import { useGiveFlow } from "./useGiveFlow";
import "./Giving.css";

/** The sticker being given, as the board holds it. */
interface GivingSticker {
  id: string;
  no: number;
  timeUsed: number;
  createdAt: number;
  /** Its image, as an object URL. */
  url: string;
}

interface Props {
  sticker: GivingSticker;
  /** The giver's handle: the tag and the gift message read "From @alice". */
  fromHandle: string;
  sender: GiftSender;
  /** The LIFF app the gift message's link opens. */
  liffId: string;
  /** Closes Giving; `sent` is true once the sticker has gone. */
  onClose: (sent: boolean) => void;
}

/** Motion timings, in step with GiftBag.css: normal, then reduced. */
const PICKER_DELAY = [1150, 300] as const;
const TAKE_OUT = [380, 150] as const;
/** The bag shows open for a beat before it seals. */
const SEAL_AFTER = [280, 0] as const;

type Screen = "sheet" | "bag" | "sent";

const screenOf = (state: GiveFlowState): Screen =>
  state.step === "sheet" ? "sheet" : state.step === "sent" ? "sent" : "bag";

/** What the sheet shows: a screen, or "Can’t find them?" in the give sheet's place. */
type View = Screen | "cantFind";

/** Giving a sticker through a LINE chat: the give sheet, the gift bag, and the seal on send. */
export function Giving({ sticker, fromHandle, sender, liffId, onClose }: Props) {
  const reduced = useReducedMotion();
  const motion = reduced ? 1 : 0;
  const { state, flow } = useGiveFlow(() => ({
    sticker,
    sender,
    backend: createLocalGiftBackend({
      store: deviceGiftStore(),
      fromHandle,
      liffId,
    }),
    pickerDelayMs: PICKER_DELAY[motion],
    takeOutMs: TAKE_OUT[motion],
  }));
  const screen = screenOf(state);
  const [cantFind, setCantFind] = useState(false);
  const view: View = screen === "sheet" && cantFind ? "cantFind" : screen;
  const busy = state.step === "picking" || state.step === "takingOut";

  const close = () => {
    if (!busy) onClose(state.step === "sent");
  };

  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(root, { onEscape: () => (view === "cantFind" ? setCantFind(false) : close()) });
  // While LINE's picker is up it can't close, so Back leaves it where it is.
  useBackToClose(true, () => {
    close();
    return !busy;
  });
  // Back on "Can’t find them?" returns to the give sheet, as its back button does.
  useBackToClose(view === "cantFind", () => setCantFind(false));

  // Each new view slides in, except the first, which comes up with the sheet.
  const [shownView, setShownView] = useState(view);
  const [slideIn, setSlideIn] = useState(false);
  if (shownView !== view) {
    setShownView(view);
    setSlideIn(true);
  }
  const body = useRef<HTMLDivElement>(null);
  useEffect(() => {
    body.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus();
  }, [view]);

  const [sealed, setSealed] = useState(false);
  useEffect(() => {
    if (screen !== "sent") return;
    const timer = setTimeout(() => setSealed(true), SEAL_AFTER[motion]);
    return () => clearTimeout(timer);
  }, [screen, motion]);

  const bag = (bagState: "open" | "sealed", sealedAt?: number) => (
    <GiftBag
      stickerUrl={sticker.url}
      fromHandle={fromHandle}
      state={bagState}
      motion={state.step === "packed" ? "drop" : state.step === "takingOut" ? "takeOut" : undefined}
      sealedAt={sealedAt}
    />
  );

  let title: string;
  let content: ReactNode;
  if (view === "cantFind") {
    title = "Can’t find them?";
    content = (
      <CantFindThem
        onBack={() => setCantFind(false)}
        onShowAllChats={() => {
          setCantFind(false);
          flow?.chooseLineChat({ anyChat: true });
        }}
      />
    );
  } else if (state.step === "sheet") {
    title = `Give ${formatNo(sticker.no)}`;
    content = (
      <>
        <header className="giving__head">
          <h2 className="giving__title">{title}</h2>
          <button type="button" className="giving__icon-btn" onClick={close} aria-label="Close">
            <X size={20} />
          </button>
        </header>
        <button
          type="button"
          className="giving__row giving__row--aqua"
          data-press
          data-autofocus
          onClick={() => flow?.chooseLineChat()}
        >
          <span className="giving__row-icon">
            <PaperPlaneTilt size={20} />
          </span>
          <span className="giving__row-text">
            <b>Send in a LINE chat</b>
            <small>Pick one friend. It goes only to them.</small>
          </span>
          <CaretRight className="giving__row-chev" size={20} />
        </button>
        <QuietLink className="giving__cant-find" onClick={() => setCantFind(true)}>
          <Question /> Can’t find them?
        </QuietLink>
        <p className="giving__leaves">
          <StickerGlyph size={16} /> It comes off your board and into a gift bag.
        </p>
      </>
    );
  } else if (state.step === "sent") {
    title = "Sealed and sent";
    content = (
      <div className="giving__sent">
        {bag(sealed ? "sealed" : "open", state.sentAt)}
        <h2 className="giving__title">{title}</h2>
        <p className="giving__sub">
          It’s in your LINE chat now, and the gift message opens once. When they accept it, you’ll
          see who did.
        </p>
        {state.recordError && (
          <p className="giving__problem" role="alert">
            It went out in LINE, but this device couldn’t record it: {state.recordError}
          </p>
        )}
        <LabelButton
          block
          icon={<StickerBoardIcon size={18} />}
          data-autofocus
          onClick={() => onClose(true)}
        >
          Back to my sticker board
        </LabelButton>
      </div>
    );
  } else {
    const unsent = state.step === "notSent" || state.step === "failed";
    title = unsent ? "Not sent yet" : "In the bag";
    const problem =
      state.step === "failed"
        ? [
            state.error,
            state.recordError && `This device couldn’t record that: ${state.recordError}`,
          ]
        : state.step === "notSent" && state.recordError
          ? [`This device couldn’t record that: ${state.recordError}`]
          : [];
    content = (
      <>
        {/* Take it out is the quiet link under the key, its one control. */}
        <header className="giving__head">
          <h2 className="giving__title">{title}</h2>
        </header>
        <p className="giving__sub">
          {unsent
            ? "It’s still in the bag, unsealed. Pick a friend again, or take it out."
            : "It seals when it’s sent. Pick one friend in LINE: the message goes only to your chat with them."}
        </p>
        {problem.filter(Boolean).map((line) => (
          <p key={String(line)} className="giving__problem" role="alert">
            {line}
          </p>
        ))}
        {bag("open")}
        <div className="giving__acts">
          <Key
            tone="aqua"
            icon={<PaperPlaneTilt weight="fill" />}
            onClick={() => flow?.sendInLine()}
            disabled={busy}
            data-autofocus
          >
            Send in LINE
          </Key>
          <QuietLink onClick={() => flow?.takeOut()} disabled={busy}>
            <ArrowUUpLeft /> Take it out
          </QuietLink>
        </div>
      </>
    );
  }

  const phone = document.querySelector<HTMLElement>(".phone");
  const giving = (
    <div className="giving" ref={root} tabIndex={-1}>
      <div className="giving__piece" aria-hidden="true">
        {screen === "sheet" ? (
          <img className="giving__figure" src={sticker.url} alt="" draggable={false} />
        ) : (
          <span
            className="giving__given-sticker-silhouette"
            style={{ "--src": `url("${sticker.url}")` }}
          />
        )}
        <p className="fine giving__meta">
          {formatNo(sticker.no)} · <Duration seconds={sticker.timeUsed} /> ·{" "}
          {formatDay(sticker.createdAt)} · {formatHandle(fromHandle)}
        </p>
      </div>
      <div className="giving__scrim" onClick={close} />
      <Sheet label={title} onClose={close}>
        <div key={view} ref={body} className={`giving__body ${slideIn ? "is-in" : ""}`}>
          {content}
        </div>
      </Sheet>
    </div>
  );
  // Over the whole phone, tabs included, as a LIFF screen without the tabs.
  return phone ? createPortal(giving, phone) : giving;
}
