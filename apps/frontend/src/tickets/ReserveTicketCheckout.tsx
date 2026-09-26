import { useEffect, useEffectEvent, useId, useRef, useState, type ReactNode } from "react";
import { ApiError } from "../api/apiClient";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { errorMessage, errorReason } from "../i18n/errorMessage";
import { Trans, useTranslation } from "../i18n/react";
import { ArrowClockwise, BuyTicketsIcon, Copy, DrawIcon } from "../icons";
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
import {
  addUnaddedPurchase,
  forgetUnaddedPurchase,
  isRefusal,
  keepUnaddedPurchase,
  refusalError,
  unaddedPurchasesFor,
  useAddUnaddedPurchases,
  type UnaddedPurchase,
} from "./unaddedPurchases";
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
/** Why adding a paid pack's tickets failed, in plain words: an API error's detail repeats the payment's ID. */
const plainReason = (error: unknown) =>
  error instanceof ApiError ? errorMessage(error) : reason(error);

/** A payment that went through, whose tickets the server didn't add, and why. */
interface Unadded {
  purchase: UnaddedPurchase;
  reason: string;
  /** The server refused them for good: the card says so once, and the payment isn't kept. */
  refused: boolean;
}

/** How the checkout opens on a payment kept on this phone: a refusal first, since it shows once. */
function keptUnadded(userId: string): Unadded | null {
  const purchases = unaddedPurchasesFor(userId);
  const purchase = purchases.find((p) => p.refusal) ?? purchases.at(0);
  if (!purchase) return null;
  return purchase.refusal
    ? { purchase, reason: plainReason(refusalError(purchase.refusal)), refused: true }
    : { purchase, reason: "", refused: false };
}

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
  const me = useMe();
  // A payment kept on this phone whose tickets aren't added comes first, so there's always a way back
  // to it: the checkout asks for its tickets again as it opens, or says once why they never will be.
  const [kept] = useState(() => keptUnadded(me.id));
  const [step, setStep] = useState<Step>(kept ? "error" : "choose");
  const [chosen, setChosen] = useState<ReservePack["tickets"]>(1);
  const [bought, setBought] = useState<UnaddedPurchase | null>(null);
  const [error, setError] = useState("");
  const [unadded, setUnadded] = useState<Unadded | null>(kept);
  const [adding, setAdding] = useState(kept !== null && !kept.refused);
  const [copied, setCopied] = useState(false);
  const packs = useReservePacks();
  const shop = packs.state === "ready" ? packs.data : null;
  const sui = useSuiAccount();
  const jpyc = useJpycBalance(sui.address, shop?.payment);
  const api = useApi();
  const { tickets: state, set: setTickets } = useTickets();
  const card = useRef<HTMLElement>(null);
  const id = useId();

  const pack = shop?.packs.find((p) => p.tickets === chosen);
  const balance = jpyc.balance;
  const short = pack && balance !== null && balance < BigInt(pack.priceJpyc);
  // What to do when it's short: a smaller pack, if the balance covers one.
  const coversSmaller =
    balance !== null && !!shop?.packs.some((p) => BigInt(p.priceJpyc) <= balance);

  /** Has the server add the tickets a payment bought; it stays kept on this phone until they're added. */
  const addTickets = (purchase: UnaddedPurchase) =>
    addUnaddedPurchase(api, me.id, purchase).then((added) => {
      setTickets(added);
      setUnadded(null);
      setBought(purchase);
      setStep("done");
    });

  /** Says why a payment's tickets weren't added. A refusal for good shows once, and the payment goes. */
  const showUnadded = (purchase: UnaddedPurchase, e: unknown) => {
    const refused = isRefusal(e);
    if (refused) forgetUnaddedPurchase(me.id, purchase.digest);
    setUnadded({ purchase, reason: plainReason(e), refused });
  };

  const pay = async (p: ReservePack, payment: JpycPayment) => {
    setStep("paying");
    let paid: UnaddedPurchase | null = null;
    try {
      const [{ payForTickets }, { waitForSuiSigner }] = await Promise.all([
        import("../payments/jpyc"),
        import("../identity/suiSigner"),
      ]);
      const digest = await payForTickets(await waitForSuiSigner(), payment, BigInt(p.priceJpyc));
      paid = { digest, tickets: p.tickets, priceYen: p.priceYen, paidAt: Date.now() };
      // Kept before the server is asked, so closing the card or the app can't lose the payment.
      keepUnaddedPurchase(me.id, paid);
      await addTickets(paid);
    } catch (e) {
      const digest = paid?.digest ?? null;
      console.error(`Buying a pack of ${p.tickets} tickets with JPYC failed`, { digest, error: e });
      if (paid) {
        showUnadded(paid, e);
        setCopied(false);
      } else {
        setError(reason(e));
      }
      setStep("error");
    } finally {
      jpyc.refresh();
    }
  };

  /** Asks again for the tickets a payment bought, while the key says so; the payment itself is never made again. */
  const askAgain = (purchase: UnaddedPurchase) =>
    addTickets(purchase)
      .catch((e: unknown) => {
        console.error(`Adding the tickets that ${purchase.digest} paid for failed again`, e);
        showUnadded(purchase, e);
      })
      .finally(() => setAdding(false));
  const addAgain = (purchase: UnaddedPurchase) => {
    setAdding(true);
    void askAgain(purchase);
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
    else void askAgain(kept.purchase);
  });
  useEffect(() => openOnKept(), []);

  const copyPayment = async (digest: string) => {
    try {
      await navigator.clipboard.writeText(digest);
      setCopied(true);
    } catch (e) {
      // The ID stays selectable, so it can still be copied by hand.
      console.error(`Couldn't copy the payment ${digest}`, e);
    }
  };

  useFocusTrap(card, {
    onEscape: () => {
      if (step !== "paying" && !adding) onClose();
    },
  });

  // Each view's first control takes focus, so focus never drops out of the card when its controls
  // change, as when a refusal turns the tickets-not-added card over.
  const refused = unadded?.refused ?? false;
  useEffect(() => {
    const first = card.current?.querySelector<HTMLElement>("button:not(:disabled)");
    (first ?? card.current)?.focus();
  }, [step, refused]);

  const close = (
    <QuietLink
      className="out-of-tickets__quiet-link"
      disabled={step === "paying" || adding}
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
  } else if (step === "error" && unadded) {
    // The payment's ID, fine print under the key in its own case, with a small Copy beside it.
    const payment = (
      <div className="reserve-checkout__payment">
        <span className="fine reserve-checkout__payment-id" id={`${id}-payment`}>
          <Trans
            i18nKey={($) => $.tickets.checkout.notAdded.payment}
            values={{ digest: unadded.purchase.digest }}
            components={{ id: <span className="reserve-checkout__digest" /> }}
          />
        </span>
        <LabelButton
          size="sm"
          icon={<Copy />}
          aria-describedby={`${id}-payment`}
          onClick={() => void copyPayment(unadded.purchase.digest)}
        >
          {copied
            ? t(($) => $.tickets.checkout.notAdded.copied)
            : t(($) => $.tickets.checkout.notAdded.copy)}
        </LabelButton>
      </div>
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
      // The payment went through, so the key asks for its tickets again rather than paying again; a
      // quiet link still leads back to the packs, so a stuck payment never blocks buying.
      <>
        <h2 className="out-of-tickets__title out-of-tickets__title--top" id={`${id}-title`}>
          {t(($) => $.tickets.checkout.notAdded.title)}
        </h2>
        <p className="out-of-tickets__line" role="alert">
          <Trans
            i18nKey={($) => $.tickets.checkout.notAdded.line}
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
            if (!adding) addAgain(unadded.purchase);
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
          <span className="fine reserve-checkout__balance-label">
            {t(($) => $.tickets.checkout.balance)}
          </span>
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
                <span className="reserve-checkout__price">
                  {p.discountPercent > 0 && (
                    <span className="reserve-checkout__was">
                      <span className="fine reserve-checkout__discount">
                        {t(($) => $.tickets.checkout.discount, { percent: p.discountPercent })}
                      </span>
                      <s
                        aria-label={t(($) => $.tickets.checkout.was, {
                          price: formatYen(p.tickets * TICKET_PRICE_YEN),
                        })}
                      >
                        {formatYen(p.tickets * TICKET_PRICE_YEN)}
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
        aria-busy={step === "paying" || adding}
        tabIndex={-1}
      >
        {body}
      </section>
    </div>
  );
}
