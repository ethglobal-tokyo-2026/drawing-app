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
  /** Stickers that can't go to this recipient, such as an NSFW sticker for someone without the NSFW opt-in. */
  blocked?: (sticker: KeptSticker) => boolean;
}

/**
 * Your stickers as a grid to choose one from; the picked one sits on an aqua tile with a check. NSFW
 * stickers wear a pink edge; a blocked one can't be picked and wears the 18+ mark, as does one
 * blurred for you.
 */
export function StickerPicker({ stickers, picked, onPick, label, blocked = () => false }: Props) {
  const { t } = useTranslation();
  return (
    <div className="sticker-picker" role="radiogroup" aria-label={label}>
      {stickers.map((s) => {
        const off = blocked(s);
        const named = [
          off && t(($) => $.giving.nsfw.blocked),
          s.veiled && t(($) => $.stickers.nsfw.veiled),
        ].filter(Boolean);
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={picked === s.id}
            aria-disabled={off || undefined}
            aria-label={named.length > 0 ? [formatNo(s.no), ...named].join(", ") : undefined}
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
            {(off || s.veiled) && (
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
