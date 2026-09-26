import { AccountRow } from "./AccountRow";
import { etherscanAddressUrl, suiscanAccountUrl } from "./explorers";
import { usePrivyStatus } from "./privy";
import { SPONSORSHIP_CHECK_TARGET_ID } from "./sponsorship-target";
import { useSuiWalletFailure } from "./suiWallet";

interface Explorer {
  href: (address: string) => string;
  name: string;
}

const ETHERSCAN: Explorer = {
  href: etherscanAddressUrl,
  name: "Etherscan, Ethereum Sepolia’s explorer",
};
const SUISCAN: Explorer = {
  href: suiscanAccountUrl,
  name: "Suiscan, Sui Testnet’s explorer",
};

/** The person's Privy account in full, each value with Copy: its ID and the addresses Privy holds. */
export function PrivyAccount() {
  const privy = usePrivyStatus();
  const suiFailure = useSuiWalletFailure();
  if (privy.state !== "signed-in") return null;
  return (
    <>
      <dl className="account-rows">
        <AccountRow label="Privy ID" value={privy.userId} copyable />
        {privy.smartAccount && (
          <Address label="Board address" address={privy.smartAccount} explorer={ETHERSCAN} />
        )}
        {privy.wallet && (
          <Address label="Sign-in address" address={privy.wallet} explorer={ETHERSCAN} />
        )}
        {privy.suiWallet ? (
          <Address label="Sui address" address={privy.suiWallet} explorer={SUISCAN} />
        ) : (
          suiFailure && (
            <AccountRow label="Sui address" value={`Privy couldn’t make it: ${suiFailure}`} />
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
  return (
    <AccountRow label={label} value={address} copyable>
      <a
        href={explorer.href(address)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} ${address} on ${explorer.name}`}
      >
        {address}
      </a>
    </AccountRow>
  );
}
