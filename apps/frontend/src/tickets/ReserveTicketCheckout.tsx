import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { errorReason } from "../i18n/errorMessage";
import { useTranslation } from "../i18n/react";
import { BuyTicketsIcon, DrawIcon } from "../icons";
import { usePrivyStatus } from "../identity/privy";
import { useSuiWalletFailure } from "../identity/suiWallet";
import type { JpycPayment } from "../payments/jpyc";
import { SuiCredit } from "../shop/SuiCredit";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { TearLine } from "../ui/TearLine";
import { useFocusTrap } from "../ui/useFocusTrap";
import { TICKET_PRICE_YEN } from "./config";
import { formatYen, yenForJpyc } from "./prices";
import { useReservePacks, type ReservePack } from "./reservePacks";
import { TicketCount } from "./TicketCount";
import { TicketPurchases } from "./TicketPurchases";
import { describeTickets, ticketView } from "./tickets";
import { TicketStubs } from "./TicketStubs";
import { useTickets } from "./useTickets";
import "./tickets.css";
import "./ReserveTicketCheckout.css";

type Step = "choose" | "paying" | "done" | "error";

interface Props {
  /** Draw, after a purchase. */
  onDraw: () => void;
  /** Close the card; also what Escape does. */
  onClose: () => void;
}

/** Why something failed: an API error in the app's language, anything else in its own words. */
const reason = (error: unknown) =>
  error instanceof ApiError
    ? errorReason(error)
    : error instanceof Error && error.message
      ? error.message
      : String(error);
/** One outline row per pack on sale, while today's prices load. */
const PACKS_LOADING = [1, 2, 3, 4];

/** The person's Privy Sui account: its address, or why there's none yet. */
function useSuiAccount(): { address?: string; problem?: string } {
  const { t } = useTranslation();
  const privy = usePrivyStatus();
  const failure = useSuiWalletFailure();
  if (failure) return { problem: t(($) => $.tickets.checkout.walletBroken, { reason: failure }) };
  if (privy.state === "failed") {
    return { problem: t(($) => $.tickets.checkout.walletSignInFailed, { reason: privy.reason }) };
  }
  if (privy.state === "off") return { problem: t(($) => $.tickets.checkout.walletNeedsLine) };
  return { address: privy.state === "signed-in" ? privy.suiWallet : undefined };
}

function useJpycBalance(owner: string | undefined, payment: JpycPayment | undefined) {
  const [balance, setBalance] = useState<bigint | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!owner || !payment) return;
    let live = true;
    // Sui's SDK loads with the checkout, not with the app.
    import("../payments/jpyc")
      .then(({ getJpycBalance }) => getJpycBalance(owner, payment))
      .then(
        (b) => {
          if (!live) return;
          setBalance(b);
          setError(null);
        },
        (e: unknown) => {
          console.error(`Couldn't read the JPYC balance of ${owner}`, e);
          if (live) setError(reason(e));
        },
      );
    return () => {
      live = false;
    };
  }, [owner, payment, attempt]);

  return { balance, error, refresh: () => setAttempt((a) => a + 1) };
}

/**
 * The reserve ticket checkout, a card risen over the Shop or the drawing screen: reserve ticket packs
 * priced in yen and paid in JPYC from the person's Sui account, with that JPYC up top in yen. The
 * smallest pack is picked to start, so no pack is pushed.
 */
export function ReserveTicketCheckout({ onDraw, onClose }: Props) {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>("choose");
  const [chosen, setChosen] = useState<ReservePack["tickets"]>(1);
  const [bought, setBought] = useState<ReservePack | null>(null);
  const [error, setError] = useState("");
  const packs = useReservePacks();
  const shop = packs.state === "ready" ? packs.data : null;
  const sui = useSuiAccount();
  const jpyc = useJpycBalance(sui.address, shop?.payment);
  const api = useApi();
  const { tickets: state, set: setTickets } = useTickets();
  const card = useRef<HTMLElement>(null);
  const id = useId();

  const pack = shop?.packs.find((p) => p.tickets === chosen);
  const short = pack && jpyc.balance !== null && jpyc.balance < BigInt(pack.priceJpyc);

  const pay = async (p: ReservePack, payment: JpycPayment) => {
    setStep("paying");
    let digest: string | null = null;
    try {
      const [{ payForTickets }, { waitForSuiSigner }] = await Promise.all([
        import("../payments/jpyc"),
        import("../identity/suiSigner"),
      ]);
      digest = await payForTickets(await waitForSuiSigner(), payment, BigInt(p.priceJpyc));
      setTickets(await api.buyTickets({ tickets: p.tickets, txDigest: digest }));
      setBought(p);
      setStep("done");
    } catch (e) {
      console.error(`Buying a pack of ${p.tickets} tickets with JPYC failed`, { digest, error: e });
      setError(
        digest
          ? t(($) => $.tickets.checkout.paidButNotAdded, { digest, reason: reason(e) })
          : reason(e),
      );
      setStep("error");
    } finally {
      jpyc.refresh();
    }
  };

  useFocusTrap(card, {
    onEscape: () => {
      if (step !== "paying") onClose();
    },
  });

  // Each view's first control takes focus, so focus never drops out of the card when its controls change.
  useEffect(() => {
    const first = card.current?.querySelector<HTMLElement>("button:not(:disabled)");
    (first ?? card.current)?.focus();
  }, [step]);

  const close = (
    <QuietLink
      className="out-of-tickets__quiet-link"
      disabled={step === "paying"}
      onClick={onClose}
    >
      {t(($) => $.tickets.notNow)}
    </QuietLink>
  );

  let body: ReactNode;
  if (step === "done" && bought) {
    body = (
      <>
        {/* The one reserve ticket, its badge on the new total. */}
        <TicketStubs
          className="out-of-tickets__art out-of-tickets__art--hero"
          size="hero"
          stubs={[
            {
              used: false,
              kind: "reserve",
              count: state ? ticketView(state).reserve : bought.tickets,
            },
          ]}
          pop
        />
        <h2 className="out-of-tickets__title" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.added, { count: bought.tickets })}
        </h2>
        <p className="out-of-tickets__line out-of-tickets__quiet">
          {t(($) => $.tickets.checkout.paid, { price: formatYen(bought.priceYen) })}
        </p>
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
        </Key>
        <LabelButton block icon={<BuyTicketsIcon />} onClick={() => setStep("choose")}>
          {t(($) => $.tickets.checkout.buyMore)}
        </LabelButton>
        {close}
      </>
    );
  } else if (step === "error") {
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.paymentFailed)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <strong>{error}</strong>
        </p>
        <TearLine />
        <Key
          className="out-of-tickets__key"
          tone="blue"
          icon={<BuyTicketsIcon />}
          onClick={() => setStep("choose")}
        >
          {t(($) => $.tickets.checkout.backToPacks)}
        </Key>
        {close}
      </>
    );
  } else {
    const paying = step === "paying";
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.title)}
        </h2>
        <p className="out-of-tickets__line">
          <strong>{t(($) => $.tickets.checkout.lead)}</strong>
        </p>
        <div className="reserve-checkout__balance">
          <span className="fine">{t(($) => $.tickets.checkout.balance)}</span>
          {sui.problem ? (
            <span role="alert">{sui.problem}</span>
          ) : jpyc.error ? (
            <span role="alert">
              {t(($) => $.tickets.checkout.balanceProblem, { reason: jpyc.error })}{" "}
              <QuietLink onClick={jpyc.refresh}>{t(($) => $.tickets.tryAgain)}</QuietLink>
            </span>
          ) : jpyc.balance === null || !shop ? (
            <span className="reserve-checkout__loading">
              <span className="visually-hidden" role="status">
                {t(($) => $.tickets.checkout.readingBalance)}
              </span>
              <Skeleton width={84} height={18} />
            </span>
          ) : (
            <strong className={REVEAL}>
              {formatYen(yenForJpyc(jpyc.balance, shop.payment.decimals))}
            </strong>
          )}
        </div>
        {packs.state === "failed" ? (
          <p className="reserve-checkout__problem" role="alert">
            {t(($) => $.tickets.checkout.pricesProblem, { reason: errorReason(packs.error) })}{" "}
            <QuietLink onClick={packs.retry}>{t(($) => $.tickets.tryAgain)}</QuietLink>
          </p>
        ) : !shop ? (
          <div className="reserve-checkout__packs">
            <p className="visually-hidden" role="status">
              {t(($) => $.tickets.checkout.gettingPrices)}
            </p>
            {/* The packs' own rows in outline, so nothing jumps as the prices come in. */}
            {PACKS_LOADING.map((n) => (
              <div key={n} className="reserve-checkout__pack" aria-hidden="true">
                <Skeleton width={24} height={16} />
                <Skeleton width={72} height={14} />
                <span />
                <Skeleton width={56} height={18} />
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`${REVEAL} reserve-checkout__packs`}
            role="group"
            aria-label={t(($) => $.tickets.checkout.packs)}
          >
            {shop.packs.map((p) => (
              <button
                key={p.tickets}
                type="button"
                className="reserve-checkout__pack"
                aria-pressed={p.tickets === chosen}
                disabled={paying}
                onClick={() => setChosen(p.tickets)}
              >
                <TicketCount kind="reserve" />
                <span className="reserve-checkout__pack-name">
                  {t(($) => $.tickets.checkout.pack, { count: p.tickets })}
                </span>
                {p.discountPercent > 0 && (
                  <span className="reserve-checkout__discount">
                    {t(($) => $.tickets.checkout.discount, { percent: p.discountPercent })}
                  </span>
                )}
                <span className="reserve-checkout__price">
                  {p.discountPercent > 0 && (
                    <s
                      aria-label={t(($) => $.tickets.checkout.was, {
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
          tone="blue"
          icon={<BuyTicketsIcon />}
          disabled={!pack || !shop || !sui.address || short || paying}
          onClick={() => pack && shop && void pay(pack, shop.payment)}
        >
          {paying
            ? t(($) => $.tickets.checkout.paying)
            : short
              ? t(($) => $.tickets.checkout.notEnoughJpyc)
              : pack
                ? t(($) => $.tickets.checkout.payPrice, { price: formatYen(pack.priceYen) })
                : t(($) => $.tickets.checkout.pay)}
        </Key>
        <SuiCredit className="reserve-checkout__credit" />
        {sui.address && shop && <TicketPurchases owner={sui.address} shop={shop} />}
        {close}
      </>
    );
  }

  return (
    <div className="out-of-tickets reserve-checkout">
      <div className="out-of-tickets__scrim" />
      <section
        ref={card}
        className="out-of-tickets__card reserve-checkout__card"
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
