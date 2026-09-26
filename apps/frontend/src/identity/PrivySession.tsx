import {
  PrivyProvider,
  usePrivy,
  useSubscribeToJwtAuthWithFlag,
  useWallets,
  type User,
  type WalletWithMetadata,
} from "@privy-io/react-auth";
import { SmartWalletsProvider } from "@privy-io/react-auth/smart-wallets";
import { useEffect } from "react";
import { sepolia } from "viem/chains";
import {
  fetchPrivyJwt,
  onPrivyError,
  PRIVY_APP_ID,
  privyStatus,
  setPrivyStatus,
  usePrivyStatus,
} from "./privy";
import { MakeSuiWallet } from "./MakeSuiWallet";
import { SponsorshipCheck } from "./SponsorshipCheck";
import { SmartWalletBridge } from "./SmartWalletBridge";
import { SuiWalletBridge } from "./SuiWalletBridge";

// The address of the wallet Privy itself made on a chain, as opposed to one the person connected.
const privysWallet = (user: User, chainType: "ethereum" | "sui") =>
  user.linkedAccounts.find(
    (a): a is WalletWithMetadata =>
      a.type === "wallet" &&
      (a.walletClientType === "privy" || a.walletClientType === "privy-v2") &&
      a.chainType === chainType,
  )?.address;

const smartAccountOf = (user: User) =>
  user.linkedAccounts.find((account) => account.type === "smart_wallet")?.address ??
  user.smartWallet?.address;

const signedIn = (user: User) => {
  setPrivyStatus({
    state: "signed-in",
    userId: user.id,
    wallet: privysWallet(user, "ethereum"),
    smartAccount: smartAccountOf(user),
    suiWallet: privysWallet(user, "sui"),
  });
};

const onAuthenticated = ({ user }: { user: User }) => signedIn(user);

// A failed exchange has already put its reason in the status, which beats a generic one.
const onUnauthenticated = () => {
  if (privyStatus().state !== "failed") {
    setPrivyStatus({ state: "failed", reason: "Privy signed you out" });
  }
};

function SyncLineToPrivy() {
  const failed = usePrivyStatus().state === "failed";
  const walletsReady = useWallets().ready;
  useSubscribeToJwtAuthWithFlag({
    // After a failure the SDK re-syncs over and over on its own, so syncing waits for Try again.
    enabled: !failed,
    // Rendered only inside LineGate, so LINE has always logged the person in by now.
    isAuthenticated: true,
    // Privy makes the wallet right after sign-in, and signs out again if its wallet frame isn't up yet.
    isLoading: !walletsReady,
    getExternalJwt: fetchPrivyJwt,
    onAuthenticated,
    onUnauthenticated,
    onError: onPrivyError,
  });

  // The wallet is made just after sign-in, so its address arrives in a later update of the user.
  const { authenticated, user } = usePrivy();
  useEffect(() => {
    if (authenticated && user) signedIn(user);
  }, [authenticated, user]);
  return null;
}

/** Signs the LINE user in to Privy, with no screen of its own. */
export default function PrivySession() {
  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{ defaultChain: sepolia, supportedChains: [sepolia] }}
    >
      <SmartWalletsProvider>
        <SyncLineToPrivy />
        <MakeSuiWallet />
        <SmartWalletBridge />
        <SuiWalletBridge />
        <SponsorshipCheck />
      </SmartWalletsProvider>
    </PrivyProvider>
  );
}
