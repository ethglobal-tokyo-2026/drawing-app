import { useTranslation } from "../i18n/react";
import { ticketPath } from "./ticketShape";
import type { TicketKind } from "./tickets";
import "./TicketCount.css";

const MARK = { w: 18, h: 12, corner: 2.5, notch: 2.5 };
const markPath = ticketPath(MARK);

/**
 * A ticket mark in its kind's color with an Ink edge, then ×count; without a count, the mark alone. A reserve
 * ticket's mark keeps its resin's rim of light along the top; at this size it has no star. Decorative: the host says
 * the count in words.
 */
export function TicketCount({ kind, count }: { kind: TicketKind; count?: number }) {
  const { t } = useTranslation();
  return (
    <span className={`ticket-count ticket-count--${kind}`} aria-hidden>
      <svg viewBox={`-1 -1 ${MARK.w + 2} ${MARK.h + 2}`} width={MARK.w + 2} height={MARK.h + 2}>
        <path d={markPath} />
        {kind === "reserve" && (
          <line className="ticket-count__rim" x1={MARK.corner} y1={1.5} x2={MARK.w - 6} y2={1.5} />
        )}
      </svg>
      {count !== undefined && t(($) => $.tickets.count, { count })}
    </span>
  );
}
