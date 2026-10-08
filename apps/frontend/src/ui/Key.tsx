import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";

type KeyTone = "seal" | "aqua" | "pink" | "grape" | "blue";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  ref?: Ref<HTMLButtonElement>;
  tone?: KeyTone;
  size?: "md" | "lg" | "compact" | "round";
  icon?: ReactNode;
}

/** The key: the screen's one primary act. A can't-undo (tomato) act never gets one. */
export function Key({
  tone = "seal",
  size = "md",
  icon,
  className,
  type = "button",
  children,
  ...rest
}: Props) {
  const classes = ["key", `key--${tone}`, size !== "md" && `key--${size}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
