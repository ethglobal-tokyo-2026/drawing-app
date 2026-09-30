import { useState, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { ErrorLine } from "../ui/ErrorLine";
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
  const { t } = useTranslation();
  const toast = useToast();
  // A failed copy stays under the row until the next try, where a toast would be gone in seconds.
  const [problem, setProblem] = useState<string | null>(null);
  const copy = async () => {
    setProblem(null);
    try {
      await navigator.clipboard.writeText(value);
      toast(t(($) => $.identity.developer.copy.copied, { label }));
    } catch (error) {
      console.error(`Couldn't copy the ${label.toLowerCase()}`, error);
      setProblem(t(($) => $.identity.developer.copy.failed, { label: label.toLowerCase() }));
    }
  };
  return (
    <div className="account-rows__row">
      <dt className="fine">{label}</dt>
      <dd className="account-rows__value">{children ?? value}</dd>
      {copyable && (
        <dd className="account-rows__copy">
          <QuietLink
            onClick={copy}
            aria-label={t(($) => $.identity.developer.copy.ariaLabel, {
              label: label.toLowerCase(),
            })}
          >
            {t(($) => $.identity.developer.copy.button)}
          </QuietLink>
        </dd>
      )}
      {problem && (
        <dd className="account-rows__problem">
          <ErrorLine>{problem}</ErrorLine>
        </dd>
      )}
    </div>
  );
}
