import { useId, useState, type ReactNode } from "react";
import { useTranslation } from "../i18n/react";
import { Copy } from "../icons";
import { LabelButton } from "./LabelButton";
import "./copyable-fine-print.css";

interface Props {
  /** What Copy copies, whole, though the fine print is cut short on screen. */
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

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch (e) {
      // The text stays selectable, so it can still be copied by hand.
      console.error(`Couldn't copy ${text}`, e);
    }
  };

  return (
    <div className="copyable-fine-print">
      <span
        className={`fine copyable-fine-print__text copyable-fine-print__text--${lines}`}
        id={id}
      >
        {children}
      </span>
      <LabelButton size="sm" icon={<Copy />} aria-describedby={id} onClick={() => void copy()}>
        {copied ? t(($) => $.ui.copy.copied) : t(($) => $.ui.copy.copy)}
      </LabelButton>
    </div>
  );
}
