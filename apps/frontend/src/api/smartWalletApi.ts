import { waitForSmartWallet } from "../identity/smartWallet";
import { liffMockActive } from "../line/liff";
import { ApiError, type ApiClient } from "./apiClient";

/** The backend resolves the wallet from Privy; don't race its automatic creation at sign-in. */
export function withSmartWallet(api: ApiClient): ApiClient {
  return {
    ...api,
    seal: async (request) => {
      // The dev server under LIFF Mock only: Privy stays off there, so no smart account ever gets ready,
      // and the API's mock chain mode seals without a token or transaction. Take its answer as it is.
      // A build never runs LIFF Mock, so it always waits and checks below.
      if (liffMockActive) return api.seal(request);
      await waitForSmartWallet();
      const sealed = await api.seal(request);
      if (sealed.sticker.tokenId === null || sealed.sticker.mintTxHash === null) {
        // The server's own code for this, so the person reads its catalog message.
        throw new ApiError(0, {
          error: "mint_failed",
          detail: `POST /api/stickers answered without a confirmed NFT for ${sealed.sticker.id}`,
        });
      }
      return sealed;
    },
    packageGift: async (stickerId) => {
      await waitForSmartWallet();
      return api.packageGift(stickerId);
    },
    receiveGift: async (request) => {
      await waitForSmartWallet();
      return api.receiveGift(request);
    },
  };
}
