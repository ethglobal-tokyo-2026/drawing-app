import { Check } from "@phosphor-icons/react";
import { formatNo } from "../stickers/format";
import type { KeptSticker } from "../stickers/useKeptStickers";
import "./give-sheet.css";

interface Props {
  stickers: KeptSticker[];
  picked: string | null;
  onPick: (id: string) => void;
  label: string;
  /** Smaller tiles, for picking inside a sheet that already has other choices. */
  compact?: boolean;
}

/** Your stickers as a grid to choose one from; the picked one sits on an aqua tile with a check. */
export function StickerPicker({ stickers, picked, onPick, label, compact = false }: Props) {
  return (
    <div
      className={`sticker-picker ${compact ? "compact" : ""}`}
      role="radiogroup"
      aria-label={label}
    >
      {stickers.map((s) => (
        <button
          key={s.id}
          type="button"
          role="radio"
          aria-checked={picked === s.id}
          className={`pick ${picked === s.id ? "picked" : ""}`}
          onClick={() => onPick(s.id)}
        >
          <img src={s.url} alt="" style={{ aspectRatio: `${s.width} / ${s.height}` }} />
          <span className="fine">{formatNo(s.no)}</span>
          {picked === s.id && (
            <span className="pick-check" aria-hidden>
              <Check size={12} />
            </span>
          )}
        </button>
      ))}
    </div>
  );
}
