import { useSyncExternalStore } from "react";
import { deviceSetting } from "../ui/deviceSetting";
import { FIRST_PEN_MINIMUM_WIDTH, PEN_PRESSURES, type PenPressure } from "./canvas/brush";
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

/** A pen's minimum width as a percentage of its selected size, before the pointed ends taper. */
const penMinimumWidth = deviceSetting<number>("draw.penMinimumWidth", {
  parse: (text) => {
    const value = text === null || text.trim() === "" ? NaN : Number(text);
    return Number.isInteger(value) && value >= 0 && value <= 100 ? value : FIRST_PEN_MINIMUM_WIDTH;
  },
  serialize: (value) => (value === FIRST_PEN_MINIMUM_WIDTH ? null : String(value)),
  name: "The pen's minimum width",
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

export const usePenMinimumWidth = (): number =>
  useSyncExternalStore(penMinimumWidth.subscribe, penMinimumWidth.get);
export const readPenMinimumWidth = penMinimumWidth.get;
/** Programmatic choices stay finite whole percentages, including a value storage refuses. */
export const keepPenMinimumWidth = (value: number): boolean =>
  penMinimumWidth.set(
    Number.isFinite(value)
      ? Math.max(0, Math.min(100, Math.round(value)))
      : FIRST_PEN_MINIMUM_WIDTH,
  );
