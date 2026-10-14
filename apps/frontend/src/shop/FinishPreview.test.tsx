// @vitest-environment happy-dom
import { afterEach, describe, expect, it } from "vitest";
import { LAMINATE_FINISHES } from "../stickers/laminate";
import { renderInHost } from "../ui/testing";
import { FinishPreview } from "./FinishPreview";
import type { ShopSticker } from "./shopSticker";

const sticker: ShopSticker = {
  urls: { png: "/cat.webp", mask: "/cat-mask.webp" },
  width: 374,
  height: 384,
};

let rendered: ReturnType<typeof renderInHost> | undefined;
afterEach(() => {
  rendered?.unmount();
  rendered = undefined;
});

/** The sticker material the preview renders for `finish`. */
const coatOf = (finish: Parameters<typeof FinishPreview>[0]["finish"]) => {
  rendered = renderInHost(<FinishPreview sticker={sticker} side={96} finish={finish} />);
  return rendered.host.querySelector("canvas.sticker-material");
};

describe("FinishPreview", () => {
  it.each(LAMINATE_FINISHES)("coats the sticker in the %s laminate", (laminate) => {
    expect(coatOf({ laminate })?.getAttribute("data-finish")).toBe(laminate);
  });

  it.each(["gold", "silver", "roseGold"] as const)(
    "shows the %s backing foil round a gloss sticker",
    (foil) => {
      const coat = coatOf({ foil });
      expect(coat?.getAttribute("data-foil-style")).toBe(foil);
      expect(coat?.getAttribute("data-finish")).toBe("gloss");
    },
  );
});
