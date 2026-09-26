import { Trans } from "../i18n/react";
// Sui's own full logo in black, byte for byte from its brand kit (live.standards.site/sui-media-kit).
// Sui's rules forbid altering it, so it's drawn as the file, never recolored or redrawn.
import suiLogo from "./Logo_Sui_Full_Black.svg";
import "./sui-credit.css";

/**
 * "Payments on Sui": fine print and Sui's logo, where reserve tickets are sold. A credit, not a
 * control, so it's never a link or inside a button.
 */
export function SuiCredit({ className }: { className?: string }) {
  return (
    <p className={["sui-credit", "fine", className].filter(Boolean).join(" ")}>
      <Trans
        i18nKey={($) => $.shop.paymentsOn}
        components={{
          logo: <img className="sui-credit__logo" src={suiLogo} alt="Sui" draggable={false} />,
        }}
      />
    </p>
  );
}
