import { ticketPath } from "./ticketShape";
import type { TicketKind, Tickets } from "./tickets";
import "./TicketCount.css";

const MARK = { w: 18, h: 12, corner: 2.5, notch: 2.5 };
const markPath = ticketPath(MARK);

/**
 * A ticket mark in its kind's color, then ×count; without a count, the mark alone. Decorative: the
 * host says the count in words.
 */
export function TicketCount({ kind, count }: { kind: TicketKind; count?: number }) {
  return (
    <span
      className={`ticket-count ticket-count--${kind} ${count === 0 ? "is-empty" : ""}`}
      aria-hidden
    >
      <svg viewBox={`-1 -1 ${MARK.w + 2} ${MARK.h + 2}`} width={MARK.w + 2} height={MARK.h + 2}>
        <path d={markPath} />
      </svg>
      {count !== undefined && `×${count}`}
    </span>
  );
}

/** Daily and reserve tickets left, side by side: what every Draw key carries. */
export function TicketCounts({ state, className }: { state: Tickets; className?: string }) {
  return (
    <span className={["ticket-counts", className].filter(Boolean).join(" ")} aria-hidden>
      <TicketCount kind="daily" count={state.dailyLeft} />
      <TicketCount kind="reserve" count={state.reserveLeft} />
    </span>
  );
}
