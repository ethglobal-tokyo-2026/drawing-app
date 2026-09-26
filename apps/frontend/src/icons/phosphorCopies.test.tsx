import {
  HandSwipeRight,
  Heart,
  Stack,
  Vibrate,
  X,
  type Icon,
  type IconWeight,
} from "@phosphor-icons/react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { HAND_SWIPE_SVG, HEART_SVG, VIBRATE_SVG } from "../gratitude/heartArt";
import { ICONS as TRAY_ICONS } from "../sticker-board/tray/trayEngine";

/** Every path an SVG draws, in order. */
const pathsOf = (svg: string) => [...svg.matchAll(/\sd="([^"]+)"/g)].map((match) => match[1]);
const published = (Glyph: Icon, weight: IconWeight) =>
  pathsOf(renderToStaticMarkup(<Glyph weight={weight} />));

// The mini-game and the tray build their DOM from strings, so they carry copies of Phosphor's icons. A
// copy must stay the published icon, even after Phosphor is updated.
describe("copies of Phosphor's icons", () => {
  it.each([
    ["the HUD's gratitude heart", HEART_SVG, Heart, "fill"],
    ["the stroke tip", HAND_SWIPE_SVG, HandSwipeRight, "bold"],
    ["the shake tip and marks", VIBRATE_SVG, Vibrate, "fill"],
    ["the tray's stack mark", `<path d="${TRAY_ICONS.stack}"/>`, Stack, "bold"],
    ["the tray's close mark", `<path d="${TRAY_ICONS.x}"/>`, X, "bold"],
  ] as const)("%s is Phosphor's, byte for byte", (_, copy, Glyph, weight) => {
    expect(pathsOf(copy)).toEqual(published(Glyph, weight));
  });
});
