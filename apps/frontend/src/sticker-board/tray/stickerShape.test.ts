import { describe, expect, it, onTestFinished, vi } from "vitest";
import { formatNo } from "../../stickers/format";
import { maskPixels } from "../../stickers/maskPixels";
import { testStickerUrls } from "../../stickers/testStickerUrls";
import { outlineShape } from "./sheetPacking";
import { dotSpot, knownShape, stickerShape, unreadableCut } from "./stickerShape";

vi.mock("../../stickers/maskPixels", () => ({ maskPixels: vi.fn() }));

describe("dotSpot", () => {
  const wide = (id: string, outline?: string) => ({
    id,
    no: 1,
    width: 200,
    height: 100,
    ...(outline !== undefined && { outline }),
  });

  it("sticks on the cut line where it comes nearest the top-right corner, measured in pixels", () => {
    // The image's bottom-left half: in pixels the nearest point is 4/5 along the long side, where
    // measuring in units of the image would put it halfway.
    expect(dotSpot(wide("half", "M0 0L200 100L0 100Z"))).toEqual({ x: 0.8, y: 0.8 });
  });

  it("takes the corner itself until the cut line is known", () => {
    expect(dotSpot(wide("unknown"))).toEqual({ x: 1, y: 0 });
  });
});

describe("a sticker whose mask can't be traced", () => {
  const failure = new Error("the mask didn't decode");
  /** A sticker without a stored cut line, as the board kept on the device has, whose trace fails. */
  function untraceable(id: string) {
    vi.mocked(maskPixels).mockRejectedValue(failure);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});
    onTestFinished(() => {
      errors.mockRestore();
      vi.mocked(maskPixels).mockReset();
    });
    const sticker = { id, no: 7, width: 200, height: 100 };
    return { sticker, urls: testStickerUrls(id), errors };
  }

  it("packs as a box from then on, traced and logged once", async () => {
    const { sticker, urls, errors } = untraceable("untraceable");
    const packed = await stickerShape(sticker, urls);
    // Known, so the next refresh packs the sheets at once instead of tracing it again.
    expect(knownShape(sticker)).toBe(packed);
    expect(await stickerShape(sticker, urls)).toBe(packed);
    expect(maskPixels).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalledOnce();
    expect(errors).toHaveBeenCalledWith(expect.stringContaining(formatNo(sticker.no)), failure);
    expect(unreadableCut(sticker.id)).toBe(failure.message);
  });

  it("takes its stored cut line in the box's place once the fresh board brings it", async () => {
    const { sticker, urls } = untraceable("outlined-later");
    await stickerShape(sticker, urls);
    const outline = "M0 0L200 100L0 100Z";
    expect(knownShape({ ...sticker, outline })).toEqual(
      outlineShape(outline, sticker.width, sticker.height),
    );
    expect(unreadableCut(sticker.id)).toBeUndefined();
  });
});
