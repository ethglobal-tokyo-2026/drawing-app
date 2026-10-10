import { releaseCanvas } from "../../ui/releaseCanvas";
import { CanvasUnavailableError } from "./canvasUnavailable";

type Settings = CanvasRenderingContext2DSettings;

/** The canvas's 2D context; throws a CanvasUnavailableError where the browser can't provide one. */
export function context2d(canvas: HTMLCanvasElement, settings?: Settings): CanvasRenderingContext2D;
export function context2d(
  canvas: OffscreenCanvas,
  settings?: Settings,
): OffscreenCanvasRenderingContext2D;
export function context2d(canvas: HTMLCanvasElement | OffscreenCanvas, settings?: Settings) {
  // Each kind's own getContext, told apart by a method only OffscreenCanvas has.
  const ctx =
    "convertToBlob" in canvas
      ? canvas.getContext("2d", settings)
      : canvas.getContext("2d", settings);
  if (!ctx) throw new CanvasUnavailableError();
  return ctx;
}

/** A blank `width` × `height` canvas and its 2D context; throws where the browser can't provide one. */
export function blankCanvas(width: number, height: number, settings?: Settings) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  try {
    return { canvas, g: context2d(canvas, settings) };
  } catch (error) {
    releaseCanvas(canvas);
    throw error;
  }
}

/** A blank canvas off the document, for a worker, and its 2D context. */
export function blankOffscreenCanvas(width: number, height: number, settings?: Settings) {
  const canvas = new OffscreenCanvas(width, height);
  try {
    return { canvas, g: context2d(canvas, settings) };
  } catch (error) {
    releaseCanvas(canvas);
    throw error;
  }
}
