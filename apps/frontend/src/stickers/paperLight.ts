import { currentLight, subscribeLight, type DevicePose } from "./light";
import { STILL_POSE } from "./lightMode";
import { paperIrradiance } from "./roomIrradiance";
import { roomFrame, type RoomFrame } from "./sharedRoom";

/**
 * How far a sticker's print follows the room's light on its flat paper: (E/E_still)^exponent, held
 * between min and max, where E is the paper's irradiance and E_still the still pose's. Shipped designs
 * hold content brightness fixed, and a full Lambert swing reads as the display dimming, so the print
 * follows only slightly. A fuller follow is these constants and BOARD_LIGHT_SHARE.
 */
export const PAPER_LIGHT = { exponent: 0.4, min: 0.85, max: 1 } as const;

/**
 * How much of the paper's dimming the sticker board's backing takes: 0 holds it put, 1 dims it as far
 * as the paper, so a strongly dimmed print doesn't read gray on a board that stays bright.
 */
const BOARD_LIGHT_SHARE: number = 0;

const STILL_IRRADIANCE = paperIrradiance(roomFrame(STILL_POSE)).total;

/** The factor on a sticker's print, paper and ink together, and foil's metal, for the room's frame. */
export function paperLight(frame: RoomFrame) {
  const { exponent, min, max } = PAPER_LIGHT;
  const follow = (paperIrradiance(frame).total / STILL_IRRADIANCE) ** exponent;
  return Math.min(max, Math.max(min, follow));
}

/**
 * The board dimming layer's opacity: black over the backing at this opacity multiplies its light by
 * the board's share of the paper's factor. CSS composites display values, so the factor is encoded.
 */
function boardDimming(pose: DevicePose) {
  const factor = 1 - BOARD_LIGHT_SHARE * (1 - paperLight(roomFrame(pose)));
  return 1 - factor ** (1 / 2.2);
}

/** The layer restyles only once its opacity moves a display level, so a held device's tremor writes nothing. */
const step = (opacity: number) => (Math.round(opacity * 255) / 255).toFixed(4);

const layers = new Set<HTMLElement>();
let shown = "0.0000";
let stopFollowing: (() => void) | null = null;

function follow(pose: DevicePose) {
  const next = step(boardDimming(pose));
  if (next === shown) return;
  shown = next;
  for (const layer of layers) layer.style.opacity = shown;
}

/**
 * A board dimming layer's ref. Its opacity follows the light on its own compositor layer, so it never
 * repaints; at a share of 0 it stays transparent and nothing follows the light for it.
 */
export function boardDimmingLayer(layer: HTMLElement | null) {
  if (!layer || BOARD_LIGHT_SHARE === 0) return;
  if (layers.size === 0) {
    shown = step(boardDimming(currentLight()));
    stopFollowing = subscribeLight(follow);
  }
  layers.add(layer);
  layer.style.willChange = "opacity";
  layer.style.opacity = shown;
  return () => {
    layers.delete(layer);
    if (layers.size > 0) return;
    stopFollowing?.();
    stopFollowing = null;
  };
}
