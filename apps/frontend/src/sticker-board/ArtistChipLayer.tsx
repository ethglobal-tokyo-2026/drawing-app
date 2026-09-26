import { useEffect, useEffectEvent, useState } from "react";
import type { PersonView } from "../api/views";
import { ArtistChip } from "../stickers/ArtistChip";
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

/** The room a chip takes, for keeping chips off each other. */
const CHIP_W = 156;
const CHIP_H = 44;
/** How far a chip moves down, under one in its way. */
const DROP = 46;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/**
 * Where each chip goes, in greeting order, top to bottom: at its sticker's top-left corner, kept under
 * the header and clear of the board's right edge and foot, and under any chip already in its way.
 */
function placeChips(chips: Chip[], { W, H }: Props["board"]) {
  const placed: Array<{ left: number; top: number }> = [];
  const inTheWay = (left: number, top: number) =>
    placed.find(
      (q) =>
        left < q.left + CHIP_W &&
        q.left < left + CHIP_W &&
        top < q.top + CHIP_H &&
        q.top < top + CHIP_H,
    );
  return chips
    .toSorted((a, b) => a.box.y - a.box.h / 2 - (b.box.y - b.box.h / 2))
    .map((chip, i) => {
      const { x, y, w, h } = chip.box;
      const left = clamp(x - w / 2 - 10, 8, W - 200);
      let top = clamp(y - h / 2 - 20, 74, H - 150);
      // Each drop takes it past the chip in its way, so it settles once it's clear of them all.
      for (let hit = inTheWay(left, top); hit; hit = inTheWay(left, top)) top = hit.top + DROP;
      placed.push({ left, top });
      return { ...chip, left, top, i };
    });
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
