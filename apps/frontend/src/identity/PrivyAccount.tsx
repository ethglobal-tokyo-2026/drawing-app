import { useTranslation } from "../i18n/react";
import { AccountRow } from "./AccountRow";
import { usePrivyStatus } from "./privy";
import { SPONSORSHIP_CHECK_TARGET_ID } from "./sponsorship-target";
import { useSuiWalletFailure } from "./suiWallet";

interface Explorer {
  url: string;
  /** Its name's key in the catalog. */
  name: "etherscan" | "suiscan";
}

// Ethereum Sepolia, where the sticker contracts live.
const ETHERSCAN: Explorer = { url: "https://sepolia.etherscan.io/address/", name: "etherscan" };
// A Sui address is the same on every Sui network; the app tests on Testnet.
const SUISCAN: Explorer = { url: "https://suiscan.xyz/testnet/account/", name: "suiscan" };

/** The person's Privy account in full, each value with Copy: its ID and the addresses Privy holds. */
export function PrivyAccount() {
  const { t } = useTranslation();
  const privy = usePrivyStatus();
  const suiFailure = useSuiWalletFailure();
  if (privy.state !== "signed-in") return null;
  const suiAddress = t(($) => $.identity.developer.suiAddress.label);
  return (
    <>
      <dl className="account-rows">
        <AccountRow label={t(($) => $.identity.developer.privyId)} value={privy.userId} copyable />
        {privy.smartAccount && (
          <Address
            label={t(($) => $.identity.developer.boardAddress)}
            address={privy.smartAccount}
            explorer={ETHERSCAN}
          />
        )}
        {privy.wallet && (
          <Address
            label={t(($) => $.identity.developer.signInAddress)}
            address={privy.wallet}
            explorer={ETHERSCAN}
          />
        )}
        {privy.suiWallet ? (
          <Address label={suiAddress} address={privy.suiWallet} explorer={SUISCAN} />
        ) : (
          suiFailure && (
            <AccountRow
              label={suiAddress}
              value={t(($) => $.identity.developer.suiAddress.failed, { reason: suiFailure })}
            />
          )
        )}
      </dl>
      <div id={SPONSORSHIP_CHECK_TARGET_ID} />
    </>
  );
}

function Address({
  label,
  address,
  explorer,
}: {
  label: string;
  address: string;
  explorer: Explorer;
}) {
  const { t } = useTranslation();
  return (
    <AccountRow label={label} value={address} copyable>
      <a
        href={explorer.url + address}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={t(($) => $.identity.developer.onExplorer, {
          label,
          address,
          explorer: t(($) => $.identity.developer.explorer[explorer.name]),
        })}
      >
        {address}
      </a>
    </AccountRow>
  );
}
