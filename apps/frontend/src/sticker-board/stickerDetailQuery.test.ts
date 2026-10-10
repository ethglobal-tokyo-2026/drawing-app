import type { StickerDetail } from "@drawing-app/api/client";
import { describe, expect, it, vi } from "vitest";
import { people, sticker as apiSticker } from "../api/testFixtures";
import { emptyApi } from "../api/testing";
import { testStickerUrls } from "../stickers/testStickerUrls";
import type { BoardStickerView } from "./boardSticker";
import { detailsAhead, MAX_DETAILS_AHEAD, preloadStickerDetails } from "./stickerDetailQuery";
import { testBoardSticker } from "./testBoardSticker";

/** A sticker of yours at height `z`, on the board or in the sticker tray. */
const boardSticker = (z: number, on = true): BoardStickerView =>
  testBoardSticker({
    id: `s-${z}`,
    no: z,
    urls: testStickerUrls(`blob:${z}`),
    placement: { on, x: 0.5, y: 0.5, s: 0.3, r: 0, z },
  });

describe("sticker details read ahead", () => {
  it("are the topmost stickers on the board, up to the cap, read one at a time", async () => {
    const onBoard = Array.from({ length: MAX_DETAILS_AHEAD + 4 }, (_, z) => boardSticker(z));
    const inTray = boardSticker(MAX_DETAILS_AHEAD + 10, false);
    const ahead = detailsAhead([...onBoard, inTray]);
    const ids = ahead.map((s) => s.id);
    expect(ids).toEqual(
      onBoard
        .toReversed()
        .slice(0, MAX_DETAILS_AHEAD)
        .map((s) => s.id),
    );

    const answers: (() => void)[] = [];
    const stickerDetail = vi.fn(
      (id: string) =>
        new Promise<StickerDetail>((resolve) =>
          answers.push(() =>
            resolve({ sticker: apiSticker({ id }), owner: people.ken, transferTrail: [] }),
          ),
        ),
    );
    preloadStickerDetails(emptyApi({ stickerDetail }), ahead);
    for (let read = 1; read <= ids.length; read += 1) {
      await Promise.resolve();
      expect(stickerDetail).toHaveBeenCalledTimes(read);
      answers[read - 1]?.();
      await new Promise((resolve) => setTimeout(resolve, 0));
    }
    expect(stickerDetail.mock.calls.map(([id]) => id)).toEqual(ids);
  });
});
