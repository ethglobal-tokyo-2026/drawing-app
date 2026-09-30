import { useId, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import { BuyTicketsIcon, DrawIcon } from "../icons";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { formatRefillTime } from "./refill";
import { TicketArt } from "./TicketArt";
import { ticketView, type TicketKind, type Tickets } from "./tickets";
import "./tickets.css";

interface Props {
  tickets: Tickets;
  /** How long the drawing timer runs, for the card's line. */
  minutes: number;
  /** It comes up as the sealed card leaves (Keep drawing onto the reserve ask), so it rises a beat later. */
  followsSealedCard?: boolean;
  /** A ticket is being spent: the key keeps its face while Start waits for it, and takes no second tap. */
  busy?: boolean;
  /** The ticket is spent: the card drops away over the sheet, then `onLeft` lets it go. */
  leaving?: boolean;
  onLeft?: () => void;
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
 * checkout as the other way on. It shares the out-of-tickets card's look. Once the ticket is spent it drops away, and
 * the sheet under it takes ink at once.
 */
export function StartDrawing({
  tickets,
  minutes,
  followsSealedCard = false,
  busy = false,
  leaving = false,
  onLeft,
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
  // Read once, as it comes up: it decides only how the card rises.
  const [follows] = useState(followsSealedCard);
  useFocusTrap(card, { active: !leaving, onEscape: onBoard, refocus: reserveAsk });

  // The reserve ask's count is on the ticket's badge, so screen readers hear it with the line.
  const described = [`${id}-line`, reserveAsk && `${id}-held`, note && `${id}-note`];
  // aria-disabled rather than disabled, so the busy key keeps its face rather than sinking grey.
  const busyKey = busy ? ({ "aria-busy": true, "aria-disabled": true } as const) : {};
  const classes = ["out-of-tickets", follows && "out-of-tickets--follows", leaving && "is-leaving"];

  return (
    <div className={classes.filter(Boolean).join(" ")} inert={leaving}>
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-describedby={described.filter(Boolean).join(" ")}
        tabIndex={-1}
        onAnimationEnd={(e) => {
          if (leaving && e.target === e.currentTarget && e.animationName === "out-of-tickets-drop")
            onLeft?.();
        }}
      >
        <TicketArt view={view} pop spend={leaving ? "peel" : busy ? "lift" : null} />
        <h2 className="out-of-tickets__title" id={`${id}-title`}>
          {reserveAsk
            ? t(($) => $.tickets.startDrawing.reserve.title)
            : t(($) => $.tickets.startDrawing.daily.title)}
        </h2>
        <p className="out-of-tickets__line out-of-tickets__line--stacked" id={`${id}-line`}>
          {reserveAsk ? (
            <>
              <strong>{t(($) => $.tickets.startDrawing.reserve.used)}</strong>{" "}
              <span className="out-of-tickets__quiet">
                {t(($) => $.tickets.startDrawing.reserve.refillAt, {
                  time: formatRefillTime(new Date(tickets.nextRefillAt)),
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
              {...busyKey}
              onClick={() => onStart("reserve")}
            >
              {t(($) => $.tickets.startDrawing.reserve.use)}
            </Key>
            <LabelButton block icon={<BuyTicketsIcon />} onClick={onShop}>
              {t(($) => $.tickets.buyReserveTickets)}
            </LabelButton>
          </>
        ) : (
          <Key
            className="out-of-tickets__key"
            icon={<DrawIcon />}
            {...busyKey}
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
