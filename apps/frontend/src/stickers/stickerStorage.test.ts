import { describe, expect, it } from "vitest";
import { readSticker } from "./stickerStorage";

const base = {
  id: "a",
  no: 1,
  createdAt: 1,
  timeUsed: 60,
  blob: new Blob(),
  width: 100,
  height: 80,
};
const placed = { on: true, x: 0.5, y: 0.5, s: 0.3, r: -4, z: 2 };

describe("readSticker", () => {
  it("reads stickers stored without a cut outline", () => {
    expect(readSticker(base)).toEqual(base);
  });

  it("reads a sticker's cut outline, and rejects one that isn't a path", () => {
    expect(readSticker({ ...base, outline: "M0 0L120 0L120 90Z" })?.outline).toBe(
      "M0 0L120 0L120 90Z",
    );
    expect(readSticker({ ...base, outline: 42 })).toBeUndefined();
  });

  it.each(["mask", "flat"] as const)(
    "reads a sticker's %s image, and rejects one that isn't an image",
    (field) => {
      expect(readSticker({ ...base, [field]: new Blob() })?.[field]).toBeInstanceOf(Blob);
      expect(readSticker({ ...base, [field]: "data:image/png;base64," })).toBeUndefined();
    },
  );

  it("keeps a placement in the board's model", () => {
    expect(readSticker({ ...base, placement: placed })?.placement).toEqual(placed);
  });

  it("keeps a sticker whose placement predates the model, without the placement", () => {
    const read = readSticker({
      ...base,
      rotation: 3,
      placement: { x: 0.5, y: 0.5, scale: 0.4, z: 1 },
    });
    expect(read?.id).toBe("a");
    expect(read?.placement).toBeUndefined();
  });

  it("takes the resin's masks as blobs and nothing else", () => {
    expect(
      readSticker({ ...base, resin: { spec: new Blob(), rim: new Blob() } })?.resin,
    ).toBeDefined();
    expect(readSticker({ ...base, resin: { spec: "data:", rim: new Blob() } })).toBeUndefined();
  });
});
