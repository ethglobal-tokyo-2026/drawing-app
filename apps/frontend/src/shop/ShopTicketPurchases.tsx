import { usePrivyStatus } from "../identity/privy";
import { errorDetail } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { useShownReservePacks } from "../tickets/reservePacks";
import { TicketPurchases } from "../tickets/TicketPurchases";
import { useTickets } from "../tickets/useTickets";
import { ErrorLine } from "../ui/ErrorLine";

/**
 * Under the Shop's reserve tickets: your short Sui address, which opens the ticket purchases your Sui
 * account made, once that account and where packs are paid are known.
 */
export function ShopTicketPurchases() {
  const { t } = useTranslation();
  const privy = usePrivyStatus();
  const packs = useShownReservePacks();
  const { tickets } = useTickets();
  const owner = privy.state === "signed-in" ? privy.suiWallet : undefined;
  if (!owner) return null;
  // Where packs are paid comes from Sui through the server, and the purchases can't be read without it.
  if (packs.state === "failed") {
    return (
      <ErrorLine
        className="shop__purchases"
        detail={errorDetail(packs.error)}
        onRetry={packs.retry}
      >
        {t(($) => $.tickets.purchases.problem)}
      </ErrorLine>
    );
  }
  if (packs.state !== "ready") return null;
  return (
    // A purchase adds reserve tickets, so the list starts over, and reads Sui again when next opened.
    <TicketPurchases
      key={tickets?.reserveLeft}
      className="shop__purchases"
      owner={owner}
      shop={packs.data}
    />
  );
}
