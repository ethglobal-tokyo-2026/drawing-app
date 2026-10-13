import { useSyncExternalStore } from "react";
import { deviceSetting } from "./deviceSetting";

/** Pointer and tap indicators across Croquis, off until this device chooses to show them. */
const pointerIndicators = deviceSetting<boolean>("ui.pointerIndicators", {
  parse: (text) => text === "on",
  serialize: (enabled) => (enabled ? "on" : null),
  name: "Pointer and tap indicators",
});

export const usePointerIndicators = (): boolean =>
  useSyncExternalStore(pointerIndicators.subscribe, pointerIndicators.get);

/** Applies the choice at once and says whether this device kept it for the next visit. */
export const keepPointerIndicators = (enabled: boolean): boolean => pointerIndicators.set(enabled);
