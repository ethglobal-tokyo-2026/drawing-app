import { useEffect, useState, type CSSProperties } from "react";
import { DrawIcon } from "../../icons/DrawIcon";
import { StickerBoardIcon } from "../../icons/StickerBoardIcon";
import { formatClock, formatDay, formatNo } from "../../stickers/format";
import type { StickerRecord } from "../../stickers/stickerStorage";
import type { StickerImages } from "./makeSticker";
import "../../styles/result-card.css";
import "./SealSequence.css";

/** cut → lift → dome → peel → done, with how long each step shows. */
const STEPS = [
  { stage: "cut", ms: 1400, label: "Cutting to shape" },
  { stage: "lift", ms: 500, label: "Cutting to shape" },
  { stage: "dome", ms: 1200, label: "Adding a clear dome" },
  { stage: "peel", ms: 900, label: "Sticking it to the board" },
  { stage: "done", ms: 0, label: "" },
] as const;
type Stage = (typeof STEPS)[number]["stage"];

interface Props {
  images: StickerImages;
  record: StickerRecord;
  ticketsLeft: number;
  onKeepDrawing: () => void;
  onBoard: () => void;
}

export function SealSequence({ images, record, ticketsLeft, onKeepDrawing, onBoard }: Props) {
  const [step, setStep] = useState(0);
  const { stage, label } = STEPS[step];

  useEffect(() => {
    const ms = STEPS[step].ms;
    if (!ms) return;
    const id = setTimeout(() => setStep((s) => s + 1), ms);
    return () => clearTimeout(id);
  }, [step]);

  const reached = (s: Stage) => STEPS.findIndex((x) => x.stage === s) <= step;
  const shape: CSSProperties = { "--shape": `url(${images.cutUrl})` };
  const aspect = images.width / images.height;

  return (
    <div className={`seal-seq stage-${stage}`}>
      <div
        className="sticker-stage"
        style={{
          aspectRatio: `${images.width} / ${images.height}`,
          width: `min(84%, ${(52 * aspect).toFixed(2)}cqh)`,
        }}
      >
        <div className="backing" style={shape} />
        <div className="sticker-lift">
          <img className="layer ink" src={images.inkUrl} alt="" draggable={false} />
          <img className="layer cut" src={images.cutUrl} alt="" draggable={false} />
          <img className="layer dome" src={images.domeUrl} alt="Your sticker" draggable={false} />
          <div className="layer sheen" style={shape} />
        </div>
        {!reached("dome") && (
          <svg className="cut-line" viewBox={`0 0 ${images.width} ${images.height}`} aria-hidden>
            <path d={images.outline} className="cut-guide" />
            <path d={images.outline} className="cut-trace" pathLength={1} />
          </svg>
        )}
      </div>
      {label && <div className="seal-caption">{label}…</div>}

      {stage === "done" && (
        <div className="result-backdrop">
          <div className="result-card" role="dialog" aria-label="Sticker sealed">
            <img
              className="result-sticker"
              src={images.domeUrl}
              alt="Your sticker"
              style={{ rotate: `${record.rotation}deg` }}
            />
            <h2>Sealed</h2>
            <div className="result-meta">
              {formatNo(record.no)} · {formatClock(record.timeUsed)} · {formatDay(record.createdAt)}
            </div>
            <div className="tickets-left">
              {ticketsLeft === 0
                ? "No tickets left today"
                : `${ticketsLeft} ticket${ticketsLeft === 1 ? "" : "s"} left`}
            </div>
            <div className="perforation" />
            <button className="keep-btn" onClick={onKeepDrawing}>
              <DrawIcon /> Keep drawing
            </button>
            <button className="board-btn" onClick={onBoard}>
              <StickerBoardIcon size={18} /> Go to sticker board
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
