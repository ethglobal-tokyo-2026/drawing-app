// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { renderInHost } from "../ui/testing";
import { StickerFigure } from "./StickerFigure";
import { mountSticker, updateSticker } from "./stickerRenderer";

// happy-dom has no GPU. Replace only the canvas resource boundary; the real figure and finish
// still choose material, print, cut, and presentation lifetimes.
vi.mock("./stickerRenderer", () => ({
  mountSticker: vi.fn(() => () => {}),
  updateSticker: vi.fn(),
  turnSticker: vi.fn(),
  stickerTurn: () => 0,
  refreshSticker: vi.fn(),
}));
let rendered: ReturnType<typeof renderInHost> | undefined;
afterEach(() => {
  rendered?.unmount();
  vi.clearAllMocks();
});

it("keeps the foil descriptor when only the print or presentation turn changes", () => {
  const urls = { png: "/print.png", mask: "/cut.png", foil: "/outer.png" };
  rendered = renderInHost(<StickerFigure urls={urls} width={240} height={240} kyotoSeika />);
  const material = vi.mocked(mountSticker).mock.calls[0]?.[1]?.foil;
  expect(material).toEqual({ style: "kyoto-seika", size: "board", mask: "/outer.png" });
  rendered.rerender(
    <StickerFigure urls={urls} width={240} height={240} kyotoSeika turn={40} stuck />,
  );
  expect(updateSticker).toHaveBeenCalledOnce();
  rendered.rerender(
    <StickerFigure
      urls={{ ...urls, png: "/sharp.png" }}
      width={240}
      height={240}
      kyotoSeika
      turn={40}
      stuck
    />,
  );
  const replacement = vi.mocked(updateSticker).mock.calls.at(-1)?.[1];
  expect(replacement?.print).toBe("/sharp.png");
  expect(replacement?.cut).toBe("/cut.png");
  expect(replacement?.foil).toBe(material);
  expect(mountSticker).toHaveBeenCalledOnce();
});
