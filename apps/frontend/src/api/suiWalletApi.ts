import type { AccountSelection } from "@drawing-app/api/client";
import { captureAccountSelection } from "./sessionContext";
import { waitForSuiAddress } from "../identity/suiWallet";
import { ApiError, type ApiClient } from "./apiClient";

/**
 * Holds what the server does with the person's Sui wallet until Privy has made it: the server reads
 * the wallet from Privy, so asking sooner would find none.
 */
export function withSuiWallet(api: ApiClient, selection: AccountSelection): ApiClient {
  // Each call retains its own lifetime through both readiness and the server response.
  const run = async <T>(operation: () => Promise<T>, needsWallet = true): Promise<T> => {
    const check = captureAccountSelection(selection);
    check();
    if (needsWallet) await waitForSuiAddress();
    check();
    const result = await operation();
    check();
    return result;
  };
  return {
    ...api,
    reportDeposit: (giftId, signed) => run(() => api.reportDeposit(giftId, signed), false),
    takeOutGift: (giftId, signed, unsentMessageAttempt) =>
      run(() => api.takeOutGift(giftId, signed, unsentMessageAttempt), false),
    buyTickets: (payment) => run(() => api.buyTickets(payment), false),
    seal: (request) =>
      run(async () => {
        const sealed = await api.seal(request);
        if (sealed.sticker.objectId === null) {
          // The server's own code for this, so the person reads its catalog message.
          throw new ApiError(0, {
            error: "mint_failed",
            // The error line shows the detail too, so it keeps to the words the app uses.
            detail: `POST /api/stickers answered without a confirmed chain record for ${sealed.sticker.id}`,
          });
        }
        return sealed;
      }),
    packageGift: (stickerId, forUserId) => run(() => api.packageGift(stickerId, forUserId)),
    receiveGift: (request) => run(() => api.receiveGift(request)),
    receiveGiftForYou: (giftId) => run(() => api.receiveGiftForYou(giftId)),
    // A free pack is given without a payment, so it needs no wallet.
    startTicketPurchase: (pack) => run(() => api.startTicketPurchase(pack), pack.priceYen > 0),
  };
}
