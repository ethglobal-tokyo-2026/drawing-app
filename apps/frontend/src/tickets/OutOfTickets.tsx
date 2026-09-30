import { useEffect, useId, useState } from "react";
import { Trans, useTranslation } from "../i18n/react";
import { BuyTicketsIcon, DrawIcon, StickerBoardIcon } from "../icons";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { TearLine } from "../ui/TearLine";
import { formatRefillIn, formatRefillTime, msUntilRefillLineChanges } from "./refill";
import { TicketArt } from "./TicketArt";
import { TicketCard } from "./TicketCard";
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
  const id = useId();
  const refilled = ticketsLeft(state) > 0;
  const boardLabel = overBoard
    ? t(($) => $.tickets.backToStickerBoard)
    : t(($) => $.tickets.goToStickerBoard);

  // Over the board the card dims the tab strip too (App.css), and a tap there closes it like its scrim.
  useEffect(() => {
    if (!overBoard) return;
    const onClick = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(".tabs")) return;
      e.preventDefault();
      e.stopPropagation();
      onBoard();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [overBoard, onBoard]);

  return (
    <TicketCard
      className={overBoard ? "out-of-tickets--over-board" : undefined}
      labelledBy={`${id}-title`}
      describedBy={refilled ? undefined : `${id}-line`}
      onEscape={onBoard}
      refocus={refilled}
      onScrimClick={overBoard ? onBoard : undefined}
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
    </TicketCard>
  );
}
