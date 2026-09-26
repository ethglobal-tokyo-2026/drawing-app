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

const SUI_TIMEOUT_MS = 10_000;

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
      let result;
      try {
        result = await client.getTransaction({
          digest: txDigest,
          include: { events: true },
          signal: AbortSignal.timeout(SUI_TIMEOUT_MS),
        });
      } catch (error) {
        if (error instanceof TransactionError && error.reason === "notFound") return null;
        throw error;
      }
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
