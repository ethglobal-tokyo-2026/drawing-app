import { usePrivyStatus } from "../identity/privy";
import { useShownReservePacks } from "../tickets/reservePacks";
import { TicketPurchases } from "../tickets/TicketPurchases";
import { useTickets } from "../tickets/useTickets";

/**
 * Under the Shop's reserve tickets: your ENS name, which opens the ticket purchases your Sui account
 * made, once that account and where packs are paid are known.
 */
export function ShopTicketPurchases() {
  const privy = usePrivyStatus();
  const packs = useShownReservePacks();
  const { tickets } = useTickets();
  const owner = privy.state === "signed-in" ? privy.suiWallet : undefined;
  if (!owner || packs.state !== "ready") return null;
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
