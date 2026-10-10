import { useEffect, useEffectEvent, useState } from "react";
import type { PersonView } from "../api/views";
import { ArtistChip } from "../stickers/ArtistChip";
import { placeChips } from "./chipPlacement";
import "./artist-chip-layer.css";

interface Chip {
  /** The sticker's ID. */
  id: string;
  artist: PersonView;
  /** The sticker's center and size on the board, in board pixels. */
  box: { x: number; y: number; w: number; h: number };
}

interface Props {
  chips: Chip[];
  board: { W: number; H: number };
  /** Every chip has faded and gone. */
  onDone: () => void;
  reduced: boolean;
}

/**
 * The artists of the board's foil stickers, named as it opens: each chip at its sticker's corner,
 * greeting in turn, then fading, over every sticker and letting the pointer through. The board takes
 * it away when a sticker is selected.
 */
export function ArtistChipLayer({ chips, board, onDone, reduced }: Props) {
  const [gone, setGone] = useState<ReadonlySet<string>>(() => new Set());
  // Placed with the gone ones still counted, so a chip never jumps when one above it goes.
  const shown = placeChips(chips, board).filter((c) => !gone.has(c.id));

  const allGone = shown.length === 0;
  const done = useEffectEvent(onDone);
  useEffect(() => {
    if (allGone) done();
  }, [allGone]);

  return (
    <div className={`artist-chip-layer${reduced ? " is-reduced" : ""}`} aria-hidden="true">
      {shown.map((c) => (
        <span
          key={c.id}
          className="artist-chip-layer__chip"
          style={{ left: c.left, top: c.top, "--i": c.i }}
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget) setGone((was) => new Set(was).add(c.id));
          }}
        >
          <ArtistChip artist={c.artist} />
        </span>
      ))}
    </div>
  );
}
