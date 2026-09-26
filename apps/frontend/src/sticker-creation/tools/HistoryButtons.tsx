import { ArrowClockwise, ArrowCounterClockwise } from "@phosphor-icons/react";
import "./HistoryButtons.css";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
}

/** Undo and redo: flat tiles at the bottom left, sunk while there's nothing to take back or bring back. */
export function HistoryButtons({ canUndo, canRedo, onUndo, onRedo }: Props) {
  return (
    <div className="history-buttons">
      <button
        type="button"
        className="history-tile"
        aria-label="Undo"
        disabled={!canUndo}
        onClick={onUndo}
      >
        <ArrowCounterClockwise size={22} />
      </button>
      <button
        type="button"
        className="history-tile"
        aria-label="Redo"
        disabled={!canRedo}
        onClick={onRedo}
      >
        <ArrowClockwise size={22} />
      </button>
    </div>
  );
}
