import { useSyncExternalStore } from "react";

/** The media query for the person asking for reduced motion; every reduced-motion CSS rule spells the same. */
export const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

const subscribe = (onChange: () => void) => {
  const query = matchMedia(REDUCED_MOTION);
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
};

/** Whether the person asked for reduced motion; follows the setting live. */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => matchMedia(REDUCED_MOTION).matches);
}
