import { useId, useState } from "react";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { BuyTicketsIcon } from "../icons";
import { formatYen } from "../tickets/prices";
import { singleTicketPrice, useShownReservePacks } from "../tickets/reservePacks";
import { TicketCount } from "../tickets/TicketCount";
import { TicketStubs, type TicketStub } from "../tickets/TicketStubs";
import { useTickets } from "../tickets/useTickets";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { TearLine } from "../ui/TearLine";
import { SuiCredit } from "./SuiCredit";

const FAN: TicketStub[] = [
  { used: false, kind: "reserve" },
  { used: false, kind: "reserve" },
  { used: false, kind: "reserve" },
];

/**
 * The Shop's one thing on sale, laid out as the page's peak: a fan of reserve tickets, what you hold,
 * what they're for and what they cost, and the key that opens the reserve ticket checkout.
 */
export function ReserveTicketsHero({ onBuy }: { onBuy: () => void }) {
  const { t } = useTranslation();
  const id = useId();
  const { tickets, error, refresh } = useTickets();
  const packs = useShownReservePacks();
  // The price waits on the packs, and nothing else here does.
  const price = packs.state === "ready" ? singleTicketPrice(packs.data.packs) : null;
  // A price there as the Shop opens is simply there; only one that arrives later rises in.
  const [pricedAtOnce] = useState(price !== null);
  const held = tickets?.reserveLeft ?? 0;

  return (
    <section className="reserve-hero" aria-labelledby={`${id}-title`}>
      <TicketStubs className="reserve-hero__fan" size="large" stubs={FAN} stars="front" />
      {/* With no tickets loaded the Shop would read as if you hold none, so a failed load says so. */}
      {error && (
        <ErrorLine className="reserve-hero__problem" detail={errorDetail(error)} onRetry={refresh}>
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
      <h2 className="reserve-hero__title" id={`${id}-title`}>
        {t(($) => $.shop.reserve.title)}
      </h2>
      <p className="reserve-hero__lead keep-phrases">{t(($) => $.shop.reserve.lead)}</p>
      {/* Its line keeps its height while the price loads, or if it can't, so the key never jumps. */}
      <p className="reserve-hero__price">
        {price ? (
          <span className={pricedAtOnce ? undefined : REVEAL}>
            {price.lessInPacks
              ? t(($) => $.shop.reserve.priceWithPacks, { price: formatYen(price.priceYen) })
              : t(($) => $.shop.reserve.price, { price: formatYen(price.priceYen) })}
          </span>
        ) : (
          packs.state === "loading" && <Skeleton width={168} height={16} />
        )}
      </p>
      <TearLine />
      <Key className="reserve-hero__key" tone="blue" icon={<BuyTicketsIcon />} onClick={onBuy}>
        {t(($) => $.shop.reserve.buy)}
      </Key>
      <SuiCredit />
    </section>
  );
}
