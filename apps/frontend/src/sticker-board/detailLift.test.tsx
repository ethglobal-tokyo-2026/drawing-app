// @vitest-environment happy-dom
import { act, useRef } from "react";
import { createRoot } from "react-dom/client";
import { afterEach, expect, it, vi } from "vitest";
import { stickerMaterialActive } from "../stickers/stickerMaterialHandoff";
import { mountSticker, mountStickerCopy, stickerFoilCoverage } from "../stickers/stickerRenderer";
import { useDetailLift } from "./detailLift";

vi.mock("../stickers/stickerRenderer", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../stickers/stickerRenderer")>();
  return { ...actual, mountStickerCopy: vi.fn(actual.mountStickerCopy) };
});

const host = document.createElement("div");
document.body.append(host);
const root = createRoot(host);
afterEach(() => {
  act(() => root.render(null));
  vi.restoreAllMocks();
  host.replaceChildren();
});

/** Opens a view lifting a figure off `origin`; the figure's own material is still loading. */
function openLift(origin: HTMLElement) {
  vi.spyOn(Element.prototype, "animate").mockImplementation(() => {
    const animation = new Animation();
    animation.play();
    return animation;
  });
  vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(120);
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockReturnValue(120);
  function View() {
    const ref = useRef<HTMLDivElement>(null);
    useDetailLift({
      root: ref,
      shownId: "a",
      originOf: () => ({ el: origin, turn: 0 }),
      into: { figureOf: (view) => view.querySelector(".sticker-figure"), enter: () => [] },
      reduced: false,
      onClose: () => {},
    });
    return (
      <div ref={ref}>
        <span className="sticker-figure">
          <img src="unblurred.png" />
          <canvas className="sticker-material" width={0} height={0} />
        </span>
      </div>
    );
  }
  act(() => root.render(<View />));
}

it("never attaches an image-only flyer when a ready source rejects its copy synchronously", () => {
  const origin = document.createElement("div");
  host.append(origin);
  const source = document.createElement("canvas");
  source.className = "sticker-material";
  origin.append(source);
  // An inactive real owner has no retained snapshot and never starts irrelevant asset transport.
  const releaseSource = mountSticker(source, {
    print: "unblurred.png",
    cut: "cut.png",
    finish: "gloss",
    turn: 0,
    active: () => false,
  });
  // Its canvas says ready, but its owner has no snapshot to copy.
  source.dataset.state = "ready";
  expect(stickerFoilCoverage(source)).toBeUndefined();
  expect(stickerFoilCoverage(document.createElement("canvas"))).toBeUndefined();
  openLift(origin);
  releaseSource();
  expect(stickerFoilCoverage(source)).toBeUndefined();
  expect(document.querySelector(".detail-lift__flyer")).toBeNull();
});

it("flies a still copy of the figure when nothing it lifts from has ready material", () => {
  // As Explore's pile holds it: an image, with no material to copy.
  const origin = document.createElement("div");
  origin.append(document.createElement("img"));
  host.append(origin);
  openLift(origin);
  const flyer = document.querySelector(".detail-lift__flyer");
  expect(flyer?.querySelector("img")?.getAttribute("src")).toBe("unblurred.png");
  expect(flyer?.querySelector("canvas.sticker-material")?.getAttribute("data-state")).toBe(
    "loading",
  );
});

it("flies the still copy and lets the view's material go when copying its material throws", () => {
  // As at iOS's canvas memory cap, where a copy gets no 2D context.
  vi.mocked(mountStickerCopy).mockImplementationOnce(() => {
    throw new Error("Copying the complete sticker finish failed: 2D context unavailable");
  });
  const failed = vi.spyOn(console, "error").mockImplementation(() => {});
  const origin = document.createElement("div");
  const source = document.createElement("canvas");
  source.className = "sticker-material";
  source.dataset.state = "ready";
  origin.append(source);
  host.append(origin);
  openLift(origin);
  const flyer = document.querySelector(".detail-lift__flyer");
  expect(flyer?.querySelector("img")?.getAttribute("src")).toBe("unblurred.png");
  const view = host.querySelector<HTMLCanvasElement>(":scope > div > .sticker-figure canvas");
  if (!view) throw new Error("The view's material is missing");
  expect(stickerMaterialActive(view, true)).toBe(true);
  expect(failed).toHaveBeenCalledWith(
    expect.stringContaining("Copying sticker a's material"),
    expect.any(Error),
  );
});
