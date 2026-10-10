/**
 * The `context2d` module for tests, on happy-dom, which has no 2D context: every context is a
 * `FakeContext`. A test mocks the module with all of it:
 * `vi.mock("<path>/context2d", () => import("<path>/testContext2d"))`.
 */
import { fakeContext2d } from "../../sticker-board/timelapse/testCanvas";

export const context2d = fakeContext2d;

export function blankCanvas(
  width: number,
  height: number,
  settings?: CanvasRenderingContext2DSettings,
) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return { canvas, g: fakeContext2d(canvas, settings) };
}
