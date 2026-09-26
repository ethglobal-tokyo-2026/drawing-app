import { waitForSmartWallet } from "../identity/smartWallet";
import { ApiError, type ApiClient } from "./apiClient";

/** The backend resolves the wallet from Privy; don't race its automatic creation at sign-in. */
export function withSmartWallet(api: ApiClient): ApiClient {
  return {
    ...api,
    seal: async (request) => {
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
