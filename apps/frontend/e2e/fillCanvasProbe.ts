import type { Page } from "@playwright/test";

interface FillCanvasSnapshot {
  armed: boolean;
  refused: { width: number; height: number }[];
}
interface FillCanvasControls {
  arm: (size: { width: number; height: number }) => void;
  read: () => FillCanvasSnapshot;
  disarm: () => void;
}
declare global {
  interface Window {
    fillCanvasProbe?: FillCanvasControls;
  }
}

/** Refuses only new detached full-sheet allocations; existing native canvases remain usable. */
export async function installFillCanvasProbe(page: Page) {
  await page.addInitScript(() => {
    const original: unknown = Reflect.get(HTMLCanvasElement.prototype, "getContext");
    if (typeof original !== "function") throw new Error("Native canvas getContext is unavailable");
    const seen = new WeakMap<HTMLCanvasElement, number>();
    let generation = 0;
    let size: { width: number; height: number } | null = null;
    const refused: FillCanvasSnapshot["refused"] = [];
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      configurable: true,
      writable: true,
      value(this: HTMLCanvasElement, ...args: unknown[]): unknown {
        const refuse =
          size &&
          args[0] === "2d" &&
          !this.isConnected &&
          (seen.get(this) ?? generation) >= generation &&
          this.width === size.width &&
          this.height === size.height;
        if (!seen.has(this)) seen.set(this, generation);
        if (refuse) {
          refused.push({ width: this.width, height: this.height });
          return null;
        }
        return Reflect.apply(original, this, args);
      },
    });
    window.fillCanvasProbe = {
      arm(next) {
        if (
          !Number.isSafeInteger(next.width) ||
          !Number.isSafeInteger(next.height) ||
          next.width < 1 ||
          next.height < 1
        )
          throw new Error("Canvas refusal needs positive full-sheet dimensions");
        generation++;
        for (const canvas of document.querySelectorAll("canvas"))
          if (!seen.has(canvas)) seen.set(canvas, generation - 1);
        size = next;
      },
      read: () => ({ armed: size !== null, refused: refused.map((canvas) => ({ ...canvas })) }),
      disarm() {
        size = null;
      },
    };
  });
}
export const armFillCanvasRefusal = (page: Page, size: { width: number; height: number }) =>
  page.evaluate((size) => {
    if (!window.fillCanvasProbe) throw new Error("Fill canvas probe is missing");
    window.fillCanvasProbe.arm(size);
  }, size);
export const readFillCanvasProbe = (page: Page) =>
  page.evaluate(() => {
    if (!window.fillCanvasProbe) throw new Error("Fill canvas probe is missing");
    return window.fillCanvasProbe.read();
  });
export const disarmFillCanvasRefusal = (page: Page) =>
  page.evaluate(() => {
    if (!window.fillCanvasProbe) throw new Error("Fill canvas probe is missing");
    window.fillCanvasProbe.disarm();
  });
