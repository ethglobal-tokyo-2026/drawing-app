import { useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

/** The frame App renders the screens and the tab row in. */
const findPhone = () => document.querySelector<HTMLElement>(".phone");

/**
 * Renders `children` over the whole phone, tabs included: into `.phone` when it's there, in place when
 * it isn't. It's looked up once, so what's inside never moves between the page and the phone, which
 * would remount it; `eachRender` looks it up on every render instead.
 */
export function PhonePortal({
  children,
  eachRender = false,
}: {
  children: ReactNode;
  eachRender?: boolean;
}) {
  const [first] = useState(findPhone);
  const phone = eachRender ? findPhone() : first;
  return phone ? createPortal(children, phone) : children;
}
