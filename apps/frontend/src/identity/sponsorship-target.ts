import { useSyncExternalStore } from "react";

let target: HTMLElement | null = null;
const listeners = new Set<() => void>();

/** PrivyAccount's place for the developer slip's gas check, as a callback ref: set as it mounts. */
export function setSponsorshipTarget(el: HTMLElement | null) {
  target = el;
  listeners.forEach((l) => l());
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
};

/** Where the gas check goes, following its place as it mounts and remounts; null while there's none. */
export const useSponsorshipTarget = (): HTMLElement | null =>
  useSyncExternalStore(subscribe, () => target);
