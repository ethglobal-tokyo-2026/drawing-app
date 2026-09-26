import { Storefront } from "@phosphor-icons/react";
import { useEffect, useId, useRef } from "react";
import { DrawIcon } from "../icons/DrawIcon";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { formatRefillTime } from "./refill";
import { TicketCount } from "./TicketCount";
import { TicketStubs } from "./TicketStubs";
import { dailyLeft, nextRefill, type TicketKind } from "./tickets";
import { useDailyTicketStubs } from "./useTicketStubs";
import { useTicketState } from "./useTickets";
import "./tickets.css";

interface Props {
  /** How long the drawing timer runs, for the card's line. */
  minutes: number;
  /** Said under the line, such as what became of a drawing a reload interrupted; null for nothing. */
  note: string | null;
  /** Spend a ticket of this kind on this sheet. */
  onStart: (kind: TicketKind) => void;
  /** Open the ticket shop. */
  onShop: () => void;
  /** Keep the ticket; also what Escape does. */
  onBoard: () => void;
}

const count = (n: number, kind: TicketKind) => `${n} ${kind} ${n === 1 ? "ticket" : "tickets"}`;

/**
 * Asks before a ticket is spent on a fresh sheet, showing the day's daily stubs and the reserve count.
 * With daily tickets left it spends one; once they're gone it asks before spending a reserve ticket,
 * with the ticket shop as the other way on. It shares the out-of-tickets card's look.
 */
export function StartDrawing({ minutes, note, onStart, onShop, onBoard }: Props) {
  const state = useTicketState();
  const stubs = useDailyTicketStubs(state);
  const daily = dailyLeft(state);
  const reserveAsk = daily === 0;
  const card = useRef<HTMLElement>(null);
  const id = useId();
  useFocusTrap(card, { onEscape: onBoard });

  useEffect(() => {
    card.current?.querySelector<HTMLElement>("button")?.focus();
  }, [reserveAsk]);

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={note ? `${id}-line ${id}-note` : `${id}-line`}
        tabIndex={-1}
      >
        <TicketStubs className="out-of-tickets__art" size="large" stubs={stubs} />
        <p className="out-of-tickets__reserve">
          <TicketCount kind="reserve" count={state.reserve} />
          <span className="fine">Reserve</span>
        </p>
        <h2 className="out-of-tickets__title" id={`${id}-title`}>
          {reserveAsk ? "Use a reserve ticket?" : "Use a ticket to draw?"}
        </h2>
        <p className="out-of-tickets__line" id={`${id}-line`}>
          {reserveAsk ? (
            <>
              <strong>
                Today’s daily tickets are used. You have {count(state.reserve, "reserve")}.
              </strong>{" "}
              <span className="out-of-tickets__quiet">
                New daily tickets at {formatRefillTime(nextRefill(new Date()))}.
              </span>
            </>
          ) : (
            <>
              <strong>You have {count(daily, "daily")} left.</strong>{" "}
              <span className="out-of-tickets__quiet">
                Your {minutes}-minute timer starts with your first stroke.
              </span>
            </>
          )}
        </p>
        {note && (
          <p className="out-of-tickets__note" id={`${id}-note`}>
            {note}
          </p>
        )}
        <TearLine />
        {reserveAsk ? (
          <>
            <Key
              className="out-of-tickets__key"
              tone="grape"
              icon={<DrawIcon />}
              onClick={() => onStart("reserve")}
            >
              Use a reserve ticket
            </Key>
            <LabelButton block icon={<Storefront />} onClick={onShop}>
              Shop for tickets
            </LabelButton>
          </>
        ) : (
          <Key className="out-of-tickets__key" icon={<DrawIcon />} onClick={() => onStart("daily")}>
            Start drawing
          </Key>
        )}
        <QuietLink className="out-of-tickets__quiet-link" onClick={onBoard}>
          Not now
        </QuietLink>
      </section>
    </div>
  );
}
