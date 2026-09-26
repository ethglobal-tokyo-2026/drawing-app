import type { TicketShop as Shop } from "@drawing-app/api/client";
import { ArrowSquareOut, CaretDown, Receipt } from "@phosphor-icons/react";
import { useEffect, useId, useState } from "react";
import { useMe } from "../api/meContext";
import { formatDateTime } from "../i18n/format";
import { useTranslation } from "../i18n/react";
import { suiscanTxUrl } from "../identity/explorers";
import { openLinkInLine } from "../line/openLink";
import type { TicketPaymentRecord } from "../payments/jpyc";
import { shortAddress } from "../sticker-board/stat-board/addresses";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { formatYen, yenForJpyc } from "./prices";

interface Props {
  owner: string;
  shop: Shop;
}

const reason = (error: unknown) => (error instanceof Error ? error.message : String(error));

/** Pages of the owner's ticket payments, read from Sui when `read` asks. */
function useTicketPayments(owner: string, payment: Shop["payment"]) {
  const [payments, setPayments] = useState<TicketPaymentRecord[] | null>(null);
  const [cursor, setCursor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The page being read, by the cursor it ends at; undefined while none is.
  const [asked, setAsked] = useState<{ from: string | null } | undefined>(undefined);

  useEffect(() => {
    if (!asked) return;
    let live = true;
    // Sui's SDK loads with the shop, not with the app.
    import("../payments/jpyc")
      .then(({ getTicketPayments }) => getTicketPayments(owner, payment, asked.from))
      .then(
        (page) => {
          if (!live) return;
          setPayments((before) => [...(asked.from ? (before ?? []) : []), ...page.payments]);
          setCursor(page.cursor);
          setError(null);
        },
        (e: unknown) => {
          console.error(`Couldn't read the ticket payments of ${owner} from Sui`, e);
          if (live) setError(reason(e));
        },
      )
      .finally(() => {
        if (live) setAsked(undefined);
      });
    return () => {
      live = false;
    };
  }, [owner, payment, asked]);

  const reading = asked !== undefined;
  return {
    payments,
    reading,
    error,
    /** Reads the newest page, unless it's read or being read. */
    start: () => {
      if (payments === null && !reading) setAsked({ from: null });
    },
    more: cursor !== null ? () => setAsked({ from: cursor }) : undefined,
    retry: () => setAsked({ from: payments === null ? null : cursor }),
  };
}

/**
 * The person's ENS name under the pay key; it opens their ticket purchases, read straight from Sui
 * rather than the server, so they can check every payment their wallet made.
 */
export function TicketPurchases({ owner, shop }: Props) {
  const { t } = useTranslation();
  const me = useMe();
  const [open, setOpen] = useState(false);
  const history = useTicketPayments(owner, shop.payment);
  const id = useId();
  const name = me.ensName ?? shortAddress(owner);

  const packFor = (amount: bigint) => shop.packs.find((p) => p.priceJpyc === amount.toString());

  return (
    <div className="ticket-purchases">
      <LabelButton
        block
        size="sm"
        icon={<Receipt />}
        aria-expanded={open}
        aria-controls={id}
        aria-label={t(($) => $.tickets.checkout.purchases.show, { name })}
        onClick={() => {
          if (!open) history.start();
          setOpen(!open);
        }}
      >
        <span className="ticket-purchases__name">{name}</span>
        <CaretDown className="ticket-purchases__caret" aria-hidden="true" />
      </LabelButton>
      {open && (
        <div id={id} className="ticket-purchases__list">
          {history.payments === null && history.error ? null : history.payments === null ? (
            <>
              <p className="visually-hidden" role="status">
                {t(($) => $.tickets.checkout.purchases.reading)}
              </p>
              {[1, 2].map((n) => (
                <div key={n} className="ticket-purchases__row" aria-hidden="true">
                  <Skeleton width={72} height={14} />
                  <Skeleton width={56} height={16} />
                </div>
              ))}
            </>
          ) : history.payments.length === 0 && !history.more ? (
            <p className="ticket-purchases__note">{t(($) => $.tickets.checkout.purchases.none)}</p>
          ) : (
            <ul className={REVEAL}>
              {history.payments.map((p) => {
                const pack = packFor(p.amount);
                return (
                  <li key={p.digest}>
                    <a
                      className="ticket-purchases__row"
                      href={suiscanTxUrl(shop.payment.network, p.digest)}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={t(($) => $.tickets.checkout.purchases.open, { digest: p.digest })}
                      onClick={openLinkInLine}
                    >
                      <span>
                        <strong>
                          {pack
                            ? t(($) => $.tickets.checkout.pack, { count: pack.tickets })
                            : formatYen(yenForJpyc(p.amount, shop.payment.decimals))}
                        </strong>
                        <span className="fine">{formatDateTime(new Date(p.paidAt))}</span>
                      </span>
                      <span className="ticket-purchases__price">
                        {formatYen(yenForJpyc(p.amount, shop.payment.decimals))}
                        <ArrowSquareOut aria-hidden="true" />
                      </span>
                    </a>
                  </li>
                );
              })}
            </ul>
          )}
          {history.error ? (
            <p className="ticket-purchases__note" role="alert">
              {t(($) => $.tickets.checkout.purchases.problem, { reason: history.error })}{" "}
              <QuietLink disabled={history.reading} onClick={history.retry}>
                {t(($) => $.tickets.tryAgain)}
              </QuietLink>
            </p>
          ) : (
            history.more && (
              <QuietLink disabled={history.reading} onClick={history.more}>
                {t(($) => $.tickets.checkout.purchases.more)}
              </QuietLink>
            )
          )}
        </div>
      )}
    </div>
  );
}
