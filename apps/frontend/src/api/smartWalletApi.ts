import { waitForSmartWallet } from "../identity/smartWallet";
import type { ApiClient } from "./apiClient";

/** The backend resolves the wallet from Privy; don't race its automatic creation at sign-in. */
export function withSmartWallet(api: ApiClient): ApiClient {
  return {
    ...api,
    seal: async (request) => {
      await waitForSmartWallet();
      const sealed = await api.seal(request);
      if (sealed.sticker.tokenId === null) {
        throw new Error(
          "Your sticker could not be added to your wallet yet. Please try Sealing again.",
        );
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
