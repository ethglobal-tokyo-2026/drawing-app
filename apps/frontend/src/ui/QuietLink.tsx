import type { ButtonHTMLAttributes } from "react";

/** The quiet way out under a key: underlined text with no stock and no press travel. */
export function QuietLink({
  className,
  type = "button",
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={type}
      className={["label-btn", "label-btn--quiet", className].filter(Boolean).join(" ")}
      {...rest}
    />
  );
}
