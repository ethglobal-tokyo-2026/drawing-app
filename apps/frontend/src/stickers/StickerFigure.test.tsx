// @vitest-environment happy-dom
import type { ComponentProps } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { renderWithApi } from "../api/testing";
import { StickerFigure } from "./StickerFigure";
import { testStickerUrls } from "./testStickerUrls";

let rendered: ReturnType<typeof renderWithApi> | undefined;
afterEach(() => rendered?.unmount());

/** The classes of the foil a figure given `props` wears; none without a foil. */
function foilOf(props: Partial<ComponentProps<typeof StickerFigure>>): string[] {
  rendered?.unmount();
  rendered = renderWithApi(
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
