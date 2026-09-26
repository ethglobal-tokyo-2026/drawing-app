import { TicketShop } from "../tickets/TicketShop";
import "./ShopScreen.css";

/** Things to buy with Sui. Tickets are the only thing on sale for now. */
export function ShopScreen({ onDraw }: { onDraw: () => void }) {
  return (
    <div className="shop">
      <TicketShop layout="page" onDraw={onDraw} />
      <p className="shop__soon">More things to buy with Sui are on the way.</p>
    </div>
  );
}
