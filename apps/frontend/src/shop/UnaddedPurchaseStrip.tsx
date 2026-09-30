import { useTranslation } from "../i18n/react";
import { CaretRight } from "../icons";
import { formatYen } from "../tickets/prices";
import { unaddedPurchaseToShow, useUnaddedPurchases } from "../tickets/unaddedPurchases";
import "./unadded-strip.css";

/**
 * Under the Shop's title while a paid pack's tickets aren't added. The payment is kept on this phone and
 * asked for again as the Shop opens, so when that fails this is where it shows, not only in the checkout,
 * which it opens on that payment.
 */
export function UnaddedPurchaseStrip({ onOpen }: { onOpen: () => void }) {
  const { t } = useTranslation();
  const purchase = unaddedPurchaseToShow(useUnaddedPurchases());

  const strip = (() => {
    if (!purchase) return null;
    const values = {
      pack: t(($) => $.tickets.checkout.pack, { count: purchase.tickets }),
      price: formatYen(purchase.priceYen),
    };
    // A refusal is said once, in the checkout, so the strip only points there.
    const refused = purchase.refusal !== undefined;
    return (
      <button type="button" className="unadded-strip" data-press onClick={onOpen}>
        <span className="unadded-strip__text">
          <strong>
            {refused ? t(($) => $.shop.unadded.refusedTitle) : t(($) => $.shop.unadded.title)}
          </strong>
          <span>
            {refused
              ? t(($) => $.shop.unadded.refusedLine, values)
              : t(($) => $.shop.unadded.line, values)}
          </span>
        </span>
        <CaretRight aria-hidden="true" />
      </button>
    );
  })();

  // Always in the page, so a screen reader hears the strip come, and turn into a refusal.
  return <div role="status">{strip}</div>;
}
