import type { ButtonHTMLAttributes, ReactNode } from "react";

type LabelTone = "plain" | "seal" | "aqua" | "pink" | "grape" | "tomato" | "ink";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: LabelTone;
  size?: "md" | "sm";
  block?: boolean;
  icon?: ReactNode;
}

/** Label stock: every button that isn't the screen's key. */
export function LabelButton({
  tone = "plain",
  size = "md",
  block = false,
  icon,
  className,
  type = "button",
  children,
  ...rest
}: Props) {
  const classes = [
    "label-btn",
    tone !== "plain" && `label-btn--${tone}`,
    size === "sm" && "label-btn--sm",
    block && "label-btn--block",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <button type={type} className={classes} {...rest}>
      {icon}
      {children}
    </button>
  );
}
