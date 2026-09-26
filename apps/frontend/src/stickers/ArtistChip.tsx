import type { PersonView } from "../api/views";
import { useTranslation } from "../i18n/react";
import { formatHandle } from "./format";
import "./artist-chip.css";

interface Props {
  /** The sticker's Original Artist. */
  artist: PersonView;
  /** "artist" puts a small ARTIST over the handle; "by" reads "By @alice" on one line, for tight rows. */
  variant?: "artist" | "by";
  /** Without its pill, for a toolbar that is the pill around it; it comes in as it shows. */
  bare?: boolean;
}

/**
 * Who drew a sticker someone else drew: their picture wearing the sticker's language, a white edge
 * inside a turning foil ring, then their handle.
 */
export function ArtistChip({ artist, variant = "artist", bare = false }: Props) {
  const { t } = useTranslation();
  // Until the handle prompt is answered, their LINE name stands in.
  const name = artist.handle === null ? artist.name : formatHandle(artist.handle);
  const classes = ["artist-chip", `artist-chip--${variant}`, bare && "artist-chip--bare"];
  return (
    <span
      className={classes.filter(Boolean).join(" ")}
      role="note"
      aria-label={t(($) => $.stickers.artistChip.label, { name })}
    >
      <span className="artist-chip__picture">
        {artist.pictureUrl ? (
          <img className="artist-chip__face" src={artist.pictureUrl} alt="" draggable={false} />
        ) : (
          <span className="artist-chip__face" />
        )}
      </span>
      <span className="artist-chip__text">
        <span className="artist-chip__caption">{t(($) => $.stickers.artistChip[variant])}</span>{" "}
        <span className="artist-chip__name">{name}</span>
      </span>
    </span>
  );
}
