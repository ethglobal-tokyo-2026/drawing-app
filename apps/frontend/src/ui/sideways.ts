import { useSyncExternalStore } from "react";
import { LARGE_MIN_PX } from "./largeScreen";

/** A touch screen's window wider than it's tall. */
export const LANDSCAPE_TOUCH = "(orientation: landscape) and (any-pointer: coarse)";

const query = () => window.matchMedia(LANDSCAPE_TOUCH);

const subscribe = (onChange: () => void) => {
  const q = query();
  q.addEventListener("change", onChange);
  return () => q.removeEventListener("change", onChange);
};

const isLandscapeTouch = () => query().matches;

/** A phone's own screen, whatever its window: its short side is under the large layout's room. */
const onPhoneScreen = () => Math.min(screen.width, screen.height) < LARGE_MIN_PX;

/**
 * Whether the phone is on its side now. The app is laid out upright only, and inside LINE no web app
 * can lock the orientation, so the upright cover asks for it back. It goes by the device's screen: an
 * iPad's window can be short and wide in Stage Manager, where turning the iPad wouldn't help, so it
 * keeps the phone layout there.
 */
export function useSideways(): boolean {
  return useSyncExternalStore(subscribe, isLandscapeTouch) && onPhoneScreen();
}
