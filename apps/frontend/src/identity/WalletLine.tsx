import { QuietLink } from "../ui/QuietLink";
import { useToast } from "../ui/useToast";
import { usePrivyStatus } from "./privy";
import "./wallet-line.css";

// World Chain Sepolia, where the sticker contracts live.
const EXPLORER = "https://sepolia.worldscan.org/address/";

const short = (address: string) => `${address.slice(0, 6)}…${address.slice(-4)}`;

/** The addresses Privy holds for the person, each opening in World Chain Sepolia's explorer. */
export function WalletLine() {
  const privy = usePrivyStatus();
  if (privy.state !== "signed-in" || (!privy.wallet && !privy.smartAccount)) return null;
  return (
    <div className="wallet-line">
      {privy.smartAccount && <Address label="Board address" address={privy.smartAccount} />}
      {privy.wallet && <Address label="Sign-in address" address={privy.wallet} />}
    </div>
  );
}

function Address({ label, address }: { label: string; address: string }) {
  const toast = useToast();
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(address);
      toast("Address copied");
    } catch (error) {
      console.error("Couldn't copy the address", error);
      toast("Couldn’t copy the address");
    }
  };
  return (
    <div className="wallet-line__row">
      <p className="fine">
        {label}{" "}
        <a
          href={EXPLORER + address}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${label} ${address} on Worldscan, World Chain Sepolia’s explorer`}
        >
          {short(address)}
        </a>
      </p>
      <QuietLink onClick={copy} aria-label={`Copy the ${label.toLowerCase()}`}>
        Copy
      </QuietLink>
    </div>
  );
}
