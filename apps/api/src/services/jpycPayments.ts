import { bcs } from "@mysten/sui/bcs";
import { TransactionError } from "@mysten/sui/client";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { JpycPayment, TicketPaymentTarget, TicketPayments } from "../deps.ts";

/** The payment contract's PaymentReceived, field for field. */
const paymentReceived = bcs.struct("PaymentReceived", {
  vault_id: bcs.Address,
  payer: bcs.Address,
  amount: bcs.u64(),
  reference: bcs.vector(bcs.u8()),
});

/** How long reading a payment from Sui may take in all, well inside the app's own request timeout. */
export const SUI_READ_TIMEOUT_MS = 10_000;
/** How soon a transaction Sui doesn't show yet is asked for again. */
export const NOT_LANDED_RETRY_MS = 1_000;

/**
 * Reads a transaction with `read`, which answers null while Sui doesn't show it, asking again until
 * SUI_READ_TIMEOUT_MS runs out; null if Sui never showed it by then. The public fullnode is
 * load-balanced, so the node that answers can be behind one that just ran the payment. A failure to
 * reach Sui rejects at once rather than passing for a transaction Sui doesn't have.
 */
export async function readLanded<T>(
  read: (signal: AbortSignal) => Promise<T | null>,
): Promise<T | null> {
  const signal = AbortSignal.timeout(SUI_READ_TIMEOUT_MS);
  const deadline = Date.now() + SUI_READ_TIMEOUT_MS;
  for (;;) {
    const found = await read(signal);
    if (found !== null) return found;
    if (deadline - Date.now() <= NOT_LANDED_RETRY_MS) return null;
    await new Promise((resolve) => setTimeout(resolve, NOT_LANDED_RETRY_MS));
  }
}

/** Reads ticket payments from Sui's public fullnode for `target.network`, over gRPC. */
export function createJpycPayments(target: TicketPaymentTarget): TicketPayments {
  const client = new SuiGrpcClient({
    network: target.network,
    baseUrl: `https://fullnode.${target.network}.sui.io:443`,
  });
  const eventType = `${target.paymentPackage}::payment::PaymentReceived`;
  return {
    target,
    paymentsIn: async (txDigest) => {
      const result = await readLanded((signal) =>
        client
          .getTransaction({ digest: txDigest, include: { events: true }, signal })
          .catch((error: unknown) => {
            if (error instanceof TransactionError && error.reason === "notFound") return null;
            throw error;
          }),
      );
      if (result === null) return null;
      // A failed transaction moved no JPYC, so it paid for nothing.
      if (result.$kind === "FailedTransaction") return [];
      return result.Transaction.events
        .filter((event) => event.eventType === eventType)
        .map((event): JpycPayment => {
          const fields = paymentReceived.parse(event.bcs);
          return {
            vault: normalizeSuiAddress(fields.vault_id),
            payer: normalizeSuiAddress(fields.payer),
            amount: BigInt(fields.amount),
            reference: new TextDecoder().decode(Uint8Array.from(fields.reference)),
          };
        });
    },
  };
}
