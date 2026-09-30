import type { Tickets } from "@drawing-app/api/client";
import { useEffect, useSyncExternalStore } from "react";
import { ApiError, apiError, type ApiClient } from "../api/apiClient";
import { useMe } from "../api/meContext";
import { useApi } from "../api/useApi";
import { personKey, parseStored, readStored, writeStored } from "../ui/deviceStorage";
import { useTickets } from "./useTickets";

/**
 * Paid packs whose tickets the server hasn't added yet, kept in this phone's storage for the person
 * who paid, so closing the checkout or the app never loses a payment. Each is kept from the moment
 * its payment is signed, before Sui is asked to run it, until the server adds its tickets, or refuses
 * it for good. The server counts a payment once, so asking again is safe: the app, the Shop and the
 * checkout ask again for every kept one as they open, and the checkout opens on one still kept.
 */
export interface UnaddedPurchase {
  /** The Sui transaction that paid for the pack. */
  digest: string;
  /** How many tickets the pack has. */
  tickets: number;
  /** What the pack cost, in yen. */
  priceYen: number;
  /** When it was signed, in ms since the epoch. */
  paidAt: number;
  /**
   * Why the server refused it for good, once it has. It's never asked for again, and stays only
   * until the checkout says why, once.
   */
  refusal?: Refusal;
}

/** A refusal's status and error body, so the checkout can say why in the language of the day. */
interface Refusal {
  status: number;
  error: string;
  detail?: string;
}

/** The most payments kept for one person; past it, the oldest goes, named in the log. */
export const UNADDED_KEPT_MAX = 10;

/**
 * Refusals asking again can't change: the checkout says why once, and the payment goes. A 403
 * payment_not_yours isn't one: a payment this phone made names the person it's kept for, so it means
 * the session asking is someone else's, as when another window signed this browser in as them.
 */
export const REFUSAL_STATUSES: readonly number[] = [400, 402, 404, 410, 422];

/** Failures asking again can get past, as can no answer at all (status 0) and any 5xx. */
export const PASSING_FAILURE_STATUSES: readonly number[] = [408, 425, 429];

/**
 * Sui shows a payment within moments of running it. One it still doesn't show this long after it
 * was signed never ran, and never will: nothing keeps its signature to send it again.
 */
export const PAYMENT_LANDS_WITHIN_MS = 60 * 60_000;

/** One key per person, so signing in as someone else leaves another's payments be. */
const keyFor = (userId: string) => personKey("draw.unaddedPurchases", userId);

type TicketBuyer = Pick<ApiClient, "buyTickets" | "tickets">;

/** The server's answer while Sui doesn't show a payment yet. */
const NOT_LANDED = "payment_not_landed";

/** Whether asking again can never add `purchase`'s tickets: the server refused it, or Sui never showed it. */
const isFinal = (error: ApiError, { paidAt }: UnaddedPurchase) =>
  REFUSAL_STATUSES.includes(error.status) ||
  (error.code === NOT_LANDED && Date.now() - paidAt >= PAYMENT_LANDS_WITHIN_MS);

const canPass = (error: ApiError) =>
  error.status === 0 ||
  error.status >= 500 ||
  PASSING_FAILURE_STATUSES.includes(error.status) ||
  error.code === NOT_LANDED;

/** The refusal kept with a payment, as the error the server answered. */
export const refusalError = ({ status, error, detail }: Refusal): ApiError =>
  new ApiError(status, { error, detail });

const isKeptRefusal = (value: unknown): value is Refusal =>
  typeof value === "object" &&
  value !== null &&
  "status" in value &&
  typeof value.status === "number" &&
  "error" in value &&
  typeof value.error === "string" &&
  (!("detail" in value) || typeof value.detail === "string");

const isUnaddedPurchase = (value: unknown): value is UnaddedPurchase =>
  typeof value === "object" &&
  value !== null &&
  "digest" in value &&
  typeof value.digest === "string" &&
  value.digest !== "" &&
  "tickets" in value &&
  typeof value.tickets === "number" &&
  Number.isInteger(value.tickets) &&
  value.tickets > 0 &&
  "priceYen" in value &&
  typeof value.priceYen === "number" &&
  Number.isFinite(value.priceYen) &&
  "paidAt" in value &&
  typeof value.paidAt === "number" &&
  Number.isFinite(value.paidAt) &&
  (!("refusal" in value) || isKeptRefusal(value.refusal));

/** `userId`'s kept payments as storage has them; none when storage can't be read. */
function read(userId: string): UnaddedPurchase[] {
  const { text } = readStored(keyFor(userId), "The payments kept on this phone couldn't be read");
  if (text === null) return [];
  const value = parseStored(text);
  const purchases = Array.isArray(value) ? value.filter(isUnaddedPurchase) : [];
  // Logged whole, so a payment's ID can still be found and its tickets added by hand.
  if (!Array.isArray(value) || purchases.length !== value.length) {
    console.error(
      "Payments kept on this phone are unreadable, so they aren't asked for again:",
      text,
    );
  }
  return purchases;
}

/** Each person's kept payments, read from storage the first time they're asked for. */
const kept = new Map<string, readonly UnaddedPurchase[]>();

/** Screens showing kept payments, told whenever any person's change. */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const notify = () => listeners.forEach((listener) => listener());

/** Keeps `purchases` as `userId`'s, in memory even when storage refuses them. */
function write(userId: string, purchases: readonly UnaddedPurchase[]) {
  kept.set(userId, purchases);
  const digests = purchases.map((p) => p.digest).join(", ") || "none";
  writeStored(
    keyFor(userId),
    purchases.length === 0 ? null : JSON.stringify(purchases),
    `The payments kept on this phone couldn't be saved (${digests})`,
  );
  notify();
}

/** The payments kept for `userId` whose tickets aren't added yet, oldest first. */
export function unaddedPurchasesFor(userId: string): readonly UnaddedPurchase[] {
  let purchases = kept.get(userId);
  if (!purchases) {
    purchases = read(userId);
    kept.set(userId, purchases);
  }
  return purchases;
}

/** Keeps a signed payment until the server adds its tickets. */
export function keepUnaddedPurchase(userId: string, purchase: UnaddedPurchase): void {
  const purchases = [
    ...unaddedPurchasesFor(userId).filter((p) => p.digest !== purchase.digest),
    purchase,
  ];
  const over = Math.max(0, purchases.length - UNADDED_KEPT_MAX);
  for (const dropped of purchases.splice(0, over)) {
    console.error(
      `More than ${UNADDED_KEPT_MAX} payments are waiting for their tickets, so this phone stops asking for the oldest:`,
      dropped,
    );
  }
  write(userId, purchases);
}

/** Lets a payment go: its tickets were added, or the checkout has said why they never will be. */
export function forgetUnaddedPurchase(userId: string, digest: string): void {
  const purchases = unaddedPurchasesFor(userId);
  if (purchases.some((p) => p.digest === digest)) {
    write(
      userId,
      purchases.filter((p) => p.digest !== digest),
    );
  }
}

/** Marks a payment refused for good, so it's never asked for again and the checkout says why once. */
function refuse(userId: string, digest: string, { status, code, detail }: ApiError) {
  const purchases = unaddedPurchasesFor(userId);
  if (!purchases.some((p) => p.digest === digest)) return;
  const refusal: Refusal =
    detail === undefined ? { status, error: code } : { status, error: code, detail };
  console.error(
    `Asking again can't add the tickets ${digest} paid for, so this phone stops asking for them`,
    refusal,
  );
  write(
    userId,
    purchases.map((p) => (p.digest === digest ? { ...p, refusal } : p)),
  );
}

/** Why asking again can never add the tickets of `userId`'s kept payment `digest`; null while it can. */
export function keptRefusal(userId: string, digest: string): ApiError | null {
  const refusal = unaddedPurchasesFor(userId).find((p) => p.digest === digest)?.refusal;
  return refusal ? refusalError(refusal) : null;
}

/** The kept payment a screen shows and the checkout opens on: one refused for good first, since the checkout says why only once. */
export const unaddedPurchaseToShow = (
  purchases: readonly UnaddedPurchase[],
): UnaddedPurchase | undefined => purchases.find((p) => p.refusal) ?? purchases.at(0);

/** For tests: reads storage again, as the app's code does when it starts. */
export function readUnaddedPurchasesAgain(): void {
  kept.clear();
  notify();
}

/** Asks with a request still out, by payment ID, so asking again joins it instead of sending another. */
const asking = new Map<string, Promise<Tickets>>();

async function ask(api: TicketBuyer, userId: string, purchase: UnaddedPurchase) {
  const { digest, tickets } = purchase;
  try {
    const added = await api.buyTickets({ tickets, txDigest: digest });
    forgetUnaddedPurchase(userId, digest);
    return added;
  } catch (caught) {
    const error = apiError(caught);
    // An earlier ask added them, and only its answer was lost.
    if (error.code !== "payment_already_counted") {
      if (isFinal(error, purchase)) refuse(userId, digest, error);
      else if (error.code === "payment_not_yours") {
        console.error(
          `The session asking for the tickets ${digest} paid for isn't the one it was kept for; this phone keeps it`,
          error,
        );
      } else if (!canPass(error)) {
        // The server never judged the payment, so it stays kept rather than lost.
        console.error(
          `Asking for the tickets ${digest} paid for failed in a way asking again may not get past; this phone keeps it`,
          error,
        );
      }
      throw caught;
    }
  }
  forgetUnaddedPurchase(userId, digest);
  return api.tickets();
}

/**
 * Asks the server for the tickets `purchase` paid for, with the same payment, and resolves to your
 * tickets once they're added; a payment already counted counts as added. On any other failure this
 * rejects: a failure asking again can't change (see isFinal) marks the payment refused, and anything
 * else keeps it.
 */
export function addUnaddedPurchase(
  api: TicketBuyer,
  userId: string,
  purchase: UnaddedPurchase,
): Promise<Tickets> {
  const out = asking.get(purchase.digest);
  if (out) return out;
  const asked = ask(api, userId, purchase).finally(() => asking.delete(purchase.digest));
  asking.set(purchase.digest, asked);
  return asked;
}

/**
 * Asks again, one at a time, for the tickets of every payment kept for `userId` and not refused.
 * Resolves to your tickets after the last one added, or null when none was.
 */
export async function addUnaddedPurchases(
  api: TicketBuyer,
  userId: string,
): Promise<Tickets | null> {
  let tickets: Tickets | null = null;
  for (const purchase of unaddedPurchasesFor(userId)) {
    if (purchase.refusal) continue;
    try {
      tickets = await addUnaddedPurchase(api, userId, purchase);
    } catch (error) {
      console.warn(`The tickets ${purchase.digest} paid for still aren't added`, error);
    }
  }
  return tickets;
}

/** The payments kept for you whose tickets aren't added yet, as they are: it follows their being kept, added and refused. */
export function useUnaddedPurchases(): readonly UnaddedPurchase[] {
  const { id } = useMe();
  return useSyncExternalStore(subscribe, () => unaddedPurchasesFor(id));
}

/** Quietly asks again for the tickets of every payment kept for you, as whatever calls it opens. */
export function useAddUnaddedPurchases(): void {
  const api = useApi();
  const { id } = useMe();
  const { set } = useTickets();
  useEffect(() => {
    void addUnaddedPurchases(api, id).then((tickets) => {
      if (tickets) set(tickets);
    });
  }, [api, id, set]);
}
