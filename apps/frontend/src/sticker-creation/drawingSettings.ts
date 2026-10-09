import { useSyncExternalStore } from "react";
import { deviceSetting } from "../ui/deviceSetting";
import { PEN_PRESSURES, type PenPressure } from "./canvas/brush";
import { INPUT_MODES, type InputMode } from "./canvas/inkEngine";

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

/** The input each sheet starts in; null until a pen has drawn on this device. */
const inputMode = deviceSetting<InputMode | null>("draw.inputMode", {
  parse: (text) => INPUT_MODES.find((mode) => mode === text) ?? null,
  serialize: (mode) => mode,
  name: "The input mode",
});

/** How a pen's pressure sets its width, Normal until chosen. */
const penPressure = deviceSetting<PenPressure>("draw.penPressure", {
  parse: (text) => PEN_PRESSURES.find((each) => each === text) ?? "normal",
  serialize: (value) => (value === "normal" ? null : value),
  name: "The pen pressure",
});

/** Settings' default input for each sheet; null before a pen has drawn on this device. */
export const useInputMode = (): InputMode | null =>
  useSyncExternalStore(inputMode.subscribe, inputMode.get);
export const readInputMode = inputMode.get;
export const keepInputMode = (mode: InputMode): boolean => inputMode.set(mode);
/** A pen drew on the sheet: the first time on this device, every sheet starts in Pencil only. */
export function penDrew(): void {
  if (inputMode.get() === null) inputMode.set("pencilOnly");
}

export const usePenPressure = (): PenPressure =>
  useSyncExternalStore(penPressure.subscribe, penPressure.get);
export const readPenPressure = penPressure.get;
export const keepPenPressure = (value: PenPressure): boolean => penPressure.set(value);
