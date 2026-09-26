// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { changeScreen } from "./screenTransition";

afterEach(() => vi.restoreAllMocks());

describe("changeScreen", () => {
  it("changes the screen inside a view transition, where the browser has them", () => {
    const apply = vi.fn();
    const startViewTransition = vi.fn((update: () => void) => {
      expect(apply).not.toHaveBeenCalled();
      update();
      const done = Promise.resolve();
      return { finished: done, ready: done, updateCallbackDone: done, skipTransition: () => {} };
    });
    changeScreen(
      apply,
      Object.assign(document.implementation.createHTMLDocument(), { startViewTransition }),
    );
    expect(startViewTransition).toHaveBeenCalledOnce();
    expect(apply).toHaveBeenCalledOnce();
  });

  it("changes it at once where the browser has none", () => {
    const apply = vi.fn();
    const doc = document.implementation.createHTMLDocument();
    Object.defineProperty(doc, "startViewTransition", { value: undefined });
    changeScreen(apply, doc);
    expect(apply).toHaveBeenCalledOnce();
  });
});
