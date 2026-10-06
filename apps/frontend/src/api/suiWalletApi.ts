import { waitForSuiAddress } from "../identity/suiWallet";
import { ApiError, type ApiClient } from "./apiClient";

/**
 * Holds what the server does with the person's Sui wallet until Privy has made it: the server reads
 * the wallet from Privy, so asking sooner would find none.
 */
export function withSuiWallet(api: ApiClient): ApiClient {
  return {
    ...api,
    seal: async (request) => {
      await waitForSuiAddress();
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
    },
    packageGift: async (stickerId, forUserId) => {
      await waitForSuiAddress();
      return api.packageGift(stickerId, forUserId);
    },
    receiveGift: async (request) => {
      await waitForSuiAddress();
      return api.receiveGift(request);
    },
    receiveGiftForYou: async (giftId) => {
      await waitForSuiAddress();
      return api.receiveGiftForYou(giftId);
    },
    startTicketPurchase: async (tickets) => {
      await waitForSuiAddress();
      return api.startTicketPurchase(tickets);
    },
  };
}
