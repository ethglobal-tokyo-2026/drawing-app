import { useTranslation } from "../i18n/react";
import { TicketShop } from "../tickets/TicketShop";
import "./ShopScreen.css";

/** Things to buy with Sui. Tickets are the only thing on sale for now. */
export function ShopScreen({ onDraw }: { onDraw: () => void }) {
  const { t } = useTranslation();
  return (
    <div className="shop">
      <TicketShop layout="page" onDraw={onDraw} />
      <p className="shop__soon">{t(($) => $.app.shop.moreSoon)}</p>
    </div>
  );
}
