import { Check } from "../icons";
import { useTranslation } from "../i18n/react";
import { formatNo } from "../stickers/format";
import type { KeptSticker } from "../stickers/useKeptStickers";
import "../stickers/nsfw-img.css";
import "../stickers/nsfw-mark.css";
import "./give-sheet.css";

interface Props {
  stickers: KeptSticker[];
  picked: string | null;
  onPick: (id: string) => void;
  label: string;
  /** Smaller tiles, for picking inside a sheet that already has other choices. */
  compact?: boolean;
  /** Stickers that can't go to this recipient, such as an NSFW sticker for someone not adult. */
  blocked?: (sticker: KeptSticker) => boolean;
}

/**
 * Your stickers as a grid to choose one from; the picked one sits on an aqua tile with a check. NSFW
 * stickers wear a pink edge; a blocked one can't be picked and wears the 18+ mark.
 */
export function StickerPicker({
  stickers,
  picked,
  onPick,
  label,
  compact = false,
  blocked = () => false,
}: Props) {
  const { t } = useTranslation();
  return (
    <div
      className={`sticker-picker ${compact ? "compact" : ""}`}
      role="radiogroup"
      aria-label={label}
    >
      {stickers.map((s) => {
        const off = blocked(s);
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={picked === s.id}
            aria-disabled={off || undefined}
            aria-label={off ? `${formatNo(s.no)}, ${t(($) => $.giving.nsfw.blocked)}` : undefined}
            className={`pick ${picked === s.id ? "picked" : ""} ${off ? "is-blocked" : ""}`}
            onClick={() => {
              if (!off) onPick(s.id);
            }}
          >
            <img
              src={s.url}
              alt=""
              className={s.nsfw ? "nsfw-img" : undefined}
              style={{ aspectRatio: `${s.width} / ${s.height}` }}
            />
            <span className="fine">{formatNo(s.no)}</span>
            {off && (
              <span className="nsfw-mark pick-mark" aria-hidden>
                {t(($) => $.stickers.nsfw.mark)}
              </span>
            )}
            {picked === s.id && (
              <span className="pick-check" aria-hidden>
                <Check size={12} />
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
