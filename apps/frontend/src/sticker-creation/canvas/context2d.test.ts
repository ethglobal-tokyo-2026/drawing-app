// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { CanvasUnavailableError } from "./canvasUnavailable";
import { blankCanvas } from "./context2d";

afterEach(() => vi.restoreAllMocks());

it("releases a refused canvas immediately so retry does not retain its backing pixels", () => {
  const refused: HTMLCanvasElement[] = [];
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    refused.push(this);
    return null;
  });
  expect(() => blankCanvas(1600, 1600)).toThrow(CanvasUnavailableError);
  expect(refused).toHaveLength(1);
  expect([refused[0].width, refused[0].height]).toEqual([0, 0]);
});
