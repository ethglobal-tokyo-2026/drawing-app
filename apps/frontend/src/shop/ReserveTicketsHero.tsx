import { useId, useRef, useState } from "react";
import { errorDetail, errorMessage } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { BuyTicketsIcon } from "../icons";
import { AddressDialog } from "../sticker-board/stat-board/AddressDialog";
import { useSuiAddress } from "../sticker-board/stat-board/addresses";
import { TicketCount } from "../tickets/TicketCount";
import { TicketStubs, type TicketStub } from "../tickets/TicketStubs";
import { useTickets } from "../tickets/useTickets";
import { ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { TearLine } from "../ui/TearLine";

const FAN: TicketStub[] = [
  { used: false, kind: "reserve" },
  { used: false, kind: "reserve" },
  { used: false, kind: "reserve" },
];

/**
 * The Shop's one thing on sale, laid out as the page's peak: a fan of reserve tickets, what they're
 * for, and over the key that opens the reserve ticket checkout, how many you hold. Under the key,
 * once Privy has made it, Deposit holds up your Sui address, to send JPYC to.
 */
export function ReserveTicketsHero({ onBuy }: { onBuy: () => void }) {
  const { t } = useTranslation();
  const id = useId();
  const { tickets, error, refresh } = useTickets();
  const held = tickets?.reserveLeft ?? 0;
  const sui = useSuiAddress();
  const address = sui.state === "ready" ? sui.address : null;
  const depositButton = useRef<HTMLButtonElement>(null);
  const [depositing, setDepositing] = useState(false);
  // The address lost while its dialog is up, as when Privy signs you out, takes the dialog with it.
  if (depositing && !address) setDepositing(false);

  return (
    <>
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
          {address && (
            <LabelButton
              ref={depositButton}
              block
              className="reserve-hero__deposit"
              aria-haspopup="dialog"
              onClick={() => setDepositing(true)}
            >
              {t(($) => $.shop.reserve.deposit)}
            </LabelButton>
          )}
        </div>
      </section>
      {/* The stat board's address dialog, beside the section so its taps and Escape stay its own. */}
      {depositing && address && (
        <AddressDialog
          address={address}
          from={depositButton}
          onClose={() => setDepositing(false)}
        />
      )}
    </>
  );
}
