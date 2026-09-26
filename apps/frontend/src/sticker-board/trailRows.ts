import type { TransferTrailEntry } from "@drawing-app/api/client";
import { toMs, toPerson, type PersonView } from "../api/views";
import { formatCount } from "../i18n/format";

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

/** How someone reads on the trail: "you" for the viewer, their handle for anyone else. */
export const trailName = (p: PersonView, viewerId: string) =>
  p.id === viewerId ? "you" : p.handle ? `@${p.handle.replace(/^@+/, "")}` : p.name;

/**
 * The open row's line for the Original Artist Gratitude Share, when the giver isn't the artist:
 * "2,357 to @ken · 590 to @mika, its artist", or "590 of it came to you, its artist". Never money
 * words.
 */
export function artistShareLine(
  row: TrailRow,
  artist: PersonView,
  viewerId: string,
): string | null {
  const g = row.gratitude;
  if (!g || g.artistShare <= 0 || row.giver.id === artist.id) return null;
  if (artist.id === viewerId) return `${formatCount(g.artistShare)} of it came to you, its artist`;
  const kept = formatCount(g.total - g.artistShare);
  const giverPart =
    row.giver.id === viewerId
      ? `${kept} came to you`
      : `${kept} to ${trailName(row.giver, viewerId)}`;
  return `${giverPart} · ${formatCount(g.artistShare)} to ${trailName(artist, viewerId)}, its artist`;
}
