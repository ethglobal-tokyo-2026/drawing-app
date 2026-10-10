import type { TransferTrailEntry } from "@drawing-app/api/client";
import { toMs, toPerson, type PersonView } from "../api/views";
import { formatCount } from "../i18n/format";
import { i18next } from "../i18n/i18n";
import { handleOf } from "./boardSticker";

/** One hand-off on a sticker's Transfer Trail, as its detail shows it. */
export interface TrailRow {
  giftId: string;
  giver: PersonView;
  receiver: PersonView;
  receivedAt: number;
  /** The receiver's gratitude to the giver; null until it's sent. */
  gratitude: {
    total: number;
    /** The Original Artist Gratitude Share, out of the giver's part. */
    artistShare: number;
    /** When the giver watched its replay, ms; null until then. */
    seenByGiverAt: number | null;
  } | null;
}

/** The rows shown before the rest fold into "N earlier gifts": the newest gift. */
export const TRAIL_SHOWN = 1;

export const toTrailRows = (trail: readonly TransferTrailEntry[]): TrailRow[] =>
  trail.map((e) => ({
    giftId: e.giftId,
    giver: toPerson(e.giver),
    receiver: toPerson(e.receiver),
    receivedAt: toMs(e.receivedAt),
    gratitude: e.gratitude && {
      total: e.gratitude.total,
      artistShare: e.gratitude.originalArtistGratitudeShare,
      seenByGiverAt: e.gratitude.seenByGiverAt === null ? null : toMs(e.gratitude.seenByGiverAt),
    },
  }));

/**
 * The row open by default: the most recent gratitude. None while you still owe gratitude for the
 * newest gift, since Send gratitude is then the screen's call.
 */
export function defaultOpenRow(rows: readonly TrailRow[], viewerId: string): string | null {
  const newest = rows[0];
  if (newest && newest.receiver.id === viewerId && !newest.gratitude) return null;
  return rows.find((r) => r.gratitude)?.giftId ?? null;
}

/**
 * The open row's line for the Original Artist Gratitude Share, when there is one: "2,357 to @ken ·
 * 590 to @mika, its artist", or "590 of it came to you, its artist". Never money words. The server
 * shares none when the Original Artist gave or received the gift.
 */
export function artistShareLine(
  row: TrailRow,
  artist: PersonView,
  viewerId: string,
): string | null {
  const g = row.gratitude;
  if (!g || g.artistShare <= 0) return null;
  const share = formatCount(g.artistShare);
  if (artist.id === viewerId)
    return i18next.t(($) => $.stickerBoard.transferTrail.artistShare.youDrewIt, { share });
  const split = { kept: formatCount(g.total - g.artistShare), share, artist: handleOf(artist) };
  return row.giver.id === viewerId
    ? i18next.t(($) => $.stickerBoard.transferTrail.artistShare.youGaveIt, split)
    : i18next.t(($) => $.stickerBoard.transferTrail.artistShare.between, {
        ...split,
        giver: handleOf(row.giver),
      });
}
