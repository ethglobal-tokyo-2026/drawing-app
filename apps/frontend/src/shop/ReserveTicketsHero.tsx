import { useId } from "react";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { BuyTicketsIcon } from "../icons";
import { TicketCount } from "../tickets/TicketCount";
import { TicketStubs, type TicketStub } from "../tickets/TicketStubs";
import { useTickets } from "../tickets/useTickets";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { TearLine } from "../ui/TearLine";
import { SuiCredit } from "./SuiCredit";

const FAN: TicketStub[] = [
  { used: false, kind: "reserve" },
  { used: false, kind: "reserve" },
  { used: false, kind: "reserve" },
];

/**
 * The Shop's one thing on sale, laid out as the page's peak: a fan of reserve tickets, what they're
 * for, and over the key that opens the reserve ticket checkout, how many you hold.
 */
export function ReserveTicketsHero({ onBuy }: { onBuy: () => void }) {
  const { t } = useTranslation();
  const id = useId();
  const { tickets, error, refresh } = useTickets();
  const held = tickets?.reserveLeft ?? 0;

  return (
    <section className="reserve-hero" aria-labelledby={`${id}-title`}>
      <TicketStubs className="reserve-hero__fan" size="large" stubs={FAN} stars="front" />
      {/* The words, then the key: one column on a phone, a banner's row across an iPad held sideways. */}
      <div className="reserve-hero__text">
        <h2 className="reserve-hero__title" id={`${id}-title`}>
          {t(($) => $.shop.reserve.title)}
        </h2>
        <p className="reserve-hero__lead keep-phrases">{t(($) => $.shop.reserve.lead)}</p>
      </div>
      <TearLine />
      <div className="reserve-hero__buy">
        {/* With no tickets loaded the Shop would read as if you hold none, so a failed load says so. */}
        {error && (
          <ErrorLine
            className="reserve-hero__problem"
            detail={errorDetail(error)}
            onRetry={refresh}
          >
            {t(($) => $.shop.reserve.heldProblem, { reason: errorMessage(error) })}
          </ErrorLine>
        )}
        {held > 0 && (
          <p className="reserve-hero__held">
            <span aria-hidden="true">
              <Trans
                i18nKey={($) => $.shop.reserve.held}
                components={{ count: <TicketCount kind="reserve" count={held} /> }}
              />
            </span>
            <span className="visually-hidden">
              {t(($) => $.shop.reserve.heldSpoken, { count: held })}
            </span>
          </p>
        )}
        <Key className="reserve-hero__key" tone="blue" icon={<BuyTicketsIcon />} onClick={onBuy}>
          {t(($) => $.shop.reserve.buy)}
        </Key>
        <SuiCredit />
      </div>
    </section>
  );
}
