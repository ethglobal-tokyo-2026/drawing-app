import type { ReactNode } from "react";
import "./name-whole.css";

/**
 * `text` with its first `name` set as one unit, so a title's balanced wrap never splits a handle
 * at its hyphen.
 */
export function keepNameWhole(text: string, name: string): ReactNode {
  const at = name ? text.indexOf(name) : -1;
  if (at < 0) return text;
  return (
    <>
      {text.slice(0, at)}
      <span className="name-whole">{name}</span>
      {text.slice(at + name.length)}
    </>
  );
}
