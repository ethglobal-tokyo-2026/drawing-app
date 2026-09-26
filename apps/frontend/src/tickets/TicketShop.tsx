import type { TicketQuote } from "@drawing-app/api/client";
import { Ticket } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { errorReason } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { DrawIcon } from "../icons/DrawIcon";
import { getSuiBalance, IS_MOCK_PAYMENT, payForTickets } from "../payments/sui";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { TICKET_PRICE_YEN } from "./config";
import { formatYen, yenForMist } from "./prices";
import { TicketCount, TicketCounts } from "./TicketCount";
import { describeTickets } from "./tickets";
import { TicketStubs } from "./TicketStubs";
import { useTickets } from "./useTickets";
import "./tickets.css";
import "./TicketShop.css";

type Step = "choose" | "paying" | "done" | "error";
type Pack = TicketQuote["packs"][number];

interface Props {
  /** "card": risen over the drawing screen as a dialog. "page": the Shop tab's content. */
  layout: "card" | "page";
  /** Draw, after a purchase. */
  onDraw: () => void;
  /** Leave the shop; in the card, also what Escape does. The Shop tab has no way out but its tabs. */
  onClose?: () => void;
  closeLabel?: string;
}

/** Why something failed: an API error in the app's language, anything else in its own words. */
const reason = (error: unknown) =>
  error instanceof ApiError
    ? errorReason(error)
    : error instanceof Error && error.message
      ? error.message
      : String(error);
/** One outline row per pack the shop sells, while today's prices load. */
const PACKS_LOADING = [1, 2, 3, 4];

/** The shop's SUI price quote, fetched again as each one expires. */
function useTicketQuote() {
  const api = useApi();
  const [quote, setQuote] = useState<TicketQuote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    api.ticketQuote().then(
      (q) => {
        if (!live) return;
        setQuote(q);
        setError(null);
      },
      (e: unknown) => {
        console.error("Couldn't get the SUI price for the ticket shop", e);
        if (live) setError(reason(e));
      },
    );
    return () => {
      live = false;
    };
  }, [api, attempt]);

  useEffect(() => {
    if (!quote) return;
    const id = setTimeout(
      () => setAttempt((a) => a + 1),
      Math.max(0, Date.parse(quote.expiresAt) - Date.now()),
    );
    return () => clearTimeout(id);
  }, [quote]);

  return { quote, error, retry: () => setAttempt((a) => a + 1) };
}

function useSuiBalance() {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    getSuiBalance().then(
      (b) => {
        if (!live) return;
        setBalance(b);
        setError(null);
      },
      (e: unknown) => {
        console.error("Couldn't read the wallet's SUI balance", e);
        if (live) setError(reason(e));
      },
    );
    return () => {
      live = false;
    };
  }, [attempt]);

  return { balance, error, refresh: () => setAttempt((a) => a + 1) };
}

/**
 * The ticket shop: reserve ticket packs priced in yen, paid in SUI at the quote's price, with the
 * balance up top in yen at that price. The smallest pack is picked to start, so no pack is pushed.
 */
export function TicketShop({ layout, onDraw, onClose, closeLabel }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("choose");
  const [chosen, setChosen] = useState<Pack["tickets"]>(1);
  const [bought, setBought] = useState<Pack | null>(null);
  const [error, setError] = useState("");
  const { quote, error: quoteError, retry } = useTicketQuote();
  const wallet = useSuiBalance();
  const api = useApi();
  const { tickets: state, set: setTickets } = useTickets();
  const card = useRef<HTMLElement>(null);
  const id = useId();

  const pack = quote?.packs.find((p) => p.tickets === chosen);
  const short = pack && wallet.balance !== null && wallet.balance < BigInt(pack.priceMist);

  const pay = async (p: Pack) => {
    setStep("paying");
    let digest: string | null = null;
    try {
      ({ digest } = await payForTickets(BigInt(p.priceMist)));
      setTickets(
        await api.buyTickets({ tickets: p.tickets, txDigest: digest, paidMist: p.priceMist }),
      );
      setBought(p);
      setStep("done");
    } catch (e) {
      console.error(`Buying a pack of ${p.tickets} tickets with Sui failed`, { digest, error: e });
      setError(
        digest
          ? t(($) => $.tickets.shop.paidButNotAdded, { digest, reason: reason(e) })
          : reason(e),
      );
      setStep("error");
    } finally {
      wallet.refresh();
    }
  };

  useFocusTrap(card, {
    active: layout === "card",
    onEscape: () => {
      if (step !== "paying") onClose?.();
    },
  });

  // Each view's first control takes focus, so focus never drops out of the card when its controls change.
  useEffect(() => {
    if (layout !== "card") return;
    const first = card.current?.querySelector<HTMLElement>("button:not(:disabled)");
    (first ?? card.current)?.focus();
  }, [layout, step]);

  const close = onClose && (
    <QuietLink
      className="out-of-tickets__quiet-link"
      disabled={step === "paying"}
      onClick={onClose}
    >
      {closeLabel ?? t(($) => $.tickets.notNow)}
    </QuietLink>
  );

  let body: ReactNode;
  if (step === "done" && bought) {
    body = (
      <>
        <TicketStubs
          className="out-of-tickets__art"
          size="large"
          stubs={Array.from({ length: Math.min(bought.tickets, 3) }, () => ({
            used: false,
            kind: "reserve" as const,
          }))}
        />
        <h2 className="out-of-tickets__title" id={`${id}-title`}>
          {t(($) => $.tickets.shop.added, { count: bought.tickets })}
        </h2>
        {!IS_MOCK_PAYMENT && (
          <p className="out-of-tickets__line out-of-tickets__quiet">
            {t(($) => $.tickets.shop.paid, { price: formatYen(bought.priceYen) })}
          </p>
        )}
        <TearLine />
        <Key
          className="out-of-tickets__key"
          icon={<DrawIcon />}
          aria-label={
            state
              ? t(($) => $.tickets.drawWithTickets, { tickets: describeTickets(state) })
              : t(($) => $.tickets.draw)
          }
          onClick={onDraw}
        >
          {t(($) => $.tickets.draw)}
          {state && <TicketCounts state={state} className="ticket-counts--on-key" />}
        </Key>
        <LabelButton block icon={<Ticket />} onClick={() => setStep("choose")}>
          {t(($) => $.tickets.shop.buyMore)}
        </LabelButton>
        {close}
      </>
    );
  } else if (step === "error") {
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.shop.paymentFailed)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <strong>{error}</strong>
        </p>
        <TearLine />
        <Key className="out-of-tickets__key" icon={<Ticket />} onClick={() => setStep("choose")}>
          {t(($) => $.tickets.shop.backToShop)}
        </Key>
        {close}
      </>
    );
  } else {
    const paying = step === "paying";
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.shop.title)}
        </h2>
        <p className="out-of-tickets__line">
          <strong>{t(($) => $.tickets.shop.lead)}</strong>
        </p>
        <div className="ticket-shop__wallet">
          <span className="fine">{t(($) => $.tickets.shop.balance)}</span>
          {wallet.error ? (
            <span role="alert">
              {t(($) => $.tickets.shop.balanceProblem, { reason: wallet.error })}{" "}
              <QuietLink onClick={wallet.refresh}>{t(($) => $.tickets.tryAgain)}</QuietLink>
            </span>
          ) : wallet.balance === null || !quote ? (
            <span className="ticket-shop__loading">
              <span className="visually-hidden" role="status">
                {t(($) => $.tickets.shop.readingBalance)}
              </span>
              <Skeleton width={84} height={18} />
            </span>
          ) : (
            <strong className={REVEAL}>
              {formatYen(yenForMist(wallet.balance, quote.suiYen))}
            </strong>
          )}
        </div>
        {quoteError ? (
          <p className="ticket-shop__problem" role="alert">
            {t(($) => $.tickets.shop.pricesProblem, { reason: quoteError })}{" "}
            <QuietLink onClick={retry}>{t(($) => $.tickets.tryAgain)}</QuietLink>
          </p>
        ) : !quote ? (
          <div className="ticket-shop__packs">
            <p className="visually-hidden" role="status">
              {t(($) => $.tickets.shop.gettingPrices)}
            </p>
            {/* The packs' own rows in outline, so nothing jumps as the prices come in. */}
            {PACKS_LOADING.map((n) => (
              <div key={n} className="ticket-shop__pack" aria-hidden="true">
                <Skeleton width={24} height={16} />
                <Skeleton width={72} height={14} />
                <span />
                <Skeleton width={56} height={18} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`${REVEAL} ticket-shop__packs`}
            role="group"
            aria-label={t(($) => $.tickets.shop.packs)}
          >
            {quote.packs.map((p) => (
              <button
                key={p.tickets}
                type="button"
                className="ticket-shop__pack"
                aria-pressed={p.tickets === chosen}
                disabled={paying}
                onClick={() => setChosen(p.tickets)}
              >
                <TicketCount kind="reserve" />
                <span className="ticket-shop__pack-name">
                  {t(($) => $.tickets.shop.pack, { count: p.tickets })}
                </span>
                {p.discountPercent > 0 && (
                  <span className="ticket-shop__discount">
                    {t(($) => $.tickets.shop.discount, { percent: p.discountPercent })}
                  </span>
                )}
                <span className="ticket-shop__price">
                  {p.discountPercent > 0 && (
                    <s
                      aria-label={t(($) => $.tickets.shop.was, {
                        price: formatYen(p.tickets * TICKET_PRICE_YEN),
                      })}
                    >
                      {formatYen(p.tickets * TICKET_PRICE_YEN)}
                    </s>
                  )}
                  <strong>{formatYen(p.priceYen)}</strong>
                </span>
              </button>
            ))}
          </div>
        )}
        <TearLine />
        <Key
          className="out-of-tickets__key"
          tone="grape"
          icon={<Ticket />}
          disabled={!pack || short || paying}
          onClick={() => pack && void pay(pack)}
        >
          {paying
            ? t(($) => $.tickets.shop.paying)
            : short
              ? t(($) => $.tickets.shop.notEnoughYen)
              : pack
                ? t(($) => $.tickets.shop.payPrice, { price: formatYen(pack.priceYen) })
                : t(($) => $.tickets.shop.pay)}
        </Key>
        {close}
      </>
    );
  }

  if (layout === "page")
    return (
      <section className="ticket-shop ticket-shop--page" aria-labelledby={`${id}-title`}>
        {body}
      </section>
    );

  return (
    <div className="out-of-tickets">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card ticket-shop"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${id}-title`}
        aria-busy={step === "paying"}
        tabIndex={-1}
      >
        {body}
      </section>
    </div>
  );
}
