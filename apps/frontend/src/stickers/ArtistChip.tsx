import type { PersonView } from "../api/views";
import { useTranslation } from "../i18n/react";
import { handleOf } from "./format";
import "./artist-chip.css";

interface Props {
  /** The sticker's Original Artist. */
  artist: PersonView;
  /** "artist" puts a small ARTIST over the handle; "by" reads "By @alice" on one line, for tight rows. */
  variant?: "artist" | "by";
  /** Without its pill, for a toolbar that is the pill around it; it comes in as it shows. */
  bare?: boolean;
  /** Without the foil ring, for surfaces that aren't a board, where foil never shows. */
  plain?: boolean;
  /** Its whole handle, running onto a second line rather than cut short, for a sheet with room. */
  wrap?: boolean;
}

// LINE names often start with an emoji; a grapheme keeps flags and joined emoji whole.
const graphemes = new Intl.Segmenter(undefined, { granularity: "grapheme" });

/**
 * Who drew a sticker someone else drew: their picture wearing the sticker's language, a white edge
 * inside a turning foil ring (just the white edge when plain), then their handle. Without a picture,
 * their LINE name's first letter stands in, as on a photo sticker.
 */
export function ArtistChip({
  artist,
  variant = "artist",
  bare = false,
  plain = false,
  wrap = plain,
}: Props) {
  const { t } = useTranslation();
  // Until the handle prompt is answered, their LINE name stands in.
  const name = handleOf(artist);
  const [initial] = graphemes.segment(artist.name.trim());
  const classes = [
    "artist-chip",
    `artist-chip--${variant}`,
    bare && "artist-chip--bare",
    plain && "artist-chip--plain",
    wrap && "artist-chip--wrap",
  ];
  return (
    <span
      className={classes.filter(Boolean).join(" ")}
      role="note"
      aria-label={t(($) => $.stickers.artistChip.label, { name })}
    >
      <span className="artist-chip__picture">
        {!plain && <span className="artist-chip__ring" aria-hidden="true" />}
        {artist.pictureUrl ? (
          <img className="artist-chip__face" src={artist.pictureUrl} alt="" draggable={false} />
        ) : (
          <span
            className="artist-chip__face artist-chip__letter"
            data-letter={initial?.segment.toUpperCase()}
            aria-hidden="true"
          />
        )}
      </span>
      <span className="artist-chip__text">
        <span className="artist-chip__caption">{t(($) => $.stickers.artistChip[variant])}</span>{" "}
        <span className="artist-chip__name">{name}</span>
      </span>
    </span>
  );
}
