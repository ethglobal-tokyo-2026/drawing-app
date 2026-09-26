import { Storefront } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState } from "react";
import { DrawIcon } from "../icons/DrawIcon";
import { StickerBoardIcon } from "../icons/StickerBoardIcon";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { formatRefillIn, formatRefillTime, msUntilRefillLineChanges } from "./refill";
import { TicketCount, TicketCounts } from "./TicketCount";
import { TicketStubs } from "./TicketStubs";
import { dailyTickets, describeTickets, ticketsLeft, type Tickets } from "./tickets";
import "./tickets.css";

interface Props {
  /** Live: the card turns over when the refill brings tickets back. */
  tickets: Tickets;
  /** Open the ticket shop. */
  onShop: () => void;
  /** Draw, once there are tickets again. */
  onStartDrawing: () => void;
  /** The free way out, and what Escape does. */
  onBoard: () => void;
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
 * free path leads: the key goes to the sticker board and the ticket shop is label stock under it. If
 * tickets come back while it's open, it turns over in place and the key becomes Draw.
 */
export function OutOfTickets({ tickets: state, onShop, onStartDrawing, onBoard }: Props) {
  const { at, msLeft } = useRefillCountdown(state.nextRefillAt);
  const stubs = dailyTickets(state);
  const card = useRef<HTMLElement>(null);
  const id = useId();
  const refilled = ticketsLeft(state) > 0;

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
        <TicketStubs className="out-of-tickets__art" size="large" stubs={stubs} />
        <p className="out-of-tickets__reserve">
          <TicketCount kind="reserve" count={state.reserveLeft} />
          <span className="fine">Reserve</span>
        </p>
        {/* One title element for both, so screen readers hear it turn over. */}
        <h2 className="out-of-tickets__title" id={`${id}-title`} aria-live="polite">
          {refilled ? "New tickets are here" : "Out of tickets for today"}
        </h2>
        {!refilled && (
          <p className="out-of-tickets__line" id={`${id}-line`}>
            <strong>New daily tickets at {formatRefillTime(at)},</strong>{" "}
            <span className="out-of-tickets__quiet out-of-tickets__countdown">
              {formatRefillIn(msLeft)}
            </span>
          </p>
        )}
        <TearLine />
        {refilled ? (
          <Key
            className="out-of-tickets__key"
            icon={<DrawIcon />}
            aria-label={`Draw: you have ${describeTickets(state)}`}
            onClick={onStartDrawing}
          >
            Draw
            <TicketCounts state={state} className="ticket-counts--on-key" />
          </Key>
        ) : (
          <Key className="out-of-tickets__key" icon={<StickerBoardIcon />} onClick={onBoard}>
            Go to sticker board
          </Key>
        )}
        {refilled ? (
          <LabelButton block icon={<StickerBoardIcon />} onClick={onBoard}>
            Go to sticker board
          </LabelButton>
        ) : (
          <LabelButton block icon={<Storefront />} onClick={onShop}>
            Shop for tickets with Sui
          </LabelButton>
        )}
      </section>
    </div>
  );
}
