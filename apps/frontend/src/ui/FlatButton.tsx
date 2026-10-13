import type { ButtonHTMLAttributes, ReactNode, Ref } from "react";
import "./flat-button.css";

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}

/** Flat navigation stock for header and back actions, with no lip or press travel. */
export function FlatButton({ icon, className, type = "button", children, ...rest }: Props) {
  return (
    <button type={type} className={["flat-btn", className].filter(Boolean).join(" ")} {...rest}>
      {icon}
      {children}
    </button>
  );
}
