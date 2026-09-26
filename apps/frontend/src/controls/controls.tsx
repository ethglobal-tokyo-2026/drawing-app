import type { ButtonHTMLAttributes, ReactNode } from "react";
import { usePress } from "./usePress";
import "./controls.css";

type PressableProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "type"> & {
  onPress: () => void;
  icon?: ReactNode;
};

interface KeyProps extends PressableProps {
  /** Tomato is never a key: a can't-undo act gets a label. */
  hue?: "seal" | "aqua" | "pink" | "grape";
  size?: "sm" | "md" | "lg" | "round";
}

/** The cartoon keycap: the one primary act on a screen. */
export function Key({
  hue = "seal",
  size = "md",
  icon,
  children,
  onPress,
  className = "",
  ...rest
}: KeyProps) {
  const { handlers } = usePress(onPress, rest.disabled);
  return (
    <button
      type="button"
      className={`key key-${hue} key-${size} ${className}`}
      {...rest}
      {...handlers}
    >
      <span className="key-base" aria-hidden />
      <span className="key-face">
        {icon}
        {children && <span className="key-text">{children}</span>}
      </span>
    </button>
  );
}

interface LabelProps extends PressableProps {
  hue?: "plain" | "seal" | "aqua" | "pink" | "grape" | "tomato" | "ink";
  small?: boolean;
}

/** Label stock: every pressable that isn't the key, at a third of its depth. */
export function Label({
  hue = "plain",
  small = false,
  icon,
  children,
  onPress,
  className = "",
  ...rest
}: LabelProps) {
  const { handlers } = usePress(onPress, rest.disabled);
  return (
    <button
      type="button"
      className={`label label-${hue} ${small ? "label-small" : ""} ${className}`}
      {...rest}
      {...handlers}
    >
      <span className="label-base" aria-hidden />
      <span className="label-face">
        {icon}
        {children}
      </span>
    </button>
  );
}

/** Underlined graphite text with no stock and no travel: the way out under a key. */
export function QuietLink({ children, onPress, className = "", ...rest }: PressableProps) {
  const { handlers } = usePress(onPress, rest.disabled);
  return (
    <button type="button" className={`quiet-link ${className}`} {...rest} {...handlers}>
      {children}
    </button>
  );
}
