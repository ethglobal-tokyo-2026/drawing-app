import type { ReactNode } from "react";
import { QuietLink } from "../ui/QuietLink";
import { useToast } from "../ui/useToast";
import "./account-rows.css";

interface Props {
  label: string;
  value: string;
  /** Shown in place of the value, e.g. a link; Copy still copies the value. */
  children?: ReactNode;
  copyable?: boolean;
}

/** One row of account details inside a <dl className="account-rows">: the value in full, selectable. */
export function AccountRow({ label, value, children, copyable = false }: Props) {
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
    <div className="account-rows__row">
      <dt className="fine">{label}</dt>
      <dd className="account-rows__value">{children ?? value}</dd>
      {copyable && (
        <dd className="account-rows__copy">
          <QuietLink onClick={copy} aria-label={`Copy the ${label.toLowerCase()}`}>
            Copy
          </QuietLink>
        </dd>
      )}
    </div>
  );
}
