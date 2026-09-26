// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { revealOnLoad } from "./reveal";

/** An image that has or hasn't finished loading. */
const image = (complete: boolean) => {
  const img = document.createElement("img");
  Object.defineProperty(img, "complete", { value: complete });
  return img;
};
const loaded = (el: Element) => el.hasAttribute("data-loaded");

describe("revealOnLoad", () => {
  it("shows an image already in the cache at once", () => {
    const img = image(true);
    revealOnLoad(img);
    expect(loaded(img)).toBe(true);
  });

  it("shows an image, or its whole figure, when it loads or fails", () => {
    for (const outcome of ["load", "error"]) {
      const figure = document.createElement("span");
      const img = image(false);
      figure.append(img);
      revealOnLoad(img, figure);
      expect(loaded(figure)).toBe(false);
      img.dispatchEvent(new Event(outcome));
      expect(loaded(figure), outcome).toBe(true);
    }
  });
});
