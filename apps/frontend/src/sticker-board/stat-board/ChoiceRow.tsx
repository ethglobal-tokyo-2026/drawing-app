import { useId, useRef, type KeyboardEvent } from "react";

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
  /** While its setting saves: the choice shows, and takes no other pick until it lands. */
  busy?: boolean;
}

/** How far each arrow key moves the pick, in a row read left to right. */
const ARROWS: Record<string, 1 | -1 | undefined> = {
  ArrowRight: 1,
  ArrowDown: 1,
  ArrowLeft: -1,
  ArrowUp: -1,
};

/**
 * A setting as one row: its name, then its choices side by side at the end, the picked one inked in.
 * A radio group: Tab stops on the picked choice, and the arrow keys move the pick, round from either end.
 */
export function ChoiceRow<T extends string>({
  label,
  choices,
  value,
  nameOf,
  onChoose,
  langOf,
  describedBy,
  busy = false,
}: Props<T>) {
  const id = useId();
  const buttons = useRef<(HTMLButtonElement | null)[]>([]);
  const pick = (choice: T) => {
    if (!busy && choice !== value) onChoose(choice);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    const at = choices.indexOf(value);
    const step = ARROWS[event.key];
    const to =
      step !== undefined
        ? (at + step + choices.length) % choices.length
        : event.key === "Home"
          ? 0
          : event.key === "End"
            ? choices.length - 1
            : undefined;
    if (to === undefined) return;
    event.preventDefault();
    if (busy) return;
    buttons.current[to]?.focus();
    pick(choices[to]);
  };
  return (
    <div className="settings-note__option settings-choice">
      <span id={id}>{label}</span>
      <div
        className="settings-choice__choices"
        role="radiogroup"
        aria-labelledby={id}
        aria-describedby={describedBy}
        aria-disabled={busy || undefined}
        onKeyDown={onKeyDown}
      >
        {choices.map((choice, i) => (
          <button
            key={choice}
            ref={(button) => {
              buttons.current[i] = button;
            }}
            type="button"
            role="radio"
            className="settings-choice__choice"
            aria-checked={choice === value}
            tabIndex={choice === value ? 0 : -1}
            lang={langOf?.(choice)}
            onClick={() => pick(choice)}
          >
            {nameOf(choice)}
          </button>
        ))}
      </div>
    </div>
  );
}
