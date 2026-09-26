import { AccountRow } from "./AccountRow";
import { usePrivyStatus } from "./privy";

// World Chain Sepolia, where the sticker contracts live.
const EXPLORER = "https://sepolia.worldscan.org/address/";

/** The person's Privy account in full, each value with Copy: its ID and the addresses Privy holds. */
export function PrivyAccount() {
  const privy = usePrivyStatus();
  if (privy.state !== "signed-in") return null;
  return (
    <dl className="account-rows">
      <AccountRow label="Privy ID" value={privy.userId} copyable />
      {privy.smartAccount && <Address label="Board address" address={privy.smartAccount} />}
      {privy.wallet && <Address label="Sign-in address" address={privy.wallet} />}
    </dl>
  );
}

function Address({ label, address }: { label: string; address: string }) {
  return (
    <AccountRow label={label} value={address} copyable>
      <a
        href={EXPLORER + address}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} ${address} on Worldscan, World Chain Sepolia’s explorer`}
      >
        {address}
      </a>
    </AccountRow>
  );
}
