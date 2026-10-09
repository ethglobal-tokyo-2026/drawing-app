import type { InputHTMLAttributes } from "react";
import "./switch.css";

type Props = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "role" | "className" | "checked" | "onChange" | "children"
> & {
  checked: boolean;
  /** Called with the state the switch was flipped to. */
  onChange: (on: boolean) => void;
};

/**
 * The app's one switch: Ink when on. Put it at the end of a `<label>` row, whose words name it, so the
 * whole row flips it. Its input lies unseen over the drawn track, 44px tall to touch.
 */
export function Switch({ checked, onChange, ...input }: Props) {
  return (
    <span className="switch">
      <input
        {...input}
        type="checkbox"
        role="switch"
        className="switch__input"
        checked={checked}
        onChange={(e) => onChange(e.currentTarget.checked)}
      />
      <span className="switch__track" aria-hidden="true" />
    </span>
  );
}
