import { useEffect, useId, useRef, useState } from "react";
import { useTranslation } from "../i18n/react";
import { CopyableFinePrint } from "../ui/CopyableFinePrint";
import { LabelButton } from "../ui/LabelButton";
import "./SuiAddressReveal.css";

/**
 * "Show my Sui address", in place: the address whole with Copy, and where JPYC goes. It sits under the
 * not-enough-balance line, so nobody has to leave the checkout to find the address on their stat board.
 */
export function SuiAddressReveal({ address }: { address: string }) {
  const { t } = useTranslation();
  const id = useId();
  const [open, setOpen] = useState(false);
  const revealed = useRef<HTMLDivElement>(null);

  // On a short phone the checkout's packs scroll, so what opens below the label is brought into view.
  useEffect(() => {
    if (open) revealed.current?.scrollIntoView({ block: "nearest" });
  }, [open]);

  return (
    <div className="sui-address-reveal">
      <LabelButton
        block
        size="sm"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        {t(($) => $.tickets.checkout.address.show)}
      </LabelButton>
      {open && (
        <div id={id} ref={revealed}>
          <p className="sui-address-reveal__how">{t(($) => $.tickets.checkout.address.how)}</p>
          <CopyableFinePrint text={address} lines={3}>
            {address}
          </CopyableFinePrint>
        </div>
      )}
    </div>
  );
}
