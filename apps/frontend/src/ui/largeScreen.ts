import { useSyncExternalStore } from "react";

/**
 * A touch screen with a tablet's room both ways: an iPad in either orientation, a trackpad attached or
 * not. Anything smaller, Split View and LINE's sheet included, keeps the phone's layout, and so does a
 * desktop, shown in its phone frame (App.css). Every large-screen CSS rule spells the same query.
 */
export const LARGE_SCREEN = "(min-width: 600px) and (min-height: 600px) and (any-pointer: coarse)";

const query = () => window.matchMedia(LARGE_SCREEN);

const subscribe = (onChange: () => void) => {
  const q = query();
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

const isLargeScreen = () => query().matches;

/** Whether the screen is large now, following rotation and window resizes. */
export const useLargeScreen = () => useSyncExternalStore(subscribe, isLargeScreen);
