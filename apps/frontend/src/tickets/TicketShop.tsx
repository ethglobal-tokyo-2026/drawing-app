import type { TicketQuote } from "@drawing-app/api/client";
import { Ticket } from "@phosphor-icons/react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { useApi } from "../api/useApi";
import { DrawIcon } from "../icons/DrawIcon";
import { getSuiBalance, IS_MOCK_PAYMENT, payForTickets } from "../payments/sui";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { TICKET_PRICE_YEN } from "./config";
import { formatSui, formatYen, yenForMist } from "./prices";
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

const reason = (error: unknown) =>
  error instanceof Error && error.message ? error.message : String(error);
const tickets = (n: number) => `${n} ${n === 1 ? "ticket" : "tickets"}`;

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
 * wallet's balance up top. The smallest pack is picked to start, so no pack is pushed.
 */
export function TicketShop({ layout, onDraw, onClose, closeLabel = "Not now" }: Props) {
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
          ? `The payment went through (${digest}), but the tickets weren’t added: ${reason(e)}`
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
      {closeLabel}
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
          {bought.tickets} reserve {bought.tickets === 1 ? "ticket" : "tickets"} added
        </h2>
        {!IS_MOCK_PAYMENT && (
          <p className="out-of-tickets__line out-of-tickets__quiet">
            Paid {formatSui(BigInt(bought.priceMist))} SUI.
          </p>
        )}
        <TearLine />
        <Key
          className="out-of-tickets__key"
          icon={<DrawIcon />}
          aria-label={state ? `Draw: you have ${describeTickets(state)}` : "Draw"}
          onClick={onDraw}
        >
          Draw
          {state && <TicketCounts state={state} className="ticket-counts--on-key" />}
        </Key>
        <LabelButton block icon={<Ticket />} onClick={() => setStep("choose")}>
          Buy more tickets
        </LabelButton>
        {close}
      </>
    );
  } else if (step === "error") {
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          Payment didn’t go through
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <strong>{error}</strong>
        </p>
        <TearLine />
        <Key className="out-of-tickets__key" icon={<Ticket />} onClick={() => setStep("choose")}>
          Back to the shop
        </Key>
        {close}
      </>
    );
  } else {
    const paying = step === "paying";
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          Ticket shop
        </h2>
        <p className="out-of-tickets__line">
          <strong>Reserve tickets never expire.</strong>
        </p>
        <div className="ticket-shop__wallet">
          <span className="fine">Your SUI</span>
          {wallet.error ? (
            <span role="alert">
              Couldn’t read your balance ({wallet.error}).{" "}
              <QuietLink onClick={wallet.refresh}>Try again</QuietLink>
            </span>
          ) : wallet.balance === null ? (
            <span className="out-of-tickets__quiet">Reading your wallet…</span>
          ) : (
            <span>
              <strong>{formatSui(wallet.balance)} SUI</strong>
              {quote && (
                <span className="out-of-tickets__quiet">
                  {" "}
                  ≈ {formatYen(yenForMist(wallet.balance, quote.suiYen))}
                </span>
              )}
            </span>
          )}
        </div>
        {quoteError ? (
          <p className="ticket-shop__problem" role="alert">
            Couldn’t get today’s SUI price ({quoteError}).{" "}
            <QuietLink onClick={retry}>Try again</QuietLink>
          </p>
        ) : !quote ? (
          <p className="ticket-shop__problem out-of-tickets__quiet">Getting today’s SUI price…</p>
        ) : (
          <>
            <div className="ticket-shop__packs" role="group" aria-label="Ticket packs">
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
                  <span className="ticket-shop__pack-name">{tickets(p.tickets)}</span>
                  {p.discountPercent > 0 && (
                    <span className="ticket-shop__discount">−{p.discountPercent}%</span>
                  )}
                  <span className="ticket-shop__price">
                    {p.discountPercent > 0 && (
                      <s aria-label={`was ${formatYen(p.tickets * TICKET_PRICE_YEN)}`}>
                        {formatYen(p.tickets * TICKET_PRICE_YEN)}
                      </s>
                    )}
                    <strong>{formatYen(p.priceYen)}</strong>
                    <small>{formatSui(BigInt(p.priceMist))} SUI</small>
                  </span>
                </button>
              ))}
            </div>
            <p className="fine ticket-shop__rate">
              1 SUI ≈ {formatYen(Number(quote.suiYen))} · 5-minute average
            </p>
          </>
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
            ? "Paying with Sui…"
            : short
              ? "Not enough SUI"
              : pack
                ? `Pay ${formatSui(BigInt(pack.priceMist))} SUI`
                : "Pay with Sui"}
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
