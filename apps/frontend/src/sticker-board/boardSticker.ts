import { listStickers, type Placement, type StickerRecord } from "../stickers/stickerStorage";
import { stickerUrls, type StickerUrls } from "../stickers/stickerUrls";
import { freeSpot, nextZ } from "./placement";

/** A stored sticker as the board holds it: with its images' URLs and a settled placement. */
export type BoardSticker = StickerRecord & { urls: StickerUrls; placement: Placement };

/**
 * Every sticker, oldest first, with URLs the caller releases. A sticker without a placement gets a
 * free spot on top of the others, which `keep` saves so it doesn't move when others do.
 */
export async function loadBoardStickers(
  keep: (sticker: StickerRecord, placement: Placement) => void,
): Promise<BoardSticker[]> {
  const records = (await listStickers()).reverse();
  const placements = records.flatMap((r) => (r.placement ? [r.placement] : []));
  return records.map((record) => {
    let placement = record.placement;
    if (!placement) {
      placement = {
        on: true,
        ...freeSpot(placements.filter((p) => p.on)),
        z: nextZ(placements),
      };
      placements.push(placement);
      keep(record, placement);
    }
    return { ...record, urls: stickerUrls(record), placement };
  });
}
