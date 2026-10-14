import { expect, test } from "@playwright/test";
import { holdRoute, solidSvg } from "./stickerMaterialFixture.ts";

declare global {
  interface Window {
    finishContexts?: WebGLRenderingContext[];
    restoreFinish?: () => void;
  }
}

test("required foil generations delay baseline settlement and reject failed or superseded masks", async ({
  page,
}) => {
  const outer = await holdRoute(page, "**/required-outer.svg", () => ({
    status: 503,
    body: "outer coverage unavailable",
  }));
  await page.goto("/e2e/stickerLaminate.html?board=1");
  await page.evaluate(async () => {
    const { solidPng } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const c = document.createElement("canvas");
    c.id = "required-finish";
    c.style.cssText = "position:absolute;left:20px;top:20px;width:80px;height:80px";
    document.body.append(c);
    const cut = solidPng(80, 80, "white", 10);
    c.dataset.cut = cut;
    const material = { print: cut, cut, turn: 0, finish: "gloss" as const };
    api.mountSticker(c, material);
    await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
    c.dataset.before = c.toDataURL();
    api.updateSticker(c, {
      ...material,
      foil: { style: "pink", size: "board", mask: "/required-outer.svg" },
    });
    void api.whenStickerSettled(c, {}, AbortSignal.timeout(5000)).then(() => {
      c.dataset.settled = "true";
    });
  });
  await expect.poll(() => outer.requests).toBeGreaterThan(0);
  const c = page.locator("#required-finish");
  await expect(c).not.toHaveAttribute("data-settled", "true");
  expect(
    await c.evaluate(
      (el) => el instanceof HTMLCanvasElement && el.toDataURL() === el.dataset.before,
    ),
  ).toBe(true);
  outer.release();
  await expect(c).toHaveAttribute("data-settled", "true");
  await expect(c).toHaveAttribute("data-error", /outer coverage/);
  expect(
    await c.evaluate(
      (el) => el instanceof HTMLCanvasElement && el.toDataURL() === el.dataset.before,
    ),
  ).toBe(true);

  const stale = await holdRoute(page, "**/superseded-outer.svg", () => solidSvg("white", 80));
  await c.evaluate(async (el) => {
    if (!(el instanceof HTMLCanvasElement) || !el.dataset.cut)
      throw new Error("Required finish is missing");
    const api = await import("../src/stickers/stickerRenderer.ts");
    api.updateSticker(el, {
      print: el.dataset.cut,
      cut: el.dataset.cut,
      finish: "gloss",
      foil: { style: "pink", size: "board", mask: "/superseded-outer.svg" },
    });
    el.dataset.settled = "false";
    void api.whenStickerSettled(el, {}, AbortSignal.timeout(5000)).then(() => {
      el.dataset.settled = "true";
    });
  });
  await expect.poll(() => stale.requests).toBeGreaterThan(0);
  await expect(c).toHaveAttribute("data-settled", "false");
  await c.evaluate(async (el) => {
    if (!(el instanceof HTMLCanvasElement) || !el.dataset.cut)
      throw new Error("Required finish is missing");
    const api = await import("../src/stickers/stickerRenderer.ts");
    api.updateSticker(el, {
      print: el.dataset.cut,
      cut: el.dataset.cut,
      finish: "gloss",
      foil: { style: "silver", size: "board", mask: el.dataset.cut },
    });
    await api.whenStickerSettled(el, undefined, AbortSignal.timeout(5000));
    el.dataset.before = el.toDataURL();
  });
  stale.release();
  await c.evaluate(async (el) => {
    if (!(el instanceof HTMLCanvasElement)) throw new Error("Required finish is missing");
    const { twoFrames } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    api.refreshSticker(el);
    await twoFrames();
  });
  expect(
    await c.evaluate(
      (el) => el instanceof HTMLCanvasElement && el.toDataURL() === el.dataset.before,
    ),
  ).toBe(true);
  await expect(c).not.toHaveAttribute("data-error", /.+/);
});

test("complete foil survives the matching flat and bent reveal and a restored GPU context", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const native: unknown = Object.getOwnPropertyDescriptor(
      HTMLCanvasElement.prototype,
      "getContext",
    )?.value;
    if (typeof native !== "function") throw new Error("Canvas context factory is unavailable");
    const contexts: WebGLRenderingContext[] = [];
    window.finishContexts = contexts;
    Object.defineProperty(HTMLCanvasElement.prototype, "getContext", {
      value: function (this: HTMLCanvasElement, ...args: unknown[]) {
        const result: unknown = Reflect.apply(native, this, args);
        if (result instanceof WebGLRenderingContext) contexts.push(result);
        return result;
      },
      configurable: true,
      writable: true,
    });
  });
  await page.goto("/e2e/stickerLaminate.html?board=1");
  const revealed = await page.evaluate(async () => {
    const { required, solidPng } = await import("./stickerMaterialFixture.ts");
    const api = await import("../src/stickers/stickerRenderer.ts");
    const host = document.createElement("div");
    host.id = "reveal-complete";
    host.className = "sticker-material-surface";
    host.style.cssText = "position:absolute;left:30px;top:30px;width:80px;height:80px";
    host.innerHTML =
      '<span class="crease-reveal-frame sticker-material-bend"><span class="crease-reveal-content"><canvas class="sticker-material"></canvas></span></span>';
    document.body.append(host);
    const c = required(host.querySelector("canvas"));
    const cut = solidPng(80, 80, "white", 20);
    const outer = solidPng(80, 80, "white", 10);
    const normal = solidPng(80, 80, "rgb(128,128,255)");
    let flatAlpha = 0,
      bentAlpha = 0;
    const material = {
      print: cut,
      cut,
      finish: "gloss" as const,
      foil: { style: "silver" as const, size: "board" as const, mask: outer },
    };
    c.dataset.print = cut;
    c.dataset.outer = outer;
    c.dataset.normal = normal;
    api.mountSticker(c, {
      ...material,
      turn: 0,
      canRevealCrease: () => true,
      startCreaseReveal: () => true,
      onCreaseProgress: (_normal, progress) => {
        const flat = host.querySelector<HTMLCanvasElement>(".sticker-material-flat");
        if (progress !== 0 || !flat) return;
        flatAlpha = required(flat.getContext("2d")).getImageData(
          (flat.width * 15) / 80,
          flat.height / 2,
          1,
          1,
        ).data[3];
        bentAlpha = required(c.getContext("2d")).getImageData(
          (c.width * 15) / 80,
          c.height / 2,
          1,
          1,
        ).data[3];
      },
    });
    await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
    api.updateSticker(c, { ...material, normal });
    await api.whenStickerSettled(c, undefined, AbortSignal.timeout(5000));
    c.dataset.before = c.toDataURL();
    return { flatAlpha, bentAlpha };
  });
  expect(revealed).toEqual({ flatAlpha: 255, bentAlpha: 255 });
  const host = page.locator("#reveal-complete");
  await expect(host.locator(".sticker-material-flat")).toHaveCount(0);
  await page.evaluate(() => {
    const context = window.finishContexts?.[0];
    if (!context) throw new Error("Shared finish context missing");
    const extension = context.getExtension("WEBGL_lose_context");
    if (!extension) throw new Error("Context restoration test extension unavailable");
    window.restoreFinish = () => extension.restoreContext();
    extension.loseContext();
  });
  const output = host.locator("canvas.sticker-material");
  await expect(output).toHaveAttribute("data-state", "failed");
  await page.evaluate(() => {
    if (!window.restoreFinish) throw new Error("Context restore callback missing");
    window.restoreFinish();
  });
  await expect(output).toHaveAttribute("data-state", "ready");
  expect(
    await output.evaluate(
      (el) => el instanceof HTMLCanvasElement && el.toDataURL() === el.dataset.before,
    ),
  ).toBe(true);
});
