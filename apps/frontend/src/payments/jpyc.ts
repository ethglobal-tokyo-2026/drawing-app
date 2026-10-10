import type { TicketShop } from "@drawing-app/api/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { SuiGraphQLClient } from "@mysten/sui/graphql";
import { normalizeSuiAddress } from "@mysten/sui/utils";

/** Where the ticket shop's packs are paid, as the server names it. */
export type JpycPayment = TicketShop["payment"];

const BALANCE_TIMEOUT_MS = 10_000;
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
      // An event's type keeps its package's original ID across upgrades.
      type: `${payment.originalPackage}::payment::PaymentReceived`,
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
