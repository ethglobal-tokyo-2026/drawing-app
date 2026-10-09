import { useSyncExternalStore } from "react";
import { useLargeScreen } from "./largeScreen";

/** A touch screen wider than it's tall. Without the large layout's room, it's a phone on its side. */
export const LANDSCAPE_TOUCH = "(orientation: landscape) and (any-pointer: coarse)";

const query = () => window.matchMedia(LANDSCAPE_TOUCH);

const subscribe = (onChange: () => void) => {
  const q = query();
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

const isLandscapeTouch = () => query().matches;

/**
 * Whether the phone is on its side now. The app is laid out upright only, and inside LINE no web app
 * can lock the orientation, so the upright cover asks for it back. An iPad has the large layout's room
 * either way, and a desktop and LINE's sheet on an iPad are never on their side.
 */
export function useSideways(): boolean {
  const landscape = useSyncExternalStore(subscribe, isLandscapeTouch);
  const large = useLargeScreen();
  return landscape && !large;
}
