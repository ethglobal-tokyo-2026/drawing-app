import type { TicketShop } from "@drawing-app/api/client";
import type { Signer } from "@mysten/sui/cryptography";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";
import { normalizeSuiAddress } from "@mysten/sui/utils";

/** Where the ticket shop's packs are paid, as the server names it. */
export type JpycPayment = TicketShop["payment"];

const BALANCE_TIMEOUT_MS = 10_000;
const PAYMENT_TIMEOUT_MS = 60_000;
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

function withTimeout<T>(work: Promise<T>, ms: number, message: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(message)), ms);
  });
  return Promise.race([work, timeout]).finally(() => clearTimeout(timer));
}

/**
 * Pays `amount` JPYC base units into the ticket vault with the payment contract's `pay`, naming the
 * server's reference, and resolves with the transaction digest once Sui serves it. Gas is paid in SUI.
 */
export async function payForTickets(
  signer: Signer,
  payment: JpycPayment,
  amount: bigint,
): Promise<string> {
  const client = clientFor(payment.network);
  const tx = new Transaction();
  tx.setSender(signer.toSuiAddress());
  const coin = tx.add(coinWithBalance({ type: payment.coinType, balance: amount }));
  tx.moveCall({
    target: `${payment.paymentPackage}::payment::pay`,
    arguments: [
      tx.object(payment.vault),
      coin,
      tx.pure.u64(amount),
      tx.pure.vector("u8", Array.from(new TextEncoder().encode(payment.reference))),
    ],
  });
  // `pay` takes the whole amount, so the coin is left empty, and a coin can't be dropped.
  tx.moveCall({
    target: "0x2::coin::destroy_zero",
    typeArguments: [payment.coinType],
    arguments: [coin],
  });

  const result = await withTimeout(
    signer.signAndExecuteTransaction({ transaction: tx, client }),
    PAYMENT_TIMEOUT_MS,
    "Sui didn’t answer the payment in time. Check your JPYC balance before trying again.",
  );
  if (result.$kind === "FailedTransaction") {
    const { digest, status } = result.FailedTransaction;
    throw new Error(
      `Sui rejected the payment ${digest}: ${status.error?.message ?? "no reason given"}`,
    );
  }
  const { digest } = result.Transaction;
  // The server reads the payment back from Sui, so this waits until Sui serves it.
  await client.waitForTransaction({ digest, timeout: PAYMENT_TIMEOUT_MS });
  return digest;
}

// gRPC can't list an address's events, and public fullnodes no longer serve JSON-RPC.
const historyClients = new Map<string, SuiGraphQLClient>();
function historyClientFor(network: JpycPayment["network"]) {
  let client = historyClients.get(network);
  if (!client) {
    client = new SuiGraphQLClient({ network, url: `https://graphql.${network}.sui.io/graphql` });
    historyClients.set(network, client);
  }
  return client;
}

/** One ticket payment `owner` made into the vault. */
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

/** The payment contract's PaymentReceived, as GraphQL prints it. */
function paymentReceived(json: unknown): { vault: string; amount: bigint } | null {
  if (typeof json !== "object" || json === null || !("vault_id" in json) || !("amount" in json)) {
    return null;
  }
  const { vault_id, amount } = json;
  if (typeof vault_id !== "string" || typeof amount !== "string") return null;
  return { vault: normalizeSuiAddress(vault_id), amount: BigInt(amount) };
}

/**
 * The ticket payments `owner` sent into the vault, newest first, a page at a time: the
 * PaymentReceived events of their transactions. Only a successful transaction emits one.
 */
export async function getTicketPayments(
  owner: string,
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
      console.error("Skipped a PaymentReceived event GraphQL didn't print in full", event);
      return [];
    }
    // Paid into another vault of the same contract: not this shop's.
    if (paid.vault !== vault) return [];
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
