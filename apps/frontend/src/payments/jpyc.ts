import {
  purchaseNamedBy,
  type StartedTicketPurchase,
  type TicketShop,
} from "@drawing-app/api/client";
import type { Signer } from "@mysten/sui/cryptography";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { coinWithBalance, Transaction, TransactionDataBuilder } from "@mysten/sui/transactions";
import { fromBase64, normalizeSuiAddress } from "@mysten/sui/utils";
import { PaymentFailed, SigningTimedOut } from "./paymentErrors";

/** Where the ticket shop's packs are paid, as the server names it. */
export type JpycPayment = TicketShop["payment"];

const BALANCE_TIMEOUT_MS = 10_000;
const PAYMENT_TIMEOUT_MS = 60_000;
/** How long the phone waits for Sui to serve a payment it just ran; the server waits for it too. */
const SERVED_TIMEOUT_MS = 10_000;
const HISTORY_TIMEOUT_MS = 15_000;
const HISTORY_PAGE = 20;

const clients = new Map<string, SuiGrpcClient>();
function clientFor(network: JpycPayment["network"]) {
  let client = clients.get(network);
  if (!client) {
    client = new SuiGrpcClient({ network, baseUrl: `https://fullnode.${network}.sui.io:443` });
    clients.set(network, client);
  }
  return client;
}

/** The JPYC `owner` holds, in base units. */
export async function getJpycBalance(owner: string, payment: JpycPayment): Promise<bigint> {
  const { balance } = await clientFor(payment.network).getBalance({
    owner,
    coinType: payment.coinType,
    signal: AbortSignal.timeout(BALANCE_TIMEOUT_MS),
  });
  return BigInt(balance.balance);
}

function withTimeout<T>(work: Promise<T>, ms: number, timedOut: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(timedOut()), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/** A ticket payment signed and not yet sent, so its digest can be kept before Sui is asked to run it. */
export interface SignedTicketPayment {
  digest: string;
  /**
   * Asks Sui to run it, and resolves once Sui has. Rejects with PaymentFailed when it ran and failed;
   * any other rejection leaves unknown whether it ran.
   */
  send: () => Promise<void>;
}

/**
 * Builds and signs a payment of `purchase`'s price into the ticket vault, with the payment
 * contract's `pay` naming the purchase's reference. Gas is paid in SUI. Rejects with SigningTimedOut
 * when building and signing take too long: a signature that comes later is never sent.
 */
export async function signTicketPayment(
  signer: Signer,
  payment: JpycPayment,
  purchase: Pick<StartedTicketPurchase, "priceJpyc" | "reference">,
): Promise<SignedTicketPayment> {
  const client = clientFor(payment.network);
  const amount = BigInt(purchase.priceJpyc);
  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  const coin = tx.add(coinWithBalance({ type: payment.coinType, balance: amount }));
  tx.moveCall({
    target: `${payment.paymentPackage}::payment::pay`,
    arguments: [
      tx.object(payment.vault),
      coin,
      tx.pure.u64(amount),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(purchase.reference))),
    ],
  });
  // `pay` takes the whole amount, so the coin is left empty, and a coin can't be dropped.
  tx.moveCall({
    target: "0x2::coin::destroy_zero",
    typeArguments: [payment.coinType],
    arguments: [coin],
  });

  const { bytes, signature } = await withTimeout(
    tx.build({ client }).then(async (built) => ({
      bytes: built,
      signature: (await signer.signTransaction(built)).signature,
    })),
    PAYMENT_TIMEOUT_MS,
    () => new SigningTimedOut(),
  );
  const digest = TransactionDataBuilder.getDigestFromBytes(bytes);
  return {
    digest,
    send: async () => {
      const result = await client.executeTransaction({
        transaction: bytes,
        signatures: [signature],
        signal: AbortSignal.timeout(PAYMENT_TIMEOUT_MS),
      });
      if (result.$kind === "FailedTransaction") {
        throw new PaymentFailed(
          digest,
          result.FailedTransaction.status.error?.message ?? "no reason given",
        );
      }
      // It ran, so Sui being slow to serve it is no failure: the server waits for Sui itself.
      await client
        .waitForTransaction({ digest, timeout: SERVED_TIMEOUT_MS })
        .catch((error: unknown) => {
          console.warn(`Sui ran the payment ${digest} but didn't serve it in time`, error);
        });
    },
  };
}

// GraphQL gives each event's time, which gRPC's list of events leaves out, and public fullnodes no
// longer serve JSON-RPC.
const historyClients = new Map<string, SuiGraphQLClient>();
function historyClientFor(network: JpycPayment["network"]) {
  let client = historyClients.get(network);
  if (!client) {
    client = new SuiGraphQLClient({ network, url: `https://graphql.${network}.sui.io/graphql` });
    historyClients.set(network, client);
  }
  return client;
}

/** One ticket payment `owner` made into the vault, for one of the account's purchases. */
export interface TicketPaymentRecord {
  digest: string;
  /** Milliseconds. */
  paidAt: number;
  /** JPYC base units. */
  amount: bigint;
}

export interface TicketPaymentPage {
  payments: TicketPaymentRecord[];
  /** Where the next, older page ends; null once there's none. */
  cursor: string | null;
}

interface PaymentEvents {
  events: {
    pageInfo: { hasPreviousPage: boolean; startCursor: string | null };
    nodes: {
      timestamp: string | null;
      contents: { json: unknown } | null;
      transaction: { digest: string } | null;
    }[];
  };
}

// Newest last, so `last` and `before` page back through time.
const PAYMENT_EVENTS = `
  query TicketPayments($sender: SuiAddress!, $type: String!, $last: Int!, $before: String) {
    events(last: $last, before: $before, filter: { sender: $sender, type: $type }) {
      pageInfo { hasPreviousPage startCursor }
      nodes { timestamp contents { json } transaction { digest } }
    }
  }
`;

/** Bytes as GraphQL prints a `vector<u8>`, in base64, read as text; null when they aren't base64. */
function textOf(base64: string): string | null {
  try {
    return new TextDecoder().decode(fromBase64(base64));
  } catch {
    return null;
  }
}

/** The payment contract's PaymentReceived, as GraphQL prints it. */
function paymentReceived(
  json: unknown,
): { vault: string; amount: bigint; reference: string } | null {
  if (typeof json !== "object" || json === null) return null;
  if (!("vault_id" in json) || !("amount" in json) || !("reference" in json)) return null;
  const { vault_id, amount } = json;
  const reference = typeof json.reference === "string" ? textOf(json.reference) : null;
  if (typeof vault_id !== "string" || typeof amount !== "string" || reference === null) return null;
  return { vault: normalizeSuiAddress(vault_id), amount: BigInt(amount), reference };
}

/**
 * The ticket payments `owner` sent into the vault for `userId`'s purchases, newest first, a page at
 * a time: the PaymentReceived events of their transactions whose reference names one of them. Only
 * a successful transaction emits one, and a page can list none.
 */
export async function getTicketPayments(
  owner: string,
  userId: string,
  payment: JpycPayment,
  cursor: string | null = null,
): Promise<TicketPaymentPage> {
  const { data, errors } = await historyClientFor(payment.network).query<PaymentEvents>({
    query: PAYMENT_EVENTS,
    variables: {
      sender: owner,
      type: `${payment.paymentPackage}::payment::PaymentReceived`,
      last: HISTORY_PAGE,
      before: cursor,
    },
    signal: AbortSignal.timeout(HISTORY_TIMEOUT_MS),
  });
  if (errors?.length || !data) {
    throw new Error(
      `Sui's GraphQL didn't list the ticket payments: ${errors?.map((e) => e.message).join("; ") ?? "no data"}`,
    );
  }
  const vault = normalizeSuiAddress(payment.vault);
  const payments = data.events.nodes.flatMap((event): TicketPaymentRecord[] => {
    const paid = paymentReceived(event.contents?.json);
    if (!paid || !event.transaction || !event.timestamp) {
      console.error(
        "Skipped a PaymentReceived event without a readable vault, amount, reference, time or transaction",
        event,
      );
      return [];
    }
    // Paid into another vault of the same contract: not this shop's.
    if (paid.vault !== vault) return [];
    // Only this account's purchases: the same wallet may have paid for an earlier account's.
    if (purchaseNamedBy(paid.reference)?.userId !== userId) return [];
    return [
      {
        digest: event.transaction.digest,
        paidAt: Date.parse(event.timestamp),
        amount: paid.amount,
      },
    ];
  });
  const { hasPreviousPage, startCursor } = data.events.pageInfo;
  return { payments: payments.reverse(), cursor: hasPreviousPage ? startCursor : null };
}
