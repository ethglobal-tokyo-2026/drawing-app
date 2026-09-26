import { useEffect, useId, useRef } from "react";
import { useTranslation } from "../i18n/react";
import { DrawIcon, ShopIcon } from "../icons";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { formatRefillTime } from "./refill";
import { TicketArt } from "./TicketArt";
import { nextRefill, ticketView, type TicketKind, type Tickets } from "./tickets";
import "./tickets.css";

interface Props {
  tickets: Tickets;
  /** How long the drawing timer runs, for the card's line. */
  minutes: number;
  /** A ticket is being spent: Start waits for it. */
  busy?: boolean;
  /** Said under the line, such as what became of a drawing a reload interrupted; null for nothing. */
  note: string | null;
  /** Spend a ticket of this kind on this sheet. */
  onStart: (kind: TicketKind) => void;
  /** Open the reserve ticket checkout. */
  onShop: () => void;
  /** Keep the ticket; also what Escape does. */
  onBoard: () => void;
}

/**
 * Asks before a ticket is spent on a fresh sheet, showing the tickets it can use (ticketView). With daily tickets left
 * it spends one; once they're gone it asks before spending a reserve ticket, with that ticket as the picture and the
 * checkout as the other way on. It shares the out-of-tickets card's look.
 */
export function StartDrawing({
  tickets,
  minutes,
  busy = false,
  note,
  onStart,
  onShop,
  onBoard,
}: Props) {
  const { t } = useTranslation();
  const view = ticketView(tickets);
  const daily = tickets.dailyLeft;
  const reserveAsk = view.show !== "daily";
  const card = useRef<HTMLElement>(null);
  const id = useId();
  useFocusTrap(card, { onEscape: onBoard });

  useEffect(() => {
    card.current?.querySelector<HTMLElement>("button")?.focus();
  }, [reserveAsk]);

  // The reserve ask's count is on the ticket's badge, so screen readers hear it with the line.
  const described = [`${id}-line`, reserveAsk && `${id}-held`, note && `${id}-note`];

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={described.filter(Boolean).join(" ")}
        tabIndex={-1}
      >
        <TicketArt view={view} pop />
        <h2 className="out-of-tickets__title" id={`${id}-title`}>
          {reserveAsk
            ? t(($) => $.tickets.startDrawing.reserve.title)
            : t(($) => $.tickets.startDrawing.daily.title)}
        </h2>
        <p className="out-of-tickets__line" id={`${id}-line`}>
          {reserveAsk ? (
            <>
              <strong>{t(($) => $.tickets.startDrawing.reserve.used)}</strong>{" "}
              <span className="out-of-tickets__quiet">
                {t(($) => $.tickets.startDrawing.reserve.refillAt, {
                  time: formatRefillTime(nextRefill(new Date())),
                })}
              </span>
            </>
          ) : (
            <>
              <strong>{t(($) => $.tickets.startDrawing.daily.left, { count: daily })}</strong>{" "}
              <span className="out-of-tickets__quiet">
                {t(($) => $.tickets.startDrawing.daily.timer, { minutes })}
              </span>
            </>
          )}
        </p>
        {reserveAsk && (
          <p className="visually-hidden" id={`${id}-held`}>
            {t(($) => $.tickets.startDrawing.reserve.left, { count: tickets.reserveLeft })}
          </p>
        )}
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
              tone="blue"
              icon={<DrawIcon />}
              disabled={busy}
              onClick={() => onStart("reserve")}
            >
              {t(($) => $.tickets.startDrawing.reserve.use)}
            </Key>
            <LabelButton block icon={<ShopIcon />} onClick={onShop}>
              {t(($) => $.tickets.buyReserveTickets)}
            </LabelButton>
          </>
        ) : (
          <Key
            className="out-of-tickets__key"
            icon={<DrawIcon />}
            disabled={busy}
            onClick={() => onStart("daily")}
          >
            {t(($) => $.tickets.startDrawing.daily.start)}
          </Key>
        )}
        <QuietLink className="out-of-tickets__quiet-link" onClick={onBoard}>
          {t(($) => $.tickets.notNow)}
        </QuietLink>
      </section>
    </div>
  );
}
