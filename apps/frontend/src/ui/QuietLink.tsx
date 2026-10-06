import type { ButtonHTMLAttributes, Ref } from "react";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
}

/** The quiet way out under a key: underlined text with no stock and no press travel. */
export function QuietLink({ className, type = "button", ...rest }: Props) {
  return (
    <button
      type={type}
      className={["label-btn", "label-btn--quiet", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
