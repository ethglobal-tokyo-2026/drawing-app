import type { TicketShop } from "@drawing-app/api/client";
import type { Signer } from "@mysten/sui/cryptography";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { coinWithBalance, Transaction } from "@mysten/sui/transactions";

/** Where the ticket shop's packs are paid, as the server names it. */
export type JpycPayment = TicketShop["payment"];

const BALANCE_TIMEOUT_MS = 10_000;
const PAYMENT_TIMEOUT_MS = 60_000;

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
