/**
 * The sheet a drawing is drawn on: its size in sheet units, fixed for the life of the drawing,
 * and the density its ink is backed at. A unit is a CSS px on a 390 px phone's sheet. Every
 * screen shows the sheet scaled to fit, so a sticker comes out the same from any device, and
 * turning the screen or resizing the window only rescales it.
 */
import { clamp } from "../../ui/easing";

/** The sheet's short side, in units: the sheet on a 390 px phone. */
export const SHEET_SHORT_UNITS = 374;
/** The long side follows the area's shape as the drawing starts, between these times the short. */
const MIN_SHEET_ASPECT = 1;
export const MAX_SHEET_ASPECT = 2.2;
/** Raw pixels for twenty full sheet canvases fit the 224 MB old-iOS target; WebKit may keep extra backing. */
export const MAX_INK_PIXELS = 2_800_000;
/** Past this many device px per CSS px, a sharper canvas costs memory and shows nothing more. */
export const MAX_DPR = 3;

/** A sheet's size in units, and the device px its ink holds per unit. */
export type SheetFrame = { w: number; h: number; density: number };

/** The room the sheet has on screen, in CSS px. */
export type SheetArea = { width: number; height: number };

type Size = Pick<SheetFrame, "w" | "h">;

/** The timelapse records sizes and stroke points to the tenth of a unit, and densities to the thousandth. */
const TENTHS = 10;
const THOUSANDTHS = 1000;
/** A length in whole tenths of a unit. */
export const tenths = (n: number) => Math.round(n * TENTHS);
/** Whole tenths of a unit back to a length. */
export const fromTenths = (n: number) => n / TENTHS;
/** A length to the tenth of a unit. */
export const toTenth = (n: number) => fromTenths(tenths(n));
/** A density to the thousandth, as phones report ones like 2.625. */
export const toThousandth = (n: number) => Math.round(n * THOUSANDTHS) / THOUSANDTHS;
/** Densities are kept to the thousandth, as the timelapse records them, so replays flood alike. */
const thousandthBelow = (n: number) => Math.floor(n * THOUSANDTHS) / THOUSANDTHS;

/** CSS px per unit, with the sheet shown as large as it fits in the area. */
export const fitScale = (frame: Size, area: SheetArea) =>
  Math.min(area.width / frame.w, area.height / frame.h);

/** The densest a sheet this size is backed at, held under MAX_INK_PIXELS. */
export const maxInkDensity = ({ w, h }: Size) =>
  thousandthBelow(Math.sqrt(MAX_INK_PIXELS / (w * h)));

/**
 * Device px per unit for a sheet shown in this area: the screen's own at the size it's shown, never
 * coarser than a phone's sheet on the same screen, and held under MAX_INK_PIXELS.
 */
function densityFor(size: Size, area: SheetArea, devicePixelRatio: number): number {
  const shown = Math.max(1, fitScale(size, area)) * Math.min(devicePixelRatio || 1, MAX_DPR);
  return Math.min(thousandthBelow(shown), maxInkDensity(size));
}

/** A new drawing's frame: SHEET_SHORT_UNITS on its short side, the area's shape on its long. */
export function frameFor(area: SheetArea, devicePixelRatio: number): SheetFrame {
  const long = Math.max(area.width, area.height);
  const short = Math.min(area.width, area.height);
  const aspect = clamp(long / short, MIN_SHEET_ASPECT, MAX_SHEET_ASPECT);
  const longUnits = Math.round(SHEET_SHORT_UNITS * aspect);
  const size =
    area.height >= area.width
      ? { w: SHEET_SHORT_UNITS, h: longUnits }
      : { w: longUnits, h: SHEET_SHORT_UNITS };
  return { ...size, density: densityFor(size, area, devicePixelRatio) };
}

/**
 * The area itself as a frame, shown at scale 1: the sheet a drawing kept without a frame was drawn
 * on, its ops in that sheet's CSS px.
 */
export function areaFrame(area: SheetArea, devicePixelRatio: number): SheetFrame {
  const size = { w: toTenth(area.width), h: toTenth(area.height) };
  return { ...size, density: densityFor(size, area, devicePixelRatio) };
}

/** Keeps saved sheet coordinates while limiting the backing pixels to this device's canvas budget. */
export const boundedFrame = (frame: SheetFrame): SheetFrame => {
  const density = Math.min(frame.density, maxInkDensity(frame));
  return density === frame.density ? frame : { ...frame, density };
};
