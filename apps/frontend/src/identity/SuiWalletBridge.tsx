import { usePrivy } from "@privy-io/react-auth";
import { useSignRawHash } from "@privy-io/react-auth/extended-chains";
import { useEffect, useLayoutEffect, useRef } from "react";
import { ApiError } from "../api/apiClient";
import { captureAccountSelection, isAccountSelectionCurrent } from "../api/sessionContext";
import { matchesPrivyAccount, usePrivyAccount } from "./privyAccount";
import { messageOf } from "../i18n/errorMessage";
import { privySuiWallet, privyStatus, usePrivyStatus } from "./privy";
import { PrivySuiSigner, setSuiSigner, suiPublicKeyFor } from "./suiSigner";
import { setSuiWalletFailure } from "./suiWallet";

/** Shares a signer for the person's Privy Sui wallet with what signs, outside Privy's provider. */
export function SuiWalletBridge() {
  const { ready, authenticated, user } = usePrivy();
  const account = usePrivyAccount();
  const status = usePrivyStatus();
  const latest = useRef({ ready, authenticated, user, account });
  useLayoutEffect(() => {
    latest.current = { ready, authenticated, user, account };
  }, [ready, authenticated, user, account]);
  const { signRawHash } = useSignRawHash();
  const wallet = privySuiWallet(user);
  const address = wallet?.address;
  const publicKey = wallet?.publicKey;

  useEffect(() => {
    setSuiSigner(null);
    if (
      status.state !== "signed-in" ||
      !address ||
      !ready ||
      !authenticated ||
      !isAccountSelectionCurrent(account) ||
      !matchesPrivyAccount(user, account)
    )
      return;
    let active = true;
    const checkLifetime = captureAccountSelection(account);
    const assertCurrent = () => {
      checkLifetime();
      const now = latest.current;
      if (
        privyStatus().state !== "signed-in" ||
        !active ||
        !now.ready ||
        !now.authenticated ||
        now.account !== account ||
        !matchesPrivyAccount(now.user, account)
      )
        throw new ApiError(409, { error: "session_account_changed" });
    };
    if (!publicKey) {
      const reason = `Privy reported no public key for the Sui wallet ${address}`;
      console.error(reason);
      setSuiWalletFailure(reason);
      return;
    }
    try {
      const key = suiPublicKeyFor(address, publicKey);
      setSuiSigner(
        new PrivySuiSigner(
          address,
          key,
          async (hash) => {
            const { signature } = await signRawHash({ address, chainType: "sui", hash });
            return signature;
          },
          assertCurrent,
        ),
      );
    } catch (error) {
      console.error("The Sui wallet's signer failed to start", error);
      setSuiWalletFailure(messageOf(error));
    }
    return () => {
      active = false;
      setSuiSigner(null);
    };
  }, [address, publicKey, signRawHash, account, ready, authenticated, user, status.state]);
  return null;
}
