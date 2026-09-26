import { TicketShop } from "../tickets/TicketShop";
import "./ShopScreen.css";

/** Things to buy with Sui. Tickets are the only thing on sale for now. */
export function ShopScreen({ onDraw }: { onDraw: () => void }) {
  return (
    <div className="shop">
      <TicketShop layout="page" onDraw={onDraw} />
    </div>
  );
}
