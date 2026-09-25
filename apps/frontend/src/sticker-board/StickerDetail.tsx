import { useState } from "react";
import { Label, QuietLink } from "../controls/controls";
import { formatClock, formatDay, formatNo } from "../stickers/format";
import { deleteSticker } from "../stickers/stickerStorage";
import type { BoardSticker } from "./boardSticker";
import "../styles/result-card.css";

interface Props {
  sticker: BoardSticker;
  onClose: () => void;
  onPeeledOff: (id: string) => void;
}

export function StickerDetail({ sticker, onClose, onPeeledOff }: Props) {
  const download = () => {
    const a = document.createElement("a");
    a.href = sticker.url;
    a.download = `sticker-${String(sticker.no).padStart(4, "0")}.png`;
    a.click();
  };

  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const peelOff = async () => {
    try {
      await deleteSticker(sticker.id);
      onPeeledOff(sticker.id);
    } catch (e) {
      console.error(`Peeling off ${formatNo(sticker.no)} failed`, e);
      setError(
        `Couldn’t peel off ${formatNo(sticker.no)}: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  };

  return (
    <div className="result-backdrop" onClick={onClose}>
      <div
        className="result-card"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={formatNo(sticker.no)}
      >
        <img
          className="result-sticker"
          src={sticker.url}
          alt=""
          style={{ rotate: `${sticker.rotation}deg` }}
        />
        <h2>{formatNo(sticker.no)}</h2>
        <div className="result-meta fine">
          Drawn in {formatClock(sticker.timeUsed)} · {formatDay(sticker.createdAt)}
        </div>
        <div className="perforation" />
        {confirming ? (
          <>
            <p className="peel-confirm">Peel off {formatNo(sticker.no)}? This can’t be undone.</p>
            {error && (
              <p className="peel-error" role="alert">
                {error}
              </p>
            )}
            <div className="detail-actions">
              <Label hue="tomato" onPress={() => void peelOff()}>
                Peel off for good
              </Label>
            </div>
            <QuietLink
              onPress={() => {
                setConfirming(false);
                setError(null);
              }}
            >
              Keep it
            </QuietLink>
          </>
        ) : (
          <>
            <div className="detail-actions">
              <Label onPress={download}>Download</Label>
              <Label hue="tomato" onPress={() => setConfirming(true)}>
                Peel off
              </Label>
            </div>
            <QuietLink onPress={onClose}>Close</QuietLink>
          </>
        )}
      </div>
    </div>
  );
}
