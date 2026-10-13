import { useEffect, useRef, useState, type ReactNode } from "react";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { usePersonSwitchBlocker } from "../api/PersonSwitchProvider";
import type { Problem } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { ArrowUUpLeft, PaperPlaneTilt, Question, StickerBoardIcon } from "../icons";
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
import { PhonePortal } from "../ui/PhonePortal";
import { CantFindThem, CantFindThemHead } from "./CantFindThem";
import { GiftBag } from "./GiftBag";
import type { GiftSender } from "./giftSender";
import type { GiveFlowState } from "./giveFlow";
import { createApiGiftBackend } from "./giftBackend";
import { useGiveFlow } from "./useGiveFlow";
import "./Giving.css";

/**
 * The closed bag the Gift Message shows. Messages already in chats keep these URLs, so the pictures
 * live at fixed paths outside the build's hashed assets: a redraw replaces them in place.
 */
const GIFT_MESSAGE_HERO = "/gift-message/hero.jpg";
const GIFT_MESSAGE_HERO_NSFW = "/gift-message/hero-nsfw.jpg";

/** The sticker being given, as the board holds it. */
interface GivingSticker {
  id: string;
  no: number;
  timeUsed: number;
  createdAt: number;
  /** Its image, as an object URL. */
  url: string;
  /** An NSFW sticker: it goes in the pink bag, and only someone with the NSFW opt-in can open it. */
  nsfw: boolean;
}

interface Props {
  sticker: GivingSticker;
  /** The giver's handle: the tag and the gift message read "From @alice". */
  fromHandle: string;
  sender: GiftSender;
  /** The LIFF app the gift message's link opens. */
  liffId: string;
  /** Closes Giving, as the giver does or once Take it out has the sticker back; `sent` once it's gone. */
  onClose: (sent: boolean) => void;
  /** Who the giver picked in the app, from their board: the gift waits on that person's board. */
  forUserId?: string;
  /** That person's handle: the bag's tag reads "For @bob", where a gift through LINE's picker reads "From @alice". */
  toHandle?: string;
  /** Where focus goes once Giving closes, when it opened as the give sheet went and never saw the opener. */
  returnFocus?: () => HTMLElement | null;
  /** Explicit action after acknowledged private delivery; the controller resumes this exact gift. */
  onSwitchRecipient?: (userId: string, giftId: string) => void;
}

/** Motion timings, in step with GiftBag.css: normal, then reduced. */
const TAKE_OUT = [380, 150] as const;
/** The bag shows open for a beat before it closes. */
const CLOSE_AFTER = [280, 0] as const;

type Screen = "bag" | "sent";

const screenOf = (state: GiveFlowState): Screen => (state.step === "sent" ? "sent" : "bag");

/** What the sheet shows: a screen, or "Can’t find them?" in Not sent yet's place. */
type View = Screen | "cantFind";

/**
 * Giving a sticker through a LINE chat: Give packs it into the gift bag at once, LINE's friend picker
 * sends it, and the bag closes on send.
 */
export function Giving({
  sticker,
  fromHandle,
  sender,
  liffId,
  onClose,
  forUserId,
  toHandle,
  returnFocus,
  onSwitchRecipient,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const motion = reduced ? 1 : 0;
  const api = useApi();
  const { id: userId } = useMe();
  const { state, flow } = useGiveFlow(() => ({
    sticker,
    sender,
    backend: createApiGiftBackend({
      api,
      userId,
      fromHandle,
      liffId,
      // The closed bag, never the sticker; the gift message drops it where the app isn't on HTTPS.
      heroUrl: new URL(sticker.nsfw ? GIFT_MESSAGE_HERO_NSFW : GIFT_MESSAGE_HERO, location.origin)
        .href,
      ...(forUserId && { forUserId }),
    }),
    takeOutMs: TAKE_OUT[motion],
  }));
  const recipientMismatch =
    state.packedForUserId !== undefined && state.packedForUserId !== (forUserId ?? null);
  const screen = screenOf(state);
  const unsent =
    state.step === "failed" ||
    (state.step === "ready" && (state.cancelled === true || state.error !== undefined));
  const [cantFind, setCantFind] = useState(false);
  const view: View = unsent && cantFind ? "cantFind" : screen;
  const preparing =
    state.step === "packed" || state.step === "preparing" || state.step === "retrying";
  const slow = (state.step === "packed" || state.step === "preparing") && state.slow === true;
  // Out of the bag, the sticker is back where it was given from, and Giving closes on it.
  const takenOut = state.step === "takenOut";
  const takingOut = state.step === "takingOut" || takenOut;
  // The gift's preparation and LINE's picker keep it open until their outcome is known.
  const busy = preparing || state.step === "picking" || takingOut;
  usePersonSwitchBlocker(
    !takenOut &&
      (state.step !== "sent" ||
        !!state.storageError ||
        ("recordError" in state && !!state.recordError) ||
        recipientMismatch),
    sticker.id,
  );
  // A long wait for the gift bag can be left by taking the sticker back out.
  const canTakeOut = !busy || slow;

  useEffect(() => {
    if (takenOut) onClose(false);
  }, [takenOut, onClose]);

  const close = () => {
    if (!busy) onClose(state.step === "sent");
  };
  // A busy key is aria-disabled, not disabled, so it keeps its face and its focus; the press
  // itself does nothing.
  const sendInLine = () => {
    if (!busy) flow?.sendInLine();
  };
  const retry = () => {
    if (!busy) flow?.retry();
  };
  const takeOut = () => {
    if (canTakeOut) flow?.takeOut();
  };
  const busyKey = busy ? ({ "aria-busy": true, "aria-disabled": true } as const) : {};

  // Back and Escape on "Can’t find them?" return to Not sent yet, as its back button does.
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
  // Without scrolling, since the sheet may still be rising from below the screen.
  useEffect(() => {
    body.current?.querySelector<HTMLElement>("[data-autofocus]")?.focus({ preventScroll: true });
  }, [view, state.step]);

  const [closed, setClosed] = useState(false);
  useEffect(() => {
    if (screen !== "sent") return;
    const timer = setTimeout(() => setClosed(true), CLOSE_AFTER[motion]);
    return () => clearTimeout(timer);
  }, [screen, motion]);

  const bag = (bagState: "open" | "closed", closedAt?: number) => (
    <GiftBag
      stickerUrl={sticker.url}
      fromHandle={fromHandle}
      {...(toHandle && !recipientMismatch && { toHandle })}
      state={bagState}
      motion={takingOut ? "takeOut" : screen === "bag" ? "drop" : undefined}
      closedAt={closedAt}
      nsfw={sticker.nsfw}
    />
  );

  let title: string;
  /** What screen readers hear after the title when the step changes. */
  let lead: string | null = null;
  // The view's header: the sheet's head, which a swipe down closes on a large screen. It slides in
  // with the body.
  let head: ReactNode = null;
  const slide = slideIn ? "is-in" : undefined;
  const titleHead = (heading: string) => (
    <header key={view} className={`giving__head ${slide ?? ""}`}>
      <h2 className="giving__title">{heading}</h2>
    </header>
  );
  let content: ReactNode;
  if (view === "cantFind") {
    title = t(($) => $.giving.cantFind.title);
    head = <CantFindThemHead key={view} className={slide} onBack={() => setCantFind(false)} />;
    content = <CantFindThem />;
  } else if (state.step === "sent") {
    const personDelivery = state.delivery === "person";
    const unconfirmed = personDelivery && !!state.recordError;
    title = unconfirmed
      ? t(($) => $.giving.personDelivery.unconfirmedTitle)
      : t(($) => $.giving.sent.title);
    lead = unconfirmed
      ? t(($) => $.giving.personDelivery.unconfirmedLead)
      : personDelivery
        ? t(($) => $.giving.personDelivery.sentLead)
        : t(($) => $.giving.sent.lead);
    content = (
      <div className="giving__sent">
        <div className="giving__scroll giving__sent-body">
          {bag(closed ? "closed" : "open", state.sentAt)}
          <h2 className="giving__title">{title}</h2>
          <p className="giving__sub keep-phrases">{lead}</p>
          {state.recordError && (
            <ErrorLine className="giving__problem" detail={state.recordError.detail}>
              {personDelivery
                ? t(($) => $.giving.personDelivery.couldntRecord, {
                    reason: state.recordError.message,
                  })
                : t(($) => $.giving.sent.couldntRecord, { reason: state.recordError.message })}
            </ErrorLine>
          )}
          {state.retryError && (
            <ErrorLine className="giving__problem" detail={state.retryError.detail}>
              {state.retryError.message}
            </ErrorLine>
          )}
        </div>
        {personDelivery && onSwitchRecipient && state.packedForUserId && state.giftId && (
          <LabelButton
            block
            disabled={!!state.recordError || !!state.storageError || recipientMismatch}
            onClick={() => {
              if (
                !state.recordError &&
                !state.storageError &&
                !recipientMismatch &&
                state.packedForUserId &&
                state.giftId
              ) {
                onSwitchRecipient(state.packedForUserId, state.giftId);
              }
            }}
          >
            {t(($) => $.giving.personDelivery.switchRecipient, {
              name: toHandle ? formatHandle(toHandle) : t(($) => $.giving.personDelivery.recipient),
            })}
          </LabelButton>
        )}
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
  } else if (state.step === "maybeSent" || state.step === "retrying") {
    // Retry closes the previous link before a fresh gift can be sent from its own LINE tap.
    title =
      state.step === "retrying"
        ? t(($) => $.giving.preparing.title)
        : t(($) => $.giving.lineSendError.title);
    lead =
      state.step === "retrying"
        ? t(($) => $.giving.lineSendError.retrying)
        : t(($) => $.giving.lineSendError.lead);
    head = titleHead(title);
    content = (
      <>
        <div className="giving__scroll">
          <p className="giving__sub keep-phrases">{lead}</p>
          {state.step === "maybeSent" && (
            <>
              <ErrorLine className="giving__problem" detail={state.error.detail}>
                {state.error.message}
              </ErrorLine>
              {state.retryError && (
                <ErrorLine className="giving__problem" detail={state.retryError.detail}>
                  {state.retryError.message}
                </ErrorLine>
              )}
            </>
          )}
          {bag("open")}
        </div>
        <div className="giving__acts">
          <Key
            tone="aqua"
            icon={<PaperPlaneTilt weight="fill" />}
            onClick={retry}
            data-press="off"
            {...busyKey}
            data-autofocus
          >
            {state.step === "retrying"
              ? t(($) => $.giving.preparing.button)
              : t(($) => $.giving.inTheBag.prepareAgain)}
          </Key>
        </div>
      </>
    );
  } else {
    title = preparing
      ? t(($) => $.giving.preparing.title)
      : takingOut
        ? t(($) => $.giving.takingOut.title)
        : unsent
          ? t(($) => $.giving.inTheBag.notSent)
          : t(($) => $.giving.inTheBag.title);
    if (preparing) {
      // Only a long wait says anything under the title: what it waits on, and that it can be left.
      lead = slow
        ? t(($) => $.giving.preparing.slow.lead, {
            waiting: t(($) => $.giving.preparing.slow[state.wait ?? "asking"]),
            leave: t(($) => $.giving.preparing.slow.leave),
          })
        : null;
    } else if (takingOut) {
      lead = t(($) => $.giving.takingOut.lead);
    } else {
      lead =
        state.delivery === "person"
          ? t(($) => $.giving.personDelivery.inTheBag)
          : unsent
            ? t(($) => $.giving.inTheBag.notSentLead)
            : t(($) => $.giving.inTheBag.lead);
    }
    const couldntRecord = ({ message, detail }: Problem): Problem => ({
      message: t(($) => $.giving.inTheBag.couldntRecord, { reason: message }),
      detail,
    });
    const problems: Problem[] =
      state.step === "failed"
        ? [state.error, ...(state.recordError ? [couldntRecord(state.recordError)] : [])]
        : state.step === "ready" && state.error
          ? [state.error]
          : [];
    head = titleHead(title);
    content = (
      <>
        <div className="giving__scroll">
          {lead && <p className="giving__sub keep-phrases">{lead}</p>}
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
            data-press="off"
            {...busyKey}
            data-autofocus
          >
            {preparing
              ? t(($) => $.giving.preparing.button)
              : takingOut
                ? t(($) => $.giving.takingOut.button)
                : state.step === "failed"
                  ? t(($) => $.giving.inTheBag.prepareAgain)
                  : state.delivery === "person"
                    ? t(($) => $.giving.personDelivery.send)
                    : t(($) => $.giving.inTheBag.send)}
          </Key>
          {/* For a friend LINE's picker left out, before it opens again. */}
          {unsent && state.delivery !== "person" && (
            <QuietLink onClick={() => setCantFind(true)}>
              <Question /> {t(($) => $.giving.cantFind.title)}
            </QuietLink>
          )}
          <QuietLink onClick={takeOut} aria-disabled={!canTakeOut || undefined}>
            <ArrowUUpLeft /> {t(($) => $.giving.inTheBag.takeOut)}
          </QuietLink>
        </div>
        {/* On the open bag from Give on, so the giver reads it before the gift can go out. */}
        {sticker.nsfw && (
          <p className="fine giving__nsfw-note keep-phrases">
            {t(($) => $.giving.nsfw.whoCanOpen)}
          </p>
        )}
      </>
    );
  }

  const giving = (
    <div className="giving" ref={layer}>
      <div className="giving__sticker" aria-hidden="true">
        <span
          className="giving__given-sticker-silhouette"
          style={{ "--src": `url("${sticker.url}")` }}
        />
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
        returnFocus={returnFocus}
        head={head ?? undefined}
        card
        scrim="always"
      >
        <div
          key={view}
          ref={body}
          className={`giving__body giving__pinned ${slideIn ? "is-in" : ""}`}
        >
          {recipientMismatch && (
            <ErrorLine className="giving__problem">
              {t(($) => $.giving.recipientMismatch)}
            </ErrorLine>
          )}
          {state.storageError && (
            <ErrorLine className="giving__problem" detail={state.storageError.detail}>
              {state.storageError.message}
            </ErrorLine>
          )}
          {state.step === "maybeSent" && state.recordError && (
            <ErrorLine className="giving__problem" detail={state.recordError.detail}>
              {t(($) => $.giving.inTheBag.couldntRecord, { reason: state.recordError.message })}
            </ErrorLine>
          )}
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
  return <PhonePortal eachRender>{giving}</PhonePortal>;
}
