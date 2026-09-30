import type { ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { CopyableFinePrint } from "./CopyableFinePrint";
import { QuietLink } from "./QuietLink";
import "./error-line.css";

/**
 * The English words behind a failure, for a report: labeled fine print in its own case, since
 * they're case-sensitive, with Copy beside them.
 */
export function ErrorDetail({ text }: { text: string }) {
  const { t } = useTranslation();
  return (
    <div className="error-detail">
      <p className="fine error-detail__label">{t(($) => $.ui.errorLine.details)}</p>
      <CopyableFinePrint text={text} lines={3}>
        {text}
      </CopyableFinePrint>
    </div>
  );
}

interface Props {
  /** What failed and what to do, in the app's language. */
  children: ReactNode;
  /** The English words behind it, for a report. */
  detail?: string;
  /** Asks again, where asking can work: a Try again link after the sentence. */
  onRetry?: () => void;
  /** Another way on after the sentence, such as Reload or Dismiss. */
  action?: { label: string; onClick: () => void };
  className?: string;
  /** The sentence's id, for a control's `aria-describedby`. */
  id?: string;
}

/**
 * The app's one error line, wherever something failed and the screen stays: the sentence in Ink on
 * Tomato Soft as an alert, Try again where it can work, and the raw words as fine print beside Copy.
 * Callers place it with `className`; it sets no margin.
 */
export function ErrorLine({ children, detail, onRetry, action, className, id }: Props) {
  const { t } = useTranslation();
  return (
    <div className={["error-line", className].filter(Boolean).join(" ")}>
      <p className="error-line__text" id={id} role="alert">
        {children}
        {onRetry && (
          <>
            {" "}
            <QuietLink onClick={onRetry}>{t(($) => $.ui.errorLine.tryAgain)}</QuietLink>
          </>
        )}
        {action && (
          <>
            {" "}
            <QuietLink onClick={action.onClick}>{action.label}</QuietLink>
          </>
        )}
      </p>
      {detail && <ErrorDetail text={detail} />}
    </div>
  );
}
