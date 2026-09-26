import type { ReactNode } from "react";
import { QuietLink } from "../ui/QuietLink";
import { useToast } from "../ui/useToast";
import { usePrivyStatus } from "./privy";
import "./privy-account.css";

// World Chain Sepolia, where the sticker contracts live.
const EXPLORER = "https://sepolia.worldscan.org/address/";

/** The person's Privy account in full, each value with Copy: its ID and the addresses Privy holds. */
export function PrivyAccount() {
  const privy = usePrivyStatus();
  if (privy.state !== "signed-in") return null;
  return (
    <dl className="privy-account">
      <Row label="Privy ID" value={privy.userId} />
      {privy.smartAccount && <Address label="Board address" address={privy.smartAccount} />}
      {privy.wallet && <Address label="Sign-in address" address={privy.wallet} />}
    </dl>
  );
}

function Address({ label, address }: { label: string; address: string }) {
  return (
    <Row label={label} value={address}>
      <a
        href={EXPLORER + address}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`${label} ${address} on Worldscan, World Chain Sepolia’s explorer`}
      >
        {address}
      </a>
    </Row>
  );
}

/** A labelled value, shown in full and selectable, with Copy. */
function Row({ label, value, children }: { label: string; value: string; children?: ReactNode }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast(`${label} copied`);
    } catch (error) {
      // The value stays selectable, so it can still be copied by hand.
      console.error(`Couldn't copy the ${label.toLowerCase()}`, error);
      toast(`Couldn’t copy the ${label.toLowerCase()}`);
    }
  };
  return (
    <div className="privy-account__row">
      <dt className="fine">{label}</dt>
      <dd className="privy-account__value">{children ?? value}</dd>
      <dd className="privy-account__copy">
        <QuietLink onClick={copy} aria-label={`Copy the ${label.toLowerCase()}`}>
          Copy
        </QuietLink>
      </dd>
    </div>
  );
}
