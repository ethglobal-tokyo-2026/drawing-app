import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import type { Problem } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import {
  ArrowUUpLeft,
  PaperPlaneTilt,
  Question,
  StickerBoardIcon,
  Sticker as StickerGlyph,
  X,
} from "../icons";
import { Duration } from "../stickers/Duration";
import { formatDay, formatHandle, formatNo } from "../stickers/format";
import { Handle } from "../stickers/Handle";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { Sheet } from "../ui/Sheet";
import { useBackToClose } from "../ui/useBackToClose";
import { useReducedMotion } from "../ui/useReducedMotion";
import { CantFindThem } from "./CantFindThem";
import { GiftBag } from "./GiftBag";
import type { GiftSender } from "./giftSender";
import type { GiveFlowState } from "./giveFlow";
import heroImage from "./gift-message-hero.jpg";
import nsfwHeroImage from "./gift-message-hero-nsfw.jpg";
import { createApiGiftBackend } from "./giftBackend";
import { useGiveFlow } from "./useGiveFlow";
import "../stickers/nsfw-img.css";
import "./Giving.css";

/** The sticker being given, as the board holds it. */
interface GivingSticker {
  id: string;
  no: number;
  timeUsed: number;
  createdAt: number;
  /** Its image, as an object URL. */
  url: string;
  /** An NSFW sticker: it goes in the pink bag, and only an adult can open it. */
  nsfw: boolean;
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
  /** That person's handle: the bag's tag reads "For @bob", where a gift through LINE's picker reads "From @alice". */
  toHandle?: string;
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
export function Giving({
  sticker,
  fromHandle,
  sender,
  liffId,
  onClose,
  forUserId,
  toHandle,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const motion = reduced ? 1 : 0;
  const api = useApi();
  const { id: userId } = useMe();
  const hintId = useId();
  const { state, flow } = useGiveFlow(() => ({
    sticker,
    sender,
    backend: createApiGiftBackend({
      api,
      userId,
      fromHandle,
      liffId,
      // The sealed bag, never the sticker; the gift message drops it where the app isn't on HTTPS.
      heroUrl: new URL(sticker.nsfw ? nsfwHeroImage : heroImage, location.origin).href,
      ...(forUserId && { forUserId }),
    }),
    pickerDelayMs: PICKER_DELAY[motion],
    takeOutMs: TAKE_OUT[motion],
  }));
  const screen = screenOf(state);
  const [cantFind, setCantFind] = useState(false);
  const view: View = screen === "sheet" && cantFind ? "cantFind" : screen;
  const preparing = state.step === "packed" || state.step === "preparing";
  const slow = (state.step === "packed" || state.step === "preparing") && state.slow === true;
  // The gift's preparation and LINE's picker keep it open until their outcome is known.
  const busy =
    preparing ||
    state.step === "picking" ||
    state.step === "takingOut" ||
    (state.step === "maybeSent" && Boolean(state.confirming));
  // A long wait for the gift bag can be left by taking the sticker back out.
  const canTakeOut = !busy || slow;

  // LINE's picker covers the page; once the page is back in view, its answer is due.
  useEffect(() => {
    if (!flow) return;
    const onVisible = () => {
      if (document.visibilityState === "visible") flow.pageShown();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [flow]);

  const close = () => {
    if (!busy) onClose(state.step === "sent");
  };
  // A busy key is aria-disabled, not disabled, so it keeps its face and its focus; the press
  // itself does nothing.
  const sendInLine = () => {
    if (!busy) flow?.sendInLine();
  };
  const takeOut = () => {
    if (canTakeOut) flow?.takeOut();
  };
  const busyKey = busy ? ({ "aria-busy": true, "aria-disabled": true } as const) : {};

  // Back and Escape on "Can’t find them?" return to the give sheet, as its back button does.
  useBackToClose(view === "cantFind", () => setCantFind(false));

  // Each new view slides in, except the first, which comes up with the sheet.
  const [shownView, setShownView] = useState(view);
  const [slideIn, setSlideIn] = useState(false);
  if (shownView !== view) {
    setShownView(view);
    setSlideIn(true);
  }
  const layer = useRef<HTMLDivElement>(null);
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
      {...(toHandle && { toHandle })}
      state={bagState}
      motion={state.step === "packed" ? "drop" : state.step === "takingOut" ? "takeOut" : undefined}
      sealedAt={sealedAt}
      nsfw={sticker.nsfw}
    />
  );

  let title: string;
  /** What screen readers hear after the title when the step changes. */
  let lead: string | null = null;
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
        <div className="giving__acts">
          <Key
            tone="aqua"
            icon={<PaperPlaneTilt weight="fill" />}
            onClick={() => flow?.chooseLineChat()}
            aria-describedby={hintId}
            data-autofocus
          >
            {t(($) => $.giving.sheet.sendInChat)}
          </Key>
          <p className="giving__hint" id={hintId}>
            {t(($) => $.giving.sheet.sendInChatHint)}
          </p>
          <QuietLink onClick={() => setCantFind(true)}>
            <Question /> {t(($) => $.giving.cantFind.title)}
          </QuietLink>
        </div>
        <p className="giving__leaves">
          <StickerGlyph size={16} /> {t(($) => $.giving.sheet.leaves)}
        </p>
        {sticker.nsfw && (
          <p className="fine giving__nsfw-note">{t(($) => $.giving.nsfw.whoCanOpen)}</p>
        )}
      </>
    );
  } else if (state.step === "sent") {
    title = t(($) => $.giving.sent.title);
    lead = t(($) => $.giving.sent.lead);
    content = (
      <div className="giving__sent">
        <div className="giving__scroll giving__sent-body">
          {bag(sealed ? "sealed" : "open", state.sentAt)}
          <h2 className="giving__title">{title}</h2>
          <p className="giving__sub keep-phrases">{lead}</p>
          {state.recordError && (
            <ErrorLine className="giving__problem" detail={state.recordError.detail}>
              {t(($) => $.giving.sent.couldntRecord, { reason: state.recordError.message })}
            </ErrorLine>
          )}
        </div>
        <LabelButton
          block
          icon={<StickerBoardIcon size={18} />}
          data-autofocus
          onClick={() => onClose(true)}
        >
          {t(($) => $.ui.backToBoard)}
        </LabelButton>
      </div>
    );
  } else if (state.step === "maybeSent") {
    // No Send in LINE: if the gift message went out, a second one would put its link in two chats.
    title = t(($) => $.giving.maybeSent.title);
    lead = t(($) => $.giving.maybeSent.lead);
    content = (
      <>
        <header className="giving__head">
          <h2 className="giving__title">{title}</h2>
        </header>
        <div className="giving__scroll">
          <p className="giving__sub">{lead}</p>
          {bag("open")}
        </div>
        <div className="giving__acts">
          <Key
            tone="aqua"
            icon={<PaperPlaneTilt weight="fill" />}
            onClick={() => {
              if (!busy) flow?.itWentOut();
            }}
            {...busyKey}
            data-autofocus
          >
            {t(($) => $.giving.maybeSent.itWentOut)}
          </Key>
          <QuietLink onClick={takeOut} aria-disabled={!canTakeOut || undefined}>
            <ArrowUUpLeft /> {t(($) => $.giving.inTheBag.takeOut)}
          </QuietLink>
        </div>
      </>
    );
  } else {
    const unsent = state.step === "notSent" || state.step === "failed";
    title = preparing
      ? t(($) => $.giving.preparing.title)
      : state.step === "takingOut"
        ? t(($) => $.giving.takingOut.title)
        : unsent
          ? t(($) => $.giving.inTheBag.notSent)
          : t(($) => $.giving.inTheBag.title);
    if (preparing) {
      lead = slow
        ? t(($) => $.giving.preparing.slow.lead, {
            waiting: t(($) => $.giving.preparing.slow[state.wait ?? "asking"]),
            leave: t(($) => $.giving.preparing.slow.leave),
          })
        : t(($) => $.giving.preparing.lead);
    } else if (state.step === "takingOut") {
      lead = t(($) => $.giving.takingOut.lead);
    } else {
      lead = unsent ? t(($) => $.giving.inTheBag.notSentLead) : t(($) => $.giving.inTheBag.lead);
    }
    const couldntRecord = ({ message, detail }: Problem): Problem => ({
      message: t(($) => $.giving.inTheBag.couldntRecord, { reason: message }),
      detail,
    });
    const problems: Problem[] =
      state.step === "failed"
        ? [state.error, ...(state.recordError ? [couldntRecord(state.recordError)] : [])]
        : state.step === "notSent" && state.recordError
          ? [couldntRecord(state.recordError)]
          : [];
    content = (
      <>
        {/* Take it out is the quiet link under the key, its one control. */}
        <header className="giving__head">
          <h2 className="giving__title">{title}</h2>
        </header>
        <div className="giving__scroll">
          <p className="giving__sub">{lead}</p>
          {problems.map(({ message, detail }) => (
            <ErrorLine key={message} className="giving__problem" detail={detail}>
              {message}
            </ErrorLine>
          ))}
          {bag("open")}
        </div>
        <div className="giving__acts">
          <Key
            tone="aqua"
            icon={<PaperPlaneTilt weight="fill" />}
            onClick={sendInLine}
            {...busyKey}
            data-autofocus
          >
            {preparing
              ? t(($) => $.giving.preparing.button)
              : state.step === "takingOut"
                ? t(($) => $.giving.takingOut.button)
                : t(($) => $.giving.inTheBag.send)}
          </Key>
          <QuietLink onClick={takeOut} aria-disabled={!canTakeOut || undefined}>
            <ArrowUUpLeft /> {t(($) => $.giving.inTheBag.takeOut)}
          </QuietLink>
        </div>
      </>
    );
  }

  const phone = document.querySelector<HTMLElement>(".phone");
  const giving = (
    <div className="giving" ref={layer}>
      <div className="giving__scrim" onClick={close} />
      <div className="giving__sticker" aria-hidden="true">
        {screen === "sheet" ? (
          <img
            className={`giving__figure ${sticker.nsfw ? "nsfw-img" : ""}`}
            src={sticker.url}
            alt=""
            draggable={false}
          />
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
              name: <Handle name={formatHandle(fromHandle)} />,
            }}
          />
        </p>
      </div>
      <Sheet
        label={title}
        layer={layer}
        onClose={close}
        onEscape={view === "cantFind" ? () => setCantFind(false) : undefined}
        busy={busy}
      >
        <div
          key={view}
          ref={body}
          className={`giving__body giving__pinned ${slideIn ? "is-in" : ""}`}
        >
          {content}
        </div>
      </Sheet>
      {/* One status line for the whole flow, so each step is heard as it comes. */}
      <p className="visually-hidden" role="status">
        {lead && t(($) => $.giving.stepHeard, { title, lead })}
      </p>
    </div>
  );
  // Over the whole phone, tabs included, as a LIFF screen without the tabs.
  return phone ? createPortal(giving, phone) : giving;
}
