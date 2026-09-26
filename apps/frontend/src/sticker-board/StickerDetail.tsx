import { Gift } from "@phosphor-icons/react";
import { useState } from "react";
import { Giving } from "../giving/Giving";
import { useGiftSender } from "../giving/useGiftSender";
import { useIdentity } from "../identity/useIdentity";
import { LIFF_ID } from "../line/liff";
import { formatClock, formatDay, formatNo } from "../stickers/format";
import { deleteSticker } from "../stickers/stickerStorage";
import { LabelButton } from "../ui/LabelButton";
import type { BoardSticker } from "./boardSticker";
import "../styles/result-card.css";

interface Props {
  sticker: BoardSticker;
  onClose: () => void;
  onPeeledOff: (id: string) => void;
}

export function StickerDetail({ sticker, onClose, onPeeledOff }: Props) {
  const giftSender = useGiftSender();
  const me = useIdentity();
  const [giving, setGiving] = useState(false);

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

  if (giving && giftSender) {
    return (
      <Giving
        sticker={sticker}
        fromHandle={me.handle}
        sender={giftSender}
        liffId={LIFF_ID}
        onClose={(sent) => (sent ? onClose() : setGiving(false))}
      />
    );
  }

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
        {giftSender && (
          <LabelButton tone="aqua" block icon={<Gift />} onClick={() => setGiving(true)}>
            Give
          </LabelButton>
        )}
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
