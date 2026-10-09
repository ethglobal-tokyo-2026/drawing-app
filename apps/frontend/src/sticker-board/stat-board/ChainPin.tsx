// Sui's droplet in Sui Blue, byte for byte from its brand kit (live.standards.site/sui-media-kit). Sui's
// rules forbid altering it, so the pin's head is the file itself: never recolored, outlined or glinted.
import suiDroplet from "./Logo_Sui_Droplet_Sui_Blue.svg";
import "./address-papers.css";

/** A push pin whose head is Sui's droplet, holding the Sui address paper to the cork. */
export function ChainPin({ className }: { className?: string }) {
  return (
    <img
      className={["chain-pin", className].filter(Boolean).join(" ")}
      src={suiDroplet}
      alt=""
      draggable={false}
    />
  );
}
