import type { TicketPurchasePayment } from "@drawing-app/api/client";
import { useEffect, useId, useState, type KeyboardEvent, type ReactNode } from "react";
import { ApiError } from "../api/apiClient";
import { useApi } from "../api/useApi";
import { errorDetail, errorMessage, problemOf } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { ArrowClockwise, BuyTicketsIcon, DrawIcon } from "../icons";
import { usePrivyStatus } from "../identity/privy";
import { useSuiWalletFailure } from "../identity/suiWallet";
import type { JpycPayment } from "../payments/jpyc";
import { SuiCredit } from "../shop/SuiCredit";
import { ErrorDetail, ErrorLine } from "../ui/ErrorLine";
import { Key } from "../ui/Key";
import { LabelButton } from "../ui/LabelButton";
import { QuietLink } from "../ui/QuietLink";
import { REVEAL } from "../ui/reveal";
import { Skeleton } from "../ui/Skeleton";
import { TearLine } from "../ui/TearLine";
import { useBackToClose } from "../ui/useBackToClose";
import { paymentFailureOf, type PaymentFailure } from "./paymentFailure";
import { formatYen, yenForJpyc } from "./prices";
import { singleTicketPrice, useReservePacks, type ReservePack } from "./reservePacks";
import { TicketCard } from "./TicketCard";
import { TicketCount } from "./TicketCount";
import { SuiAddressReveal } from "./SuiAddressReveal";
import { TicketPurchases } from "./TicketPurchases";
import { describeTickets, ticketView } from "./tickets";
import { TicketStubs } from "./TicketStubs";
import { useTickets } from "./useTickets";
import "./tickets.css";
import "./ReserveTicketCheckout.css";

type Step = "choose" | "paying" | "done" | "error";

/** What a payment in flight waits on, in order: the signature, then the server running it and adding its tickets. */
type Waiting = "signing" | "adding";

interface Props {
  /** Draw, after a purchase. */
  onDraw: () => void;
  /** Close the card; also what Escape does. */
  onClose: () => void;
}

/** A signed payment, with what it buys. */
interface SignedPurchase {
  body: TicketPurchasePayment;
  tickets: number;
  priceYen: number;
}

/**
 * A signed payment whose answer never came: Sui may have run it, so asking again sends the same one,
 * which can't pay twice, and the server adds a landed payment's tickets by itself too.
 */
interface LostAnswer extends SignedPurchase {
  /** The server's code for why, in plain words. */
  reason: string;
}

/** No answer, or the server failing: whether the payment ran isn't known. */
const answerLost = (error: unknown): error is ApiError =>
  error instanceof ApiError && (error.status === 0 || error.status >= 500);

/** One outline row per pack on sale, while today's prices load. */
const PACKS_LOADING = [1, 2, 3, 4];

/** How far each arrow key moves the pick, in a list read top to bottom. */
const ARROWS: Record<string, 1 | -1 | undefined> = {
  ArrowDown: 1,
  ArrowRight: 1,
  ArrowUp: -1,
  ArrowLeft: -1,
};

/** Why the Sui account can't be used: a plain line, and the raw words for fine print beside Copy. */
interface AccountProblem {
  line: string;
  detail: string;
}

/** The person's Privy Sui account: its address, or why there's none yet. */
function useSuiAccount(): { address?: string; problem?: AccountProblem } {
  const { t } = useTranslation();
  const privy = usePrivyStatus();
  const failure = useSuiWalletFailure();
  if (failure)
    return { problem: { line: t(($) => $.tickets.checkout.walletBroken), detail: failure } };
  if (privy.state === "failed") {
    return {
      problem: {
        line: t(($) => $.tickets.checkout.walletSignInFailed),
        detail: privy.reason,
      },
    };
  }
  if (privy.state === "off") {
    return { problem: { line: t(($) => $.tickets.checkout.walletNeedsLine), detail: "" } };
  }
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
          if (live) setError(problemOf(e).detail);
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
  const [waiting, setWaiting] = useState<Waiting>("signing");
  const [chosen, setChosen] = useState<ReservePack["tickets"]>(1);
  const [bought, setBought] = useState<SignedPurchase | null>(null);
  const [failure, setFailure] = useState<PaymentFailure | null>(null);
  const [lost, setLost] = useState<LostAnswer | null>(null);
  const [adding, setAdding] = useState(false);
  const packs = useReservePacks();
  const shop = packs.state === "ready" ? packs.data : null;
  const sui = useSuiAccount();
  const jpyc = useJpycBalance(sui.address, shop?.payment);
  const { tickets: state, buyer } = useTickets();
  const api = useApi();
  const id = useId();

  const pack = shop?.packs.find((p) => p.tickets === chosen);
  // A discounted pack's full price is its tickets at the server's price for one alone.
  const single = shop && singleTicketPrice(shop.packs);
  const balance = jpyc.balance;
  /** The raw words behind a problem with the account or the balance, when there are any. */
  const balanceDetail = sui.problem ? sui.problem.detail : (jpyc.error ?? "");
  const short = pack && balance !== null && balance < BigInt(pack.priceJpyc);
  // What to do when it's short: a smaller pack, if the balance covers one.
  const coversSmaller =
    balance !== null && !!shop?.packs.some((p) => BigInt(p.priceJpyc) <= balance);

  /** Has the server run a signed payment and add its tickets. */
  const submit = async (signed: SignedPurchase) => {
    try {
      await buyer.buyTickets(signed.body);
      setLost(null);
      setBought(signed);
      setStep("done");
    } catch (e) {
      console.error(`Adding the tickets that ${signed.body.digest} paid for failed`, e);
      if (answerLost(e)) {
        setLost({ ...signed, reason: errorMessage(e) });
      } else {
        setLost(null);
        setFailure(paymentFailureOf(e));
      }
      setStep("error");
    } finally {
      jpyc.refresh();
    }
  };

  const pay = async (p: ReservePack) => {
    setStep("paying");
    setWaiting("signing");
    let signed: SignedPurchase;
    try {
      // Sui's SDK loads with the checkout's first payment, not with the app.
      const { signSponsored, waitForSuiSigner } = await import("../identity/suiSigner");
      await waitForSuiSigner();
      // The server records the purchase and builds its payment, which the wallet signs as sender.
      const { purchase, payment } = await api.startTicketPurchase(p.tickets);
      const { digest, signature } = await signSponsored(payment);
      signed = {
        body: { purchaseId: purchase.id, digest, signature },
        tickets: purchase.tickets,
        priceYen: purchase.priceYen,
      };
    } catch (e) {
      console.error(`Buying a pack of ${p.tickets} tickets with JPYC failed`, e);
      setFailure(paymentFailureOf(e));
      setStep("error");
      return;
    }
    setWaiting("adding");
    await submit(signed);
  };

  /** Sends the same signed payment again, while its key says so: it can never pay twice. */
  const askAgain = (signed: SignedPurchase) => {
    setAdding(true);
    void submit(signed).finally(() => setAdding(false));
  };

  /** Leaves a payment whose answer never came for the packs; the server still adds its tickets if it ran. */
  const backToPacks = () => {
    setLost(null);
    setStep("choose");
  };

  const paying = step === "paying";
  const busy = paying || adding;
  /** Closes the card, unless a payment is on its way: false tells Back it can't close yet. */
  const leave = () => {
    if (busy) return false;
    onClose();
    return true;
  };
  useBackToClose(true, leave);

  const close = (
    <QuietLink className="out-of-tickets__quiet-link" disabled={busy} onClick={onClose}>
      {t(($) => $.tickets.notNow)}
    </QuietLink>
  );

  /** Arrow keys move the pick through the packs, and focus with it, as a radio group's do. */
  const pickWithArrows = (e: KeyboardEvent<HTMLDivElement>) => {
    const onSale = shop?.packs;
    const way = ARROWS[e.key];
    if (!onSale || !way || busy) return;
    e.preventDefault();
    const from = onSale.findIndex((p) => p.tickets === chosen);
    const to = (from + way + onSale.length) % onSale.length;
    const next = onSale[to];
    if (!next) return;
    setChosen(next.tickets);
    e.currentTarget.querySelectorAll<HTMLElement>("[role=radio]")[to]?.focus();
  };

  let body: ReactNode;
  /** The packs card, whose foot stays in view while its packs scroll. */
  let packsCard = false;
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
  } else if (step === "error" && lost) {
    // Signed and sent, so the key sends the same payment again rather than paying again; a quiet link
    // still leads back to the packs, so a lost answer never blocks buying.
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.notAdded.title)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <Trans
            i18nKey={($) => $.tickets.checkout.notAdded.line}
            values={{ reason: lost.reason }}
            components={{ strong: <strong />, why: <span className="out-of-tickets__quiet" /> }}
          />
        </p>
        <TearLine />
        <Key
          className="out-of-tickets__key"
          tone="blue"
          icon={<ArrowClockwise />}
          aria-busy={adding}
          aria-disabled={adding}
          onClick={() => {
            if (!adding) askAgain(lost);
          }}
        >
          {adding
            ? t(($) => $.tickets.checkout.notAdded.adding)
            : t(($) => $.tickets.checkout.notAdded.add)}
        </Key>
        <QuietLink className="out-of-tickets__quiet-link" disabled={adding} onClick={backToPacks}>
          {t(($) => $.tickets.checkout.backToPacks)}
        </QuietLink>
        {close}
      </>
    );
  } else if (step === "error" && failure) {
    body = (
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.paymentFailed)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <strong>
            {failure.kind === "app"
              ? errorMessage(failure.error)
              : t(($) => $.tickets.checkout.paymentFailure[failure.kind])}
          </strong>
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
        {failure.detail && <ErrorDetail text={failure.detail} />}
        {close}
      </>
    );
  } else {
    // The packs scroll on a short phone; the way to pay and the way out stay under them.
    packsCard = true;
    body = (
      <>
        <div className="reserve-checkout__body">
          <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
            {t(($) => $.tickets.checkout.title)}
          </h2>
          <p className="out-of-tickets__line">
            <strong>{t(($) => $.tickets.checkout.lead)}</strong>
          </p>
          <div className="reserve-checkout__balance">
            <span className="fine reserve-checkout__balance-label">
              {t(($) => $.tickets.checkout.balance)}
            </span>
            {sui.problem ? (
              <span role="alert">{sui.problem.line}</span>
            ) : jpyc.error ? (
              <span role="alert">
                {t(($) => $.tickets.checkout.balanceProblem)}{" "}
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
          {balanceDetail && <ErrorDetail text={balanceDetail} />}
          {packs.state === "failed" ? (
            <ErrorLine
              className="reserve-checkout__problem"
              detail={errorDetail(packs.error)}
              onRetry={packs.retry}
            >
              {t(($) => $.tickets.checkout.pricesProblem, { reason: errorMessage(packs.error) })}
            </ErrorLine>
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
                  <Skeleton width={56} height={18} />
                </div>
              ))}
            </div>
          ) : (
            <div
              className={`${REVEAL} reserve-checkout__packs`}
              role="radiogroup"
              aria-label={t(($) => $.tickets.checkout.packs)}
              onKeyDown={pickWithArrows}
            >
              {shop.packs.map((p) => (
                <button
                  key={p.tickets}
                  type="button"
                  role="radio"
                  className="reserve-checkout__pack"
                  aria-checked={p.tickets === chosen}
                  aria-disabled={paying}
                  tabIndex={p.tickets === chosen ? 0 : -1}
                  onClick={() => {
                    if (!paying) setChosen(p.tickets);
                  }}
                >
                  <TicketCount kind="reserve" />
                  <span className="reserve-checkout__pack-name">
                    {t(($) => $.tickets.checkout.pack, { count: p.tickets })}
                  </span>
                  <span className="reserve-checkout__price">
                    {p.discountPercent > 0 && single && (
                      <span className="reserve-checkout__was">
                        <span className="fine reserve-checkout__discount">
                          {t(($) => $.tickets.checkout.discount, { percent: p.discountPercent })}
                        </span>
                        <s
                          aria-label={t(($) => $.tickets.checkout.was, {
                            price: formatYen(p.tickets * single.priceYen),
                          })}
                        >
                          {formatYen(p.tickets * single.priceYen)}
                        </s>
                      </span>
                    )}
                    <strong>{formatYen(p.priceYen)}</strong>
                  </span>
                </button>
              ))}
            </div>
          )}
          {/* Always there, so a screen reader hears the line as a pick brings it. */}
          <div role="status">
            {short && (
              <p className="reserve-checkout__short">
                {coversSmaller ? (
                  <Trans
                    i18nKey={($) => $.tickets.checkout.short.pickSmaller}
                    components={{ strong: <strong /> }}
                  />
                ) : (
                  <Trans
                    i18nKey={($) => $.tickets.checkout.short.addJpyc}
                    components={{ strong: <strong /> }}
                  />
                )}
              </p>
            )}
          </div>
          {short && sui.address && <SuiAddressReveal address={sui.address} />}
          {sui.address && shop && <TicketPurchases owner={sui.address} shop={shop} />}
        </div>
        <div className="reserve-checkout__foot">
          <TearLine />
          {/* Says what the payment waits on as it changes, and that closing the app is safe. */}
          <div role="status">
            {paying && (
              <p className="out-of-tickets__note">
                {t(($) => $.tickets.checkout.waiting[waiting])}
              </p>
            )}
          </div>
          <Key
            className="out-of-tickets__key"
            tone="blue"
            icon={<BuyTicketsIcon />}
            disabled={!pack || !shop || !sui.address || short}
            aria-busy={paying}
            aria-disabled={paying}
            onClick={() => {
              if (!paying && pack && shop) void pay(pack);
            }}
          >
            {paying
              ? t(($) => $.tickets.checkout.paying)
              : pack
                ? t(($) => $.tickets.checkout.payPrice, { price: formatYen(pack.priceYen) })
                : t(($) => $.tickets.checkout.pay)}
          </Key>
          <SuiCredit className="reserve-checkout__credit" />
          {close}
        </div>
      </>
    );
  }

  // A lost answer that fails for good on its key turns its card over without a new step. The packs'
  // arrival is a new view too, so focus lands on the picked pack, not on the exit it started at.
  // Paying stays the packs' view, so focus stays on Pay while it waits.
  const view = lost
    ? "lost"
    : step === "choose" && !shop
      ? "loading"
      : step === "paying"
        ? "choose"
        : step;
  return (
    <TicketCard
      className="reserve-checkout"
      cardClassName={`reserve-checkout__card${packsCard ? " reserve-checkout__card--split" : ""}`}
      labelledBy={`${id}-title`}
      busy={busy}
      onEscape={() => void leave()}
      onScrimClick={() => void leave()}
      refocus={view}
    >
      {body}
    </TicketCard>
  );
}
