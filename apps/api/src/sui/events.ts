import { bcs } from "@mysten/sui/bcs";
import { normalizeSuiAddress } from "@mysten/sui/utils";
import type { TicketPaymentTarget } from "../deps.ts";
import type { SuiEvents } from "./transactions.ts";

/** The stickers package's StickerSealed, field for field. */
export const stickerSealedEvent = bcs.struct("StickerSealed", {
  sticker: bcs.Address,
  key: bcs.string(),
  number: bcs.u64(),
  artist: bcs.Address,
  nsfw: bcs.bool(),
});

/** The payment contract's PaymentReceived, field for field. */
export const paymentReceivedEvent = bcs.struct("PaymentReceived", {
  vault_id: bcs.Address,
  payer: bcs.Address,
  amount: bcs.u64(),
  reference: bcs.vector(bcs.u8()),
});

/** The sticker a mint's StickerSealed names, or null when the mint emitted none. */
export function stickerSealedIn(events: SuiEvents): { sticker: string; key: string } | null {
  const event = events.find(({ type }) => type.endsWith("::sticker::StickerSealed"));
  if (!event) return null;
  const sealed = stickerSealedEvent.parse(event.bcs);
  return { sticker: normalizeSuiAddress(sealed.sticker), key: sealed.key };
}

/** A payment's PaymentReceived from `payment`'s contract, or null when it emitted none. */
export function paymentReceivedIn(
  events: SuiEvents,
  payment: TicketPaymentTarget,
): { vault: string; payer: string; amount: bigint; reference: string } | null {
  const type = `${normalizeSuiAddress(payment.paymentPackage)}::payment::PaymentReceived`;
  const event = events.find((candidate) => candidate.type === type);
  if (!event) return null;
  const paid = paymentReceivedEvent.parse(event.bcs);
  return {
    vault: normalizeSuiAddress(paid.vault_id),
    payer: normalizeSuiAddress(paid.payer),
    amount: BigInt(paid.amount),
    reference: new TextDecoder().decode(Uint8Array.from(paid.reference)),
  };
}
