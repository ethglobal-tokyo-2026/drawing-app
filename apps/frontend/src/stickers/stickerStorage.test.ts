import { describe, expect, it } from "vitest";
import { isStickerRecord } from "./stickerStorage";

const stored = {
  id: "a1",
  no: 1,
  createdAt: 0,
  timeUsed: 60,
  blob: new Blob(),
  width: 120,
  height: 90,
  rotation: -3,
};

describe("isStickerRecord", () => {
  it("reads stickers stored without a cut outline", () => {
    expect(isStickerRecord(stored)).toBe(true);
  });

  it("reads a sticker's cut outline, and rejects one that isn't a path", () => {
    expect(isStickerRecord({ ...stored, outline: "M0 0L120 0L120 90Z" })).toBe(true);
    expect(isStickerRecord({ ...stored, outline: 42 })).toBe(false);
  });
});
