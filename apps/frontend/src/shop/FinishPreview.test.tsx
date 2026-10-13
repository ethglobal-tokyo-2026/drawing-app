// @vitest-environment happy-dom
import { act } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderInHost } from "../ui/testing";
import { FinishPreview, type Laminate } from "./FinishPreview";
import type { ShopSticker } from "./shopSticker";

const sticker: ShopSticker = {
  urls: { png: "/cat.webp", mask: "/cat-mask.webp" },
  width: 374,
  height: 384,
};

/** The images the preview asked to load, which the test loads by hand. */
let asked: FakeImage[] = [];

class FakeImage {
  src = "";
  onload: (() => void) | null = null;
  constructor() {
    asked.push(this);
  }
}

/** Loads the image the preview asked for at `src`. */
function load(src: string) {
  const img = asked.find((i) => i.src === src);
  if (!img) throw new Error(`nothing asked for ${src}`);
  act(() => img.onload?.());
}

let rendered: ReturnType<typeof renderInHost> | undefined;
beforeEach(() => {
  asked = [];
  vi.stubGlobal("Image", FakeImage);
});
afterEach(() => {
  rendered?.unmount();
  rendered = undefined;
  vi.unstubAllGlobals();
});

const preview = (laminate: Laminate) => {
  rendered = renderInHost(<FinishPreview sticker={sticker} side={96} finish={{ laminate }} />);
  return rendered.host;
};

describe("FinishPreview", () => {
  it.each(["glitter", "prism"] as const)(
    "keeps the %s film out until the sticker's mask has loaded",
    (laminate) => {
      const host = preview(laminate);
      expect(host.querySelector(".laminate-film")).toBeNull();
      load(sticker.urls.mask);
      const film = host.querySelector(`.laminate-film--${laminate}`);
      expect(film).not.toBeNull();
      // The film takes its shape from the mask its box sets.
      const box = film?.parentElement;
      if (!(box instanceof HTMLElement)) throw new Error("the film has no box");
      expect(box.style.getPropertyValue("--m")).toBe(`url("${sticker.urls.mask}")`);
    },
  );

  it.each(["gloss", "matte"] as const)("uses the %s coating inside the sticker cut", (finish) => {
    const host = preview(finish);
    const coat = host.querySelector("canvas.sticker-laminate");
    expect(coat?.getAttribute("data-finish")).toBe(finish);
    const box = coat?.closest<HTMLElement>(".finish-preview__art");
    expect(box?.style.getPropertyValue("--m")).toBe(`url("${sticker.urls.mask}")`);
    expect(host.querySelector(".laminate-haze")).toBeNull();
    load(sticker.urls.mask);
    expect(host.querySelector(".laminate-haze")).toBeNull();
    expect(host.querySelector("canvas.sticker-laminate")).toBe(coat);
  });

  it("takes the film away while a newer sticker's mask loads", () => {
    const host = preview("prism");
    load(sticker.urls.mask);
    const dog = { ...sticker, urls: { ...sticker.urls, mask: "/dog-mask.webp" } };
    rendered?.rerender(<FinishPreview sticker={dog} side={96} finish={{ laminate: "prism" }} />);
    // The cat's mask having loaded doesn't count for the dog's.
    expect(host.querySelector(".laminate-film")).toBeNull();
    load(dog.urls.mask);
    expect(host.querySelector(".laminate-film")).not.toBeNull();
  });
});
