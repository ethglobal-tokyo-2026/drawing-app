import { ArtistArt } from "./ArtistArt";
import type { ArtistAvatar } from "./demoArtists";

/** A demo artist's picture: their art on a round field in a white edge, standing in for a LINE photo. */
export function ArtistAvatarArt({
  avatar,
  className,
}: {
  avatar: ArtistAvatar;
  className: string;
}) {
  return (
    <span className={`artist-avatar ${className}`} style={{ background: avatar.bg }} aria-hidden>
      <ArtistArt art={avatar.art} />
    </span>
  );
}
