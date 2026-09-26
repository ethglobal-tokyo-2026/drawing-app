import { AccountRow } from "./AccountRow";
import { usePrivyStatus } from "./privy";
import { SPONSORSHIP_CHECK_TARGET_ID } from "./sponsorship-target";

// Ethereum Sepolia, where the sticker contracts live.
const EXPLORER = "https://sepolia.etherscan.io/address/";

/** The person's Privy account in full, each value with Copy: its ID and the addresses Privy holds. */
export function PrivyAccount() {
  const privy = usePrivyStatus();
  if (privy.state !== "signed-in") return null;
  return (
    <>
      <dl className="account-rows">
        <AccountRow label="Privy ID" value={privy.userId} copyable />
        {privy.smartAccount && <Address label="Board address" address={privy.smartAccount} />}
        {privy.wallet && <Address label="Sign-in address" address={privy.wallet} />}
      </dl>
      <div id={SPONSORSHIP_CHECK_TARGET_ID} />
    </>
  );
}

function Address({ label, address }: { label: string; address: string }) {
  return (
    <AccountRow label={label} value={address} copyable>
      <a
        href={EXPLORER + address}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} ${address} on Etherscan, Ethereum Sepolia’s explorer`}
      >
        {address}
      </a>
    </AccountRow>
  );
}
