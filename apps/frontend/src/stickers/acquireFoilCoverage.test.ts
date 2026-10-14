// @vitest-environment happy-dom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { foilCoverageImage, type FoilCoverageImage } from "./foilCoverageImage";
import { acquireFoilCoverage, FOIL_COVERAGE_TIMEOUT_MS } from "./acquireFoilCoverage";
import type { StickerFoilMaterial } from "./stickerFoilMaterial";
vi.mock("./foilCoverageImage", () => ({ foilCoverageImage: vi.fn() }));
const releases: (() => void)[] = [];
const holo: StickerFoilMaterial = { style: "holo", size: "board" };
const value = (): FoilCoverageImage => ({
  x: -1,
  y: -1,
  width: 2,
  height: 2,
  sourceWidth: 1,
  sourceHeight: 1,
  alpha: new Uint8ClampedArray(4).fill(127),
  png: new Blob(),
});
function take(cut = "cut", width = 240, signal = new AbortController().signal, material = holo) {
  const handle = acquireFoilCoverage(cut, material, width, 240, signal);
  releases.push(handle.release);
  return handle;
}
/** A coverage image that arrives only when the test hands it over. */
function heldImage() {
  let arrive: (image: FoilCoverageImage) => void = () => {
    throw new Error("The held image's promise never started");
  };
  const image = new Promise<FoilCoverageImage>((resolve) => {
    arrive = resolve;
  });
  // The executor has run by now, so this is the promise's own resolve.
  return { image, arrive };
}
let objectUrls = 0;
let revoked: ReturnType<typeof vi.fn<typeof URL.revokeObjectURL>>;
beforeEach(() => {
  vi.spyOn(URL, "createObjectURL").mockImplementation(() => `blob:band-${++objectUrls}`);
  revoked = vi.fn();
  vi.spyOn(URL, "revokeObjectURL").mockImplementation(revoked);
});
afterEach(() => {
  releases.splice(0).forEach((release) => release());
  vi.resetAllMocks();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

it("shares one coverage, alpha included, between presentations of the same pixels", async () => {
  vi.mocked(foilCoverageImage).mockResolvedValue(value());
  const [one, two] = await Promise.all([take().coverage, take().coverage]);
  expect(foilCoverageImage).toHaveBeenCalledTimes(1);
  expect(two).toBe(one);
  expect(two.alpha).toBe(one.alpha);
});

it("shares across display sizes whose pixels match and keeps apart inputs that change them", async () => {
  vi.mocked(foilCoverageImage).mockResolvedValue(value());
  const baked: StickerFoilMaterial = { ...holo, mask: "baked" };
  const shared = [take("cut", 240, undefined, baked), take("cut", 250, undefined, baked)];
  await Promise.all(shared.map((handle) => handle.coverage));
  expect(foilCoverageImage).toHaveBeenCalledTimes(1);
  const apart = [
    take("cut", 480, undefined, baked),
    take("cut", 250),
    take("cut", 240, undefined, { ...holo, style: "pink" }),
    take("cut", 240, undefined, { ...holo, size: "detail" }),
    take("other", 240, undefined, baked),
  ];
  await Promise.all(apart.map((handle) => handle.coverage));
  expect(foilCoverageImage).toHaveBeenCalledTimes(6);
});

it("shows a baked mask as served and revokes a grown band's mask with its last presentation", async () => {
  vi.mocked(foilCoverageImage).mockResolvedValue(value());
  const baked = await take("cut", 240, undefined, { ...holo, mask: "/baked.png" }).coverage;
  expect(baked.mask).toBe("/baked.png");
  const a = take(),
    b = take();
  const grown = await a.coverage;
  expect(grown.mask).toMatch(/^blob:/);
  a.release();
  expect(revoked).not.toHaveBeenCalled();
  b.release();
  expect(revoked).toHaveBeenCalledWith(grown.mask);
});

it("a canceled subscriber rejects with its reason and leaves its peer successful; the last cancellation aborts work", async () => {
  const held = heldImage();
  vi.mocked(foilCoverageImage)
    .mockReturnValueOnce(held.image)
    .mockReturnValue(new Promise(() => {}));
  const caller = new AbortController(),
    a = take("cut", 240, caller.signal),
    b = take();
  const rejected = expect(a.coverage).rejects.toThrow("caller expired");
  caller.abort(new Error("caller expired"));
  await rejected;
  expect(vi.mocked(foilCoverageImage).mock.calls[0][4].aborted).toBe(false);
  held.arrive(value());
  await expect(b.coverage).resolves.toMatchObject({ width: 2 });
  const pending = take("other");
  const canceled = expect(pending.coverage).rejects.toThrow();
  pending.release();
  await canceled;
  expect(vi.mocked(foilCoverageImage).mock.calls[1][4].aborted).toBe(true);
});

it("rejects remaining work at the private deadline, and a later take retries", async () => {
  vi.useFakeTimers();
  vi.mocked(foilCoverageImage).mockReturnValueOnce(new Promise(() => {}));
  const waiting = take();
  const expired = expect(waiting.coverage).rejects.toThrow(
    `${FOIL_COVERAGE_TIMEOUT_MS / 1000} seconds`,
  );
  await vi.advanceTimersByTimeAsync(FOIL_COVERAGE_TIMEOUT_MS - 1);
  expect(vi.mocked(foilCoverageImage).mock.calls[0][4].aborted).toBe(false);
  await vi.advanceTimersByTimeAsync(1);
  await expired;
  expect(vi.mocked(foilCoverageImage).mock.calls[0][4].aborted).toBe(true);
  vi.mocked(foilCoverageImage).mockResolvedValue(value());
  await take().coverage;
  expect(foilCoverageImage).toHaveBeenCalledTimes(2);
});

it("a late canceled completion cannot replace or remove its successor", async () => {
  const late = heldImage();
  vi.mocked(foilCoverageImage).mockReturnValueOnce(late.image).mockResolvedValue(value());
  const old = take();
  const canceled = expect(old.coverage).rejects.toThrow();
  old.release();
  await canceled;
  const next = await take().coverage;
  late.arrive(value());
  await Promise.resolve();
  await Promise.resolve();
  expect(await take().coverage).toBe(next);
  expect(foilCoverageImage).toHaveBeenCalledTimes(2);
  expect(revoked).not.toHaveBeenCalled();
});
