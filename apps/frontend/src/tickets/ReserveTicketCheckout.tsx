import {
  useEffect,
  useEffectEvent,
  useId,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { ApiError } from "../api/apiClient";
import { useMe } from "../api/meContext";
import { errorDetail, errorMessage, problemOf, type Problem } from "../i18n/errorMessage";
import { i18next } from "../i18n/i18n";
import { Trans, useTranslation } from "../i18n/react";
import { ArrowClockwise, BuyTicketsIcon, DrawIcon } from "../icons";
import { usePrivyStatus } from "../identity/privy";
import { useSuiWalletFailure } from "../identity/suiWallet";
import type { JpycPayment } from "../payments/jpyc";
import { PaymentFailed } from "../payments/paymentErrors";
import { SuiCredit } from "../shop/SuiCredit";
import { CopyableFinePrint } from "../ui/CopyableFinePrint";
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
import {
  addUnaddedPurchase,
  forgetUnaddedPurchase,
  keepUnaddedPurchase,
  keptRefusal,
  refusalError,
  unaddedPurchaseToShow,
  unaddedPurchasesFor,
  useAddUnaddedPurchases,
  type UnaddedPurchase,
} from "./unaddedPurchases";
import { useTickets } from "./useTickets";
import "./tickets.css";
import "./ReserveTicketCheckout.css";

type Step = "choose" | "paying" | "done" | "error";

/** What a payment in flight waits on, in order: the signature, Sui running it, the server adding its tickets. */
type Waiting = "signing" | "confirming" | "adding";

interface Props {
  /** Draw, after a purchase. */
  onDraw: () => void;
  /** Close the card; also what Escape does. */
  onClose: () => void;
}

/**
 * Why adding a paid pack's tickets failed, in plain words. An API error's own detail repeats the
 * payment's ID, so it stays out of the card; anything else keeps its words as details for a report.
 */
const plainReason = (error: unknown): Problem =>
  error instanceof ApiError ? { message: errorMessage(error) } : problemOf(error);
/** Why asking again can never add a payment's tickets, in plain words. */
const refusedReason = (refusal: ApiError): Problem =>
  refusal.code === "payment_not_landed"
    ? { message: i18next.t(($) => $.tickets.checkout.refused.neverLanded) }
    : plainReason(refusal);

/** A signed payment whose tickets the server didn't add, and why. */
interface Unadded {
  purchase: UnaddedPurchase;
  reason: string;
  /** The English words behind the reason, for a report, when it isn't the server's answer. */
  detail?: string;
  /** Asking again can never add them: the card says so once, and the payment isn't kept. */
  refused: boolean;
  /** Sui showed this phone the payment go through. */
  landed: boolean;
}

/** How the checkout opens on a payment kept on this phone: a refusal first, since it shows once. */
function keptUnadded(userId: string): Unadded | null {
  const purchase = unaddedPurchaseToShow(unaddedPurchasesFor(userId));
  if (!purchase) return null;
  if (!purchase.refusal) return { purchase, reason: "", refused: false, landed: false };
  const { message, detail } = refusedReason(refusalError(purchase.refusal));
  return { purchase, reason: message, detail, refused: true, landed: false };
}

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
  const me = useMe();
  // A payment kept on this phone whose tickets aren't added comes first, so there's always a way back
  // to it: the checkout asks for its tickets again as it opens, or says once why they never will be.
  const [kept] = useState(() => keptUnadded(me.id));
  const [step, setStep] = useState<Step>(kept ? "error" : "choose");
  const [waiting, setWaiting] = useState<Waiting>("signing");
  const [chosen, setChosen] = useState<ReservePack["tickets"]>(1);
  const [bought, setBought] = useState<UnaddedPurchase | null>(null);
  const [failure, setFailure] = useState<PaymentFailure | null>(null);
  const [unadded, setUnadded] = useState<Unadded | null>(kept);
  const [adding, setAdding] = useState(kept !== null && !kept.refused);
  const packs = useReservePacks();
  const shop = packs.state === "ready" ? packs.data : null;
  const sui = useSuiAccount();
  const jpyc = useJpycBalance(sui.address, shop?.payment);
  const { tickets: state, buyer } = useTickets();
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

  /** Has the server add the tickets a payment bought; it stays kept on this phone until they're added. */
  const addTickets = (purchase: UnaddedPurchase) =>
    addUnaddedPurchase(buyer, me.id, purchase).then(() => {
      setUnadded(null);
      setBought(purchase);
      setStep("done");
    });

  /** Says why a payment's tickets weren't added. A refusal for good shows once, and the payment goes. */
  const showUnadded = (purchase: UnaddedPurchase, e: unknown, landed: boolean) => {
    const refusal = keptRefusal(me.id, purchase.digest);
    if (refusal) forgetUnaddedPurchase(me.id, purchase.digest);
    const { message, detail } = refusal ? refusedReason(refusal) : plainReason(e);
    setUnadded({ purchase, reason: message, detail, refused: refusal !== null, landed });
  };

  const pay = async (p: ReservePack, payment: JpycPayment) => {
    setStep("paying");
    setWaiting("signing");
    let paid: UnaddedPurchase | null = null;
    let landed = false;
    try {
      const [{ signTicketPayment }, { waitForSuiSigner }] = await Promise.all([
        import("../payments/jpyc"),
        import("../identity/suiSigner"),
      ]);
      const signed = await signTicketPayment(
        await waitForSuiSigner(),
        payment,
        BigInt(p.priceJpyc),
      );
      paid = {
        digest: signed.digest,
        tickets: p.tickets,
        priceYen: p.priceYen,
        paidAt: Date.now(),
      };
      // Kept before Sui is asked to run it, so a lost answer or a closed card or app can't lose it.
      keepUnaddedPurchase(me.id, paid);
      setWaiting("confirming");
      try {
        await signed.send();
        landed = true;
      } catch (e) {
        if (e instanceof PaymentFailed) throw e;
        // Sui may have run it all the same, so the server is asked for its tickets either way.
        console.error(`Sui's answer to the payment ${paid.digest} never came`, e);
      }
    } catch (e) {
      console.error(`Buying a pack of ${p.tickets} tickets with JPYC failed`, {
        digest: paid?.digest ?? null,
        error: e,
      });
      // Never signed, or Sui ran it and it failed: no JPYC moved either way.
      if (paid) forgetUnaddedPurchase(me.id, paid.digest);
      setFailure(paymentFailureOf(e));
      setStep("error");
      jpyc.refresh();
      return;
    }
    setWaiting("adding");
    try {
      await addTickets(paid);
    } catch (e) {
      console.error(`Adding the tickets that ${paid.digest} paid for failed`, e);
      showUnadded(paid, e, landed);
      setStep("error");
    } finally {
      jpyc.refresh();
    }
  };

  /** Asks again for the tickets a payment bought, while the key says so; the payment itself is never made again. */
  const askAgain = (purchase: UnaddedPurchase, landed: boolean) =>
    addTickets(purchase)
      .catch((e: unknown) => {
        console.error(`Adding the tickets that ${purchase.digest} paid for failed again`, e);
        showUnadded(purchase, e, landed);
      })
      .finally(() => setAdding(false));
  const addAgain = (purchase: UnaddedPurchase, landed: boolean) => {
    setAdding(true);
    void askAgain(purchase, landed);
  };

  /** Leaves a payment's card for the packs; one still waiting stays kept and is asked for again. */
  const backToPacks = () => {
    setUnadded(null);
    setStep("choose");
  };

  // Every payment kept for you is asked for again as the checkout opens. The one it opens on starts
  // with its key already asking, or, refused for good, is said once and goes.
  useAddUnaddedPurchases();
  const openOnKept = useEffectEvent(() => {
    if (!kept) return;
    if (kept.refused) forgetUnaddedPurchase(me.id, kept.purchase.digest);
    else void askAgain(kept.purchase, false);
  });
  useEffect(() => openOnKept(), []);

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
  } else if (step === "error" && unadded) {
    // The words behind the reason, if any, then the payment's ID: fine print under the key in its
    // own case, with a small Copy beside each.
    const payment = (
      <>
        {unadded.detail && <ErrorDetail text={unadded.detail} />}
        <CopyableFinePrint text={unadded.purchase.digest} lines={1}>
          <Trans
            i18nKey={($) => $.tickets.checkout.notAdded.payment}
            values={{ digest: unadded.purchase.digest }}
            components={{ id: <span className="reserve-checkout__digest" /> }}
          />
        </CopyableFinePrint>
      </>
    );
    body = unadded.refused ? (
      // Refused for good, said once: asking again can't change it, so the way on is the packs.
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.refused.title)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <Trans
            i18nKey={($) => $.tickets.checkout.refused.line}
            values={{ reason: unadded.reason }}
            components={{ strong: <strong />, why: <span className="out-of-tickets__quiet" /> }}
          />
        </p>
        <p className="out-of-tickets__note">{t(($) => $.tickets.checkout.refused.help)}</p>
        <TearLine />
        <Key
          className="out-of-tickets__key"
          tone="blue"
          icon={<BuyTicketsIcon />}
          onClick={backToPacks}
        >
          {t(($) => $.tickets.checkout.backToPacks)}
        </Key>
        {payment}
        {close}
      </>
    ) : (
      // The payment was signed and sent, so the key asks for its tickets again rather than paying
      // again; a quiet link still leads back to the packs, so a stuck payment never blocks buying.
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.notAdded.title)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <Trans
            i18nKey={
              unadded.landed
                ? ($) => $.tickets.checkout.notAdded.line
                : ($) => $.tickets.checkout.notAdded.unconfirmedLine
            }
            values={{ reason: unadded.reason }}
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
            if (!adding) addAgain(unadded.purchase, unadded.landed);
          }}
        >
          {adding
            ? t(($) => $.tickets.checkout.notAdded.adding)
            : t(($) => $.tickets.checkout.notAdded.add)}
        </Key>
        {payment}
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
              if (!paying && pack && shop) void pay(pack, shop.payment);
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

  // A refusal turns the tickets-not-added card over without a new step. The packs' arrival is a new
  // view too, so focus lands on the picked pack, not on the exit it started at.
  const view = unadded?.refused ? "refused" : step === "choose" && !shop ? "loading" : step;
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
