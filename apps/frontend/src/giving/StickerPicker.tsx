import { Check } from "../icons";
import { useTranslation } from "../i18n/react";
import { formatNo } from "../stickers/format";
import { useMyNsfwOptIn, veiledFor } from "../stickers/nsfw";
import type { KeptSticker } from "../stickers/useKeptStickers";
import "../stickers/nsfw-img.css";
import "../stickers/nsfw-mark.css";
import "./give-sheet.css";

interface Props {
  stickers: KeptSticker[];
  picked: string | null;
  onPick: (id: string) => void;
  label: string;
  /** Stickers that can't go to this recipient, such as an NSFW sticker for someone opted out. */
  blocked?: (sticker: KeptSticker) => boolean;
}

/**
 * Your stickers as a grid to choose one from; the picked one sits on an aqua tile with a check. NSFW
 * stickers wear a pink edge, and the 18+ mark when they're blurred for you; a blocked one can't be
 * picked and wears the mark too.
 */
export function StickerPicker({ stickers, picked, onPick, label, blocked = () => false }: Props) {
  const { t } = useTranslation();
  const optedIn = useMyNsfwOptIn();
  return (
    <div className="sticker-picker" role="radiogroup" aria-label={label}>
      {stickers.map((s) => {
        const off = blocked(s);
        const veiled = veiledFor(s, optedIn);
        const why = off
          ? t(($) => $.giving.nsfw.blocked)
          : veiled && t(($) => $.stickers.nsfw.veiled);
        return (
          <button
            key={s.id}
            type="button"
            role="radio"
            aria-checked={picked === s.id}
            aria-disabled={off || undefined}
            aria-label={why ? `${formatNo(s.no)}, ${why}` : undefined}
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
            {(off || veiled) && (
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
