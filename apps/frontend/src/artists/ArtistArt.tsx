import { ART, type ArtKey } from "./art";
import "./artists.css";

export function ArtistArt({ art, className = "" }: { art: ArtKey; className?: string }) {
  return (
    <svg viewBox="0 0 100 100" className={`artist-art ${className}`} aria-hidden>
      {ART[art]}
    </svg>
  );
}
