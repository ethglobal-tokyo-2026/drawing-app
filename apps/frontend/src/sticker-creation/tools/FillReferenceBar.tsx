import { useId } from "react";
import { useTranslation } from "../../i18n/react";
import type { FillReference } from "../canvas/ops";
import "./FillReferenceBar.css";

interface Props {
  value: FillReference;
  onChange: (value: FillReference) => void;
}

/** The source Fill samples, kept in sight while the sheet remains ready to draw. */
export function FillReferenceBar({ value, onChange }: Props) {
  const { t } = useTranslation();
  const name = useId();
  const helpId = useId();
  const words = [
    { value: "layer", label: t(($) => $.stickerCreation.fillReference.layer) },
    { value: "visible", label: t(($) => $.stickerCreation.fillReference.visible) },
  ] as const;

  return (
    <div
      className="fill-reference-bar under-tool-strip"
      role="radiogroup"
      aria-label={t(($) => $.stickerCreation.fillReference.label)}
    >
      <span className="fill-reference-title" aria-hidden="true">
        {t(($) => $.stickerCreation.fillReference.label)}
      </span>
      <div className="fill-reference-choices">
        {words.map((choice) => (
          <label key={choice.value} className="fill-reference-choice">
            <input
              type="radio"
              name={name}
              value={choice.value}
              checked={value === choice.value}
              aria-describedby={
                choice.value === "visible" && value === "visible" ? helpId : undefined
              }
              onChange={() => onChange(choice.value)}
            />
            <span>{choice.label}</span>
          </label>
        ))}
      </div>
      {value === "visible" && (
        <p id={helpId} className="fill-reference-help">
          {t(($) => $.stickerCreation.fillReference.visibleHelp)}
        </p>
      )}
    </div>
  );
}
