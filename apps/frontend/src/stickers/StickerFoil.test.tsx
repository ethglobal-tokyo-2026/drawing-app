// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { renderInHost } from "../ui/testing";
import { foilCoverageImage, type FoilCoverageImage } from "./foilCoverageImage";
import { prepareStickerFoil } from "./prepareStickerFoil";
import { StickerFigure } from "./StickerFigure";

// Only the worker's answer is replaced; admission and the real material components still run.
vi.mock("./foilCoverageImage", () => ({ foilCoverageImage: vi.fn() }));

let rendered: ReturnType<typeof renderInHost> | undefined;
afterEach(() => {
  rendered?.unmount();
  rendered = undefined;
  vi.resetAllMocks();
  vi.restoreAllMocks();
});

function layout({ width = 100, left = 20 } = {}) {
  vi.spyOn(HTMLElement.prototype, "clientWidth", "get").mockReturnValue(width);
  vi.spyOn(HTMLElement.prototype, "clientHeight", "get").mockReturnValue(100);
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockReturnValue(
    new DOMRect(left, 20, width, 100),
  );
}
const pending = () => new Promise<FoilCoverageImage>(() => {});

it.each(["covered", "offscreen", "zero size"] as const)(
  "does not prepare static coverage for a %s presentation",
  (state) => {
    vi.mocked(foilCoverageImage).mockImplementation(pending);
    layout({ width: state === "zero size" ? 0 : 100, left: state === "offscreen" ? -300 : 20 });
    rendered = renderInHost(
      <StickerFigure
        urls={{ png: "/print.png", mask: "/cut.png" }}
        width={100}
        height={100}
        nsfw
        laminateActive={state !== "covered"}
      />,
    );
    expect(foilCoverageImage).not.toHaveBeenCalled();
  },
);

it("admits re-exposure and cancels pending static preparation when covered", () => {
  vi.mocked(foilCoverageImage).mockImplementation(pending);
  layout();
  const figure = (active: boolean) => (
    <StickerFigure
      urls={{ png: "/print.png", mask: "/cut.png" }}
      width={100}
      height={100}
      nsfw
      laminateActive={active}
    />
  );
  rendered = renderInHost(figure(false));
  expect(foilCoverageImage).not.toHaveBeenCalled();
  rendered.rerender(figure(true));
  expect(foilCoverageImage).toHaveBeenCalledOnce();
  const first = vi.mocked(foilCoverageImage).mock.calls[0][4];
  expect(first.aborted).toBe(false);
  rendered.rerender(figure(false));
  expect(first.aborted).toBe(true);
  const fallback = rendered.host.querySelector(".sticker-foil");
  rendered.rerender(figure(true));
  expect(foilCoverageImage).toHaveBeenCalledTimes(2);
  expect(rendered.host.querySelector(".sticker-foil")).toBe(fallback);
});

it("keeps the shown cast when its replacement fails, and retries on the next exposure", async () => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:shown");
  const revoked = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const logged = vi.spyOn(console, "error").mockImplementation(() => {});
  const shown: FoilCoverageImage = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    sourceWidth: 100,
    sourceHeight: 100,
    alpha: new Uint8ClampedArray(100 * 100),
    png: new Blob(),
  };
  vi.mocked(foilCoverageImage)
    .mockResolvedValueOnce(shown)
    .mockRejectedValueOnce(new Error("decode failed"))
    .mockImplementation(pending);
  layout();
  const element = document.createElement("span");
  document.body.append(element);
  const dispose = prepareStickerFoil(
    element,
    { style: "holo", size: "board" },
    "/cut.png",
    () => true,
  );
  await vi.waitFor(() => expect(element.dataset.state).toBe("ready"));
  layout({ width: 120 });
  document.dispatchEvent(new Event("visibilitychange"));
  await vi.waitFor(() => expect(element.dataset.error).toContain("decode failed"));
  expect(element.dataset.state).toBe("ready");
  expect(element.style.getPropertyValue("--foil-coverage")).toBe('url("blob:shown")');
  expect(revoked).not.toHaveBeenCalled();
  expect(logged).toHaveBeenCalled();
  document.dispatchEvent(new Event("visibilitychange"));
  expect(foilCoverageImage).toHaveBeenCalledTimes(3);
  dispose();
  expect(revoked).toHaveBeenCalledWith("blob:shown");
  element.remove();
});
