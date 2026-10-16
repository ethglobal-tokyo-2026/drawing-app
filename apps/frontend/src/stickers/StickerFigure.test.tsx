// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderInHost } from "../ui/testing";
import { StickerFigure } from "./StickerFigure";
import { testStickerUrls } from "./testStickerUrls";

let rendered: ReturnType<typeof renderInHost> | undefined;
afterEach(() => {
  rendered?.unmount();
  vi.restoreAllMocks();
});

/** The classes of the foil a figure given `props` wears; none without a foil. */
function foilOf(props: Partial<ComponentProps<typeof StickerFigure>>): string[] {
  rendered?.unmount();
  rendered = renderInHost(
    <StickerFigure urls={testStickerUrls("s")} width={10} height={10} {...props} />,
  );
  return [...(rendered.host.querySelector(".sticker-foil")?.classList ?? [])];
}

describe("StickerFigure's foil", () => {
  it("is the Kyoto Seika Practice Mode foil on a sticker drawn in Kyoto Seika Practice Mode, whoever drew it", () => {
    expect(foilOf({ kyotoSeika: true })).toEqual(
      expect.arrayContaining(["sticker-foil--board", "sticker-foil--kyoto-seika"]),
    );
    const byOther = foilOf({ kyotoSeika: true, foil: "detail" });
    expect(byOther).toEqual(
      expect.arrayContaining(["sticker-foil--detail", "sticker-foil--kyoto-seika"]),
    );
    expect(byOther).not.toContain("sticker-foil--holo");
  });

  it("is pink on an NSFW sticker drawn in Kyoto Seika Practice Mode", () => {
    const foil = foilOf({ kyotoSeika: true, nsfw: true });
    expect(foil).toContain("sticker-foil--pink");
    expect(foil).not.toContain("sticker-foil--kyoto-seika");
  });

  it("is holo on any other sticker someone else drew, and absent from your own", () => {
    expect(foilOf({ foil: "board" })).toContain("sticker-foil--holo");
    expect(foilOf({})).toEqual([]);
  });
});

describe("StickerFigure's laminate", () => {
  it("keeps the printed sticker and crease visible if its material renderer is unavailable", async () => {
    // Material admission waits for exposure; both the canvas and its stable wrapper need a size.
    vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
    vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
      new DOMRect(20, 20, 100, 100),
    );
    rendered = renderInHost(
      <StickerFigure
        urls={testStickerUrls("s")}
        width={100}
        height={100}
        crease={{
          base: "base.png",
          normal: "normal.png",
          height: "height.png",
          normalBounds: { x: -0.1, y: 0, width: 1.1, height: 1 },
        }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(rendered.host.querySelector(".sticker-material")?.getAttribute("data-state")).toBe(
      "failed",
    );
    expect(rendered.host.querySelector(".sticker-figure__img")?.getAttribute("src")).toBe(
      testStickerUrls("s").png,
    );
    const layers = [...rendered.host.querySelectorAll<HTMLElement>(".sticker-crease > i")];
    expect(layers.map((layer) => layer.style.getPropertyValue("--crease"))).toEqual([
      'url("base.png")',
    ]);
  });
});

describe("StickerFigure's complete foil finish", () => {
  it.each([
    [{ kyotoSeika: true }, "kyoto-seika"],
    [{ kyotoSeika: true, nsfw: true }, "pink"],
    [{ foil: "board" as const }, "holo"],
  ])("renders the resolved foil in its one finish", (props, style) => {
    foilOf(props);
    const canvas = rendered?.host.querySelector("canvas.sticker-material");
    expect(canvas?.getAttribute("data-foil-style")).toBe(style);
    expect(rendered?.host.querySelectorAll("canvas.sticker-material")).toHaveLength(1);
  });
});
