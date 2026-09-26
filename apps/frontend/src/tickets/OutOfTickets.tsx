import { useEffect, useId, useRef, useState } from "react";
import { Trans, useTranslation } from "../i18n/react";
import { BuyTicketsIcon, DrawIcon, StickerBoardIcon } from "../icons";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { formatRefillIn, formatRefillTime, msUntilRefillLineChanges } from "./refill";
import { TicketArt } from "./TicketArt";
import { describeTickets, ticketsLeft, ticketView, type Tickets } from "./tickets";
import "./tickets.css";

interface Props {
  /** Live: the card turns over when the refill brings tickets back. */
  tickets: Tickets;
  /** Open the reserve ticket checkout. */
  onShop: () => void;
  /** Draw, once there are tickets again. */
  onStartDrawing: () => void;
  /** The free way out, and what Escape does. */
  onBoard: () => void;
  /** It's up over the sticker board (Draw with no tickets), so the way out goes back to the board. */
  overBoard?: boolean;
}

/** Counts down to the refill the card opened with, waking only when the refill line would change. */
function useRefillCountdown(refillAt: string) {
  const [at] = useState(() => new Date(refillAt));
  const [now, setNow] = useState(() => Date.now());
  const msLeft = at.getTime() - now;
  useEffect(() => {
    if (msLeft <= 0) return;
    const id = setTimeout(() => setNow(Date.now()), msUntilRefillLineChanges(msLeft));
    return () => clearTimeout(id);
  }, [msLeft]);
  return { at, msLeft };
}

/**
 * Out of daily and reserve tickets: the day's used stubs, when new ones arrive, and the ways on. The
 * free path leads: the key goes to the sticker board and buying reserve tickets is label stock under it. If
 * tickets come back while it's open, it turns over in place and the key becomes Draw.
 */
export function OutOfTickets({
  tickets: state,
  onShop,
  onStartDrawing,
  onBoard,
  overBoard = false,
}: Props) {
  const { t } = useTranslation();
  const { at, msLeft } = useRefillCountdown(state.nextRefillAt);
  const card = useRef<HTMLElement>(null);
  const id = useId();
  const refilled = ticketsLeft(state) > 0;
  const boardLabel = overBoard
    ? t(($) => $.tickets.backToStickerBoard)
    : t(($) => $.tickets.goToStickerBoard);

  useFocusTrap(card, { onEscape: onBoard });

  // Each view's first control takes focus, so focus never drops out of the card when its controls change.
  useEffect(() => {
    const first = card.current?.querySelector<HTMLElement>("button:not(:disabled)");
    (first ?? card.current)?.focus();
  }, [refilled]);

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={refilled ? undefined : `${id}-line`}
        tabIndex={-1}
      >
        <TicketArt view={ticketView(state)} />
        {/* One title element for both, so screen readers hear it turn over. */}
        <h2 className="out-of-tickets__title" id={`${id}-title`} aria-live="polite">
          {refilled
            ? t(($) => $.tickets.outOfTickets.refilled)
            : t(($) => $.tickets.outOfTickets.title)}
        </h2>
        {!refilled && (
          <p className="out-of-tickets__line" id={`${id}-line`}>
            <Trans
              i18nKey={($) => $.tickets.outOfTickets.refillLine}
              values={{ time: formatRefillTime(at), countdown: formatRefillIn(msLeft) }}
              components={{
                strong: <strong />,
                countdown: <span className="out-of-tickets__quiet out-of-tickets__countdown" />,
              }}
            />
          </p>
        )}
        <TearLine />
        {refilled ? (
          <Key
            className="out-of-tickets__key"
            icon={<DrawIcon />}
            aria-label={t(($) => $.tickets.drawWithTickets, { tickets: describeTickets(state) })}
            onClick={onStartDrawing}
          >
            {t(($) => $.tickets.draw)}
          </Key>
        ) : (
          <Key className="out-of-tickets__key" icon={<StickerBoardIcon />} onClick={onBoard}>
            {boardLabel}
          </Key>
        )}
        {refilled ? (
          <LabelButton block icon={<StickerBoardIcon />} onClick={onBoard}>
            {boardLabel}
          </LabelButton>
        ) : (
          <LabelButton block icon={<BuyTicketsIcon />} onClick={onShop}>
            {t(($) => $.tickets.buyReserveTickets)}
          </LabelButton>
        )}
      </section>
    </div>
  );
}
