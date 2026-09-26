import { useEffect, useId, useRef } from "react";
import { DrawIcon } from "../icons/DrawIcon";
import { Key } from "../ui/Key";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { TicketStubs } from "./TicketStubs";
import { ticketsLeft } from "./tickets";
import { useDailyTicketStubs } from "./useTicketStubs";
import { useTicketState } from "./useTickets";
import "./tickets.css";

interface Props {
  /** How long the drawing timer runs, for the card's line. */
  minutes: number;
  /** Spend a ticket on this sheet. */
  onStart: () => void;
  /** Keep the ticket; also what Escape does. */
  onBoard: () => void;
}

/**
 * Asks before a ticket is spent on a fresh sheet. It shares the out-of-tickets card's look: the day's
 * stubs, a line, the tear line and one key.
 */
export function StartDrawing({ minutes, onStart, onBoard }: Props) {
  const state = useTicketState();
  const stubs = useDailyTicketStubs(state);
  const left = ticketsLeft(state);
  const card = useRef<HTMLElement>(null);
  const id = useId();
  useFocusTrap(card, { onEscape: onBoard });

  useEffect(() => {
    card.current?.querySelector<HTMLElement>("button")?.focus();
  }, []);

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-line`}
        tabIndex={-1}
      >
        <TicketStubs className="out-of-tickets__art" size="large" stubs={stubs} />
        <h2 className="out-of-tickets__title" id={`${id}-title`}>
          Use a ticket to draw?
        </h2>
        <p className="out-of-tickets__line" id={`${id}-line`}>
          <strong>
            You have {left} ticket{left === 1 ? "" : "s"} left.
          </strong>{" "}
          <span className="out-of-tickets__quiet">
            Your {minutes}-minute timer starts with your first stroke.
          </span>
        </p>
        <TearLine />
        <Key className="out-of-tickets__key" icon={<DrawIcon />} onClick={onStart}>
          Start drawing
        </Key>
        <QuietLink className="out-of-tickets__quiet-link" onClick={onBoard}>
          Not now
        </QuietLink>
      </section>
    </div>
  );
}
