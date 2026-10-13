// @vitest-environment happy-dom
import { act, type ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { renderInHost } from "../ui/testing";
import { StickerFigure } from "./StickerFigure";
import { testStickerUrls } from "./testStickerUrls";

let rendered: ReturnType<typeof renderInHost> | undefined;
afterEach(() => rendered?.unmount());

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
    rendered = renderInHost(
      <StickerFigure
        urls={testStickerUrls("s")}
        width={100}
        height={100}
        crease={{
          base: "base.png",
          normal: "normal.png",
          topLeft: "top-left.png",
          bottomRight: "bottom-right.png",
          topRight: "top-right.png",
          bottomLeft: "bottom-left.png",
        }}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(rendered.host.querySelector(".sticker-laminate")?.getAttribute("data-state")).toBe(
      "failed",
    );
    expect(rendered.host.querySelector(".sticker-figure__img")?.getAttribute("src")).toBe(
      testStickerUrls("s").png,
    );
    expect(rendered.host.querySelectorAll(".sticker-crease > i")).toHaveLength(5);
  });
});
