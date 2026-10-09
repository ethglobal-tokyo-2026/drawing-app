import { useId } from "react";
import { CaretDown } from "../../icons";

interface Props<T extends string> {
  label: string;
  choices: readonly T[];
  value: T;
  nameOf: (choice: T) => string;
  onChoose: (choice: T) => void;
  /** The language a choice's name is in, where it isn't the app's. */
  langOf?: (choice: T) => string | undefined;
  /** The id of a note that says more about the setting. */
  describedBy?: string;
}

/**
 * A setting as one row with its choice at the end. The select lies unseen over the whole row, so a
 * tap anywhere on it opens the device's own list of choices.
 */
export function ChoiceRow<T extends string>({
  label,
  choices,
  value,
  nameOf,
  onChoose,
  langOf,
  describedBy,
}: Props<T>) {
  const id = useId();
  return (
    <div className="settings-note__option settings-note__choice">
      <span id={id}>{label}</span>
      <span className="settings-note__picked" aria-hidden>
        <span lang={langOf?.(value)}>{nameOf(value)}</span>
        <CaretDown size={16} weight="bold" />
      </span>
      <select
        className="settings-note__select"
        aria-labelledby={id}
        aria-describedby={describedBy}
        value={value}
        onChange={(event) => {
          const picked = choices.find((choice) => choice === event.target.value);
          if (picked) onChoose(picked);
        }}
      >
        {choices.map((choice) => (
          <option key={choice} value={choice} lang={langOf?.(choice)}>
            {nameOf(choice)}
          </option>
        ))}
      </select>
    </div>
  );
}
