// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { prepareSealPreview } from "./sealPreview";

type Read = ReturnType<typeof vi.fn<(x: number, y: number, w: number, h: number) => ImageData>>;
type Paint = ReturnType<typeof vi.fn>;
type Context = { drawImage: Paint; fillRect?: Paint; getImageData?: Read };

const contexts = new WeakMap<HTMLCanvasElement, Context>();
vi.mock("../canvas/context2d", () => ({
  context2d: (canvas: HTMLCanvasElement) => {
    const context = contexts.get(canvas);
    if (!context) throw new Error("scan context unavailable");
    return context;
  },
}));

afterEach(() => vi.restoreAllMocks());

function image(w: number, h: number, pixels: readonly (readonly [number, number, number])[] = []) {
  const result = new ImageData(w, h);
  for (const [x, y, alpha] of pixels) result.data[(y * w + x) * 4 + 3] = alpha;
  return result;
}

/** Controls Canvas2D readback by canvas identity; no mocked context paints actual pixels. */
function fixture(
  alpha: "zero" | "white" | "faint" | "edge",
  size: readonly [number, number] = [2000, 1400],
) {
  const [width, height] = size;
  const target = document.createElement("canvas");
  target.width = 17;
  target.height = 18;
  const ink = document.createElement("canvas");
  ink.width = width;
  ink.height = height;
  const scan = document.createElement("canvas");
  const fill = vi.fn();
  const draw = vi.fn();
  const scanRead = vi.fn((_x: number, _y: number, w: number, h: number) => {
    const result = image(w, h);
    if (alpha === "white") {
      for (let y = 6; y <= 8; y++)
        for (let x = 5; x <= 6; x++) result.data[(y * w + x) * 4 + 3] = 255;
    }
    return result;
  });
  const fullRead = vi.fn((_x: number, _y: number, w: number, h: number) => {
    const result = image(
      w,
      h,
      alpha === "faint" ? [[999, 699, 1]] : alpha === "edge" ? [[0, 0, 255]] : [],
    );
    if (alpha === "white") {
      for (let y = 60; y < 90; y++)
        for (let x = 50; x < 70; x++) result.data[(y * w + x) * 4 + 3] = 255;
    }
    return result;
  });
  contexts.set(target, { drawImage: draw, fillRect: fill });
  contexts.set(ink, { drawImage: vi.fn(), getImageData: fullRead });
  contexts.set(scan, { drawImage: vi.fn(), getImageData: scanRead });
  vi.spyOn(document, "createElement").mockReturnValueOnce(scan);
  return { target, ink, scan, scanRead, fullRead, fill, draw };
}

it("returns empty without painting white when all original alpha is zero", () => {
  const f = fixture("zero");
  expect(prepareSealPreview(f.target, f.ink, 23)).toBe("empty");
  expect(f.fill).not.toHaveBeenCalled();
  expect(f.fullRead).toHaveBeenCalledExactlyOnceWith(0, 0, 2000, 1400);
  expect([f.scan.width, f.scan.height]).toEqual([0, 0]);
  expect([f.ink.width, f.ink.height]).toEqual([2000, 1400]);
});

it("keeps white ink and avoids full-resolution reads after a positive small scan", () => {
  const f = fixture("white");
  expect(prepareSealPreview(f.target, f.ink, 23)).toBe("ready");
  expect(f.fill).toHaveBeenCalledOnce();
  expect(f.fullRead).not.toHaveBeenCalled();
});

it("uses exact bounds for an alpha-1 pixel missed by the small scan", () => {
  const f = fixture("faint");
  expect(prepareSealPreview(f.target, f.ink, 23)).toBe("ready");
  expect([f.target.width, f.target.height]).toEqual([47, 47]);
  expect(f.draw).toHaveBeenCalledWith(f.ink, 976, 676, 47, 47, 0, 0, 47, 47);
});

it("clips a border crop at the source edge", () => {
  const f = fixture("edge");
  expect(prepareSealPreview(f.target, f.ink, 23)).toBe("ready");
  expect([f.target.width, f.target.height]).toEqual([47, 47]);
  expect(f.draw).toHaveBeenCalledWith(f.ink, 0, 0, 24, 24, 23, 23, 24, 24);
});

it.each(["scan read", "full read", "scan context"] as const)(
  "propagates %s failure and releases only its scan",
  (operation) => {
    const f = fixture("zero");
    const error = new Error(`${operation} failed`);
    if (operation === "scan read")
      f.scanRead.mockImplementation(() => {
        throw error;
      });
    if (operation === "full read")
      f.fullRead.mockImplementation(() => {
        throw error;
      });
    if (operation === "scan context") {
      contexts.delete(f.scan);
      expect(() => prepareSealPreview(f.target, f.ink, 23)).toThrow("scan context unavailable");
    } else expect(() => prepareSealPreview(f.target, f.ink, 23)).toThrow(error);
    expect([f.scan.width, f.scan.height]).toEqual([0, 0]);
    expect([f.ink.width, f.ink.height]).toEqual([2000, 1400]);
    expect([f.target.width, f.target.height]).toEqual([17, 18]);
  },
);
