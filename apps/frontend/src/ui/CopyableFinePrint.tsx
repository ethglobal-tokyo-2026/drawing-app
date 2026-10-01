import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { Copy } from "../icons";
import { LabelButton } from "./LabelButton";
import "./copyable-fine-print.css";

interface Props {
  /** What Copy copies, whole, though the fine print is cut short on screen until a copy fails. */
  text: string;
  /** How many lines show: one for an ID, which reads as a string, or three for words. */
  lines: 1 | 3;
  children: ReactNode;
}

/** Fine print in its own case with a small Copy label beside it: a payment's ID, or the raw words of a failure. */
export function CopyableFinePrint({ text, lines, children }: Props) {
  const { t } = useTranslation();
  const id = useId();
  const [copied, setCopied] = useState(false);
  // A failed copy stays under the fine print until the next try, and shows all of it to copy by hand.
  const [failed, setFailed] = useState(false);

  const copy = async () => {
    setFailed(false);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (e) {
      console.error(`Couldn't copy ${text}`, e);
      setCopied(false);
      setFailed(true);
    }
  };

  return (
    <div className="copyable-fine-print">
      <span
        className={`fine copyable-fine-print__text${failed ? "" : ` copyable-fine-print__text--${lines}`}`}
        id={id}
      >
        {children}
      </span>
      <LabelButton size="sm" icon={<Copy />} aria-describedby={id} onClick={() => void copy()}>
        {copied ? t(($) => $.ui.copy.copied) : t(($) => $.ui.copy.copy)}
      </LabelButton>
      {failed && (
        <p className="fine copyable-fine-print__problem" role="alert">
          {t(($) => $.ui.copy.notCopied)}
        </p>
      )}
    </div>
  );
}
