import { useTranslation } from "../i18n/react";
import type { TicketView } from "./tickets";
import { TicketStubs } from "./TicketStubs";

/**
 * A ticket card's art, by the one rule (ticketView): while daily tickets are left, the day's stubs, with any reserve
 * tickets as one small reserve ticket and its count under them; once they're used, one large reserve ticket with its
 * count on a badge; with nothing left, the used day. Decorative, apart from the reserve count: the card's line says
 * the rest.
 */
export function TicketArt({ view, pop = false }: { view: TicketView; pop?: boolean }) {
  const { t } = useTranslation();
  if (view.show === "reserve") {
    return (
      <TicketStubs
        className="out-of-tickets__art out-of-tickets__art--hero"
        size="hero"
        stubs={[{ used: false, kind: "reserve", count: view.reserve }]}
        pop={pop}
      />
    );
  }
  return (
    <>
      <TicketStubs className="out-of-tickets__art" size="large" stubs={view.stubs} />
      {view.show === "daily" && view.reserve > 0 && (
        <div className="out-of-tickets__reserve">
          <TicketStubs size="small" stubs={[{ used: false, kind: "reserve" }]} />
          <span className="out-of-tickets__reserve-count" aria-hidden>
            {t(($) => $.tickets.count, { count: view.reserve })}
          </span>
          <span className="fine" aria-hidden>
            {t(($) => $.tickets.reserve)}
          </span>
          <span className="visually-hidden">
            {t(($) => $.tickets.summary.reserve, { count: view.reserve })}
          </span>
        </div>
      )}
    </>
  );
}
