import { useSyncExternalStore } from "react";
import { deviceSetting } from "../ui/deviceSetting";

/*
 * Settings' Drawing group, kept on this device rather than the account, since each suits a device and
 * the hand that draws on it. Each `keep…` applies at once and says whether the device kept it.
 */

export const DRAWING_HANDS = ["right", "left"] as const;
export type DrawingHand = (typeof DRAWING_HANDS)[number];

/** The hand that draws, which Left mirrors the drawing screen for. Anything but Left is Right. */
const hand = deviceSetting<DrawingHand>("draw.hand", {
  parse: (text) => (text === "left" ? "left" : "right"),
  serialize: (value) => (value === "left" ? "left" : null),
  name: "The drawing hand",
});

export const useDrawingHand = (): DrawingHand => useSyncExternalStore(hand.subscribe, hand.get);
export const keepDrawingHand = (value: DrawingHand): boolean => hand.set(value);
