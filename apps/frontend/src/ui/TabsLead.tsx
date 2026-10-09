import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLargeScreen } from "./largeScreen";

/** The tab row's left end as TabBar renders it, and the boards waiting to put their key there. */
let slot: HTMLElement | null = null;
const listeners = new Set<() => void>();

const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => {
    listeners.delete(onChange);
  };
};

const placeSlot = (el: HTMLElement | null) => {
  if (el === slot) return;
  slot = el;
  for (const listener of listeners) listener();
};

/** The tab row's left end, where a board's key stands on a large screen. */
export function TabsLeadSlot() {
  return <div className="tabs-lead" ref={placeSlot} />;
}

/**
 * A board's key: on a phone it stays on the board, and on a large screen it leads the tab row. Until
 * TabBar's slot is there it renders nothing, so the key mounts once, in the slot, and never spends a
 * first-render effect on the board.
 */
export function TabsLead({ children }: { children: ReactNode }) {
  const large = useLargeScreen();
  const lead = useSyncExternalStore(subscribe, () => slot);
  if (!large) return children;
  return lead ? createPortal(children, lead) : null;
}
