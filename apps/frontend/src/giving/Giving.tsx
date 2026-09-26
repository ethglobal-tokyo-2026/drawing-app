import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useApi } from "../api/useApi";
import { Trans, useTranslation } from "../i18n/react";
import {
  ArrowUUpLeft,
  CaretRight,
  PaperPlaneTilt,
  Question,
  StickerBoardIcon,
  Sticker as StickerGlyph,
  X,
} from "../icons";
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
import type { GiveFlowState } from "./giveFlow";
import heroPng from "./gift-message-hero.png";
import { createApiGiftBackend } from "./giftBackend";
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
  /** Who the giver picked in the app, from their board: the gift waits on that person's board. */
  forUserId?: string;
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
export function Giving({ sticker, fromHandle, sender, liffId, onClose, forUserId }: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const motion = reduced ? 1 : 0;
  const api = useApi();
  const { state, flow } = useGiveFlow(() => ({
    sticker,
    sender,
    backend: createApiGiftBackend({
      api,
      fromHandle,
      liffId,
      // The sealed bag, never the sticker; the gift message drops it where the app isn't on HTTPS.
      heroUrl: new URL(heroPng, location.origin).href,
      ...(forUserId && { forUserId }),
    }),
    pickerDelayMs: PICKER_DELAY[motion],
    takeOutMs: TAKE_OUT[motion],
  }));
  const screen = screenOf(state);
  const [cantFind, setCantFind] = useState(false);
  const view: View = screen === "sheet" && cantFind ? "cantFind" : screen;
  const preparing = state.step === "packed" || state.step === "preparing";
  const busy = preparing || state.step === "picking" || state.step === "takingOut";

  const close = () => {
    if (!busy) onClose(state.step === "sent");
  };

  const root = useRef<HTMLDivElement>(null);
  useFocusTrap(root, { onEscape: () => (view === "cantFind" ? setCantFind(false) : close()) });
  // Wallet confirmation and LINE's picker keep the gift open until their outcome is known.
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
    title = t(($) => $.giving.cantFind.title);
    content = <CantFindThem onBack={() => setCantFind(false)} />;
  } else if (state.step === "sheet") {
    title = t(($) => $.giving.give, { no: formatNo(sticker.no) });
    content = (
      <>
        <header className="giving__head">
          <h2 className="giving__title">{title}</h2>
          <button
            type="button"
            className="giving__icon-btn"
            onClick={close}
            aria-label={t(($) => $.giving.close)}
          >
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
            <b>{t(($) => $.giving.sheet.sendInChat)}</b>
            <small>{t(($) => $.giving.sheet.sendInChatHint)}</small>
          </span>
          <CaretRight className="giving__row-chev" size={20} />
        </button>
        <QuietLink className="giving__cant-find" onClick={() => setCantFind(true)}>
          <Question /> {t(($) => $.giving.cantFind.title)}
        </QuietLink>
        <p className="giving__leaves">
          <StickerGlyph size={16} /> {t(($) => $.giving.sheet.leaves)}
        </p>
      </>
    );
  } else if (state.step === "sent") {
    title = t(($) => $.giving.sent.title);
    content = (
      <div className="giving__sent">
        {bag(sealed ? "sealed" : "open", state.sentAt)}
        <h2 className="giving__title">{title}</h2>
        <p className="giving__sub">{t(($) => $.giving.sent.lead)}</p>
        {state.recordError && (
          <p className="giving__problem" role="alert">
            {t(($) => $.giving.sent.couldntRecord, { reason: state.recordError })}
          </p>
        )}
        <LabelButton
          block
          icon={<StickerBoardIcon size={18} />}
          data-autofocus
          onClick={() => onClose(true)}
        >
          {t(($) => $.giving.backToBoard)}
        </LabelButton>
      </div>
    );
  } else {
    const unsent = state.step === "notSent" || state.step === "failed";
    title = preparing
      ? t(($) => $.giving.preparing.title)
      : unsent
        ? t(($) => $.giving.inTheBag.notSent)
        : t(($) => $.giving.inTheBag.title);
    const couldntRecord = (reason: string) => t(($) => $.giving.inTheBag.couldntRecord, { reason });
    const problem =
      state.step === "failed"
        ? [state.error, state.recordError && couldntRecord(state.recordError)]
        : state.step === "notSent" && state.recordError
          ? [couldntRecord(state.recordError)]
          : [];
    content = (
      <>
        {/* Take it out is the quiet link under the key, its one control. */}
        <header className="giving__head">
          <h2 className="giving__title">{title}</h2>
        </header>
        <p className="giving__sub" role={preparing ? "status" : undefined}>
          {preparing
            ? t(($) => $.giving.preparing.lead)
            : unsent
              ? t(($) => $.giving.inTheBag.notSentLead)
              : t(($) => $.giving.inTheBag.lead)}
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
            {preparing ? t(($) => $.giving.preparing.button) : t(($) => $.giving.inTheBag.send)}
          </Key>
          <QuietLink onClick={() => flow?.takeOut()} disabled={busy}>
            <ArrowUUpLeft /> {t(($) => $.giving.inTheBag.takeOut)}
          </QuietLink>
        </div>
      </>
    );
  }

  const phone = document.querySelector<HTMLElement>(".phone");
  const giving = (
    <div className="giving" ref={root} tabIndex={-1}>
      <div className="giving__sticker" aria-hidden="true">
        {screen === "sheet" ? (
          <img className="giving__figure" src={sticker.url} alt="" draggable={false} />
        ) : (
          <span
            className="giving__given-sticker-silhouette"
            style={{ "--src": `url("${sticker.url}")` }}
          />
        )}
        <p className="fine giving__meta">
          <Trans
            i18nKey={($) => $.giving.meta}
            values={{ no: formatNo(sticker.no), day: formatDay(sticker.createdAt) }}
            components={{
              duration: <Duration seconds={sticker.timeUsed} />,
              // A handle is a component's text, not a value: Trans would read markup in a value.
              name: <>{formatHandle(fromHandle)}</>,
            }}
          />
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
