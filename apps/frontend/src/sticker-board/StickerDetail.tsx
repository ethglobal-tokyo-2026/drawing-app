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

  const peelOff = async () => {
    if (!confirm(`Peel off ${formatNo(sticker.no)}? This can’t be undone.`)) return;
    await deleteSticker(sticker.id);
    onPeeledOff(sticker.id);
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
        <div className="result-meta">
          Drawn in {formatClock(sticker.timeUsed)} · {formatDay(sticker.createdAt)}
        </div>
        <div className="perforation" />
        <div className="detail-actions">
          <button className="board-btn" onClick={download}>
            Download
          </button>
          <button className="board-btn danger" onClick={peelOff}>
            Peel off
          </button>
        </div>
        <button className="board-btn" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
}
