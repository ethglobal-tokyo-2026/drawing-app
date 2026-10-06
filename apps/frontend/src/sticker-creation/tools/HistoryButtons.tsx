import { ArrowClockwise, ArrowCounterClockwise } from "../../icons";
import type { Ref } from "react";
import { useTranslation } from "../../i18n/react";
import "./HistoryButtons.css";

interface Props {
  canUndo: boolean;
  canRedo: boolean;
  /** The undo tile: a clear sends focus to it, since it's the way back. */
  undoRef: Ref<HTMLButtonElement>;
  onUndo: () => void;
  onRedo: () => void;
}

/** Undo and redo: flat tiles at the bottom left, sunk while there's nothing to take back or bring back. */
export function HistoryButtons({ canUndo, canRedo, undoRef, onUndo, onRedo }: Props) {
  const { t } = useTranslation();
  return (
    <div className="history-buttons">
      <button
        ref={undoRef}
        type="button"
        className="history-tile"
        aria-label={t(($) => $.stickerCreation.history.undo)}
        disabled={!canUndo}
        onClick={onUndo}
      >
        <ArrowCounterClockwise size={22} />
      </button>
      <button
        type="button"
        className="history-tile"
        aria-label={t(($) => $.stickerCreation.history.redo)}
        disabled={!canRedo}
        onClick={onRedo}
      >
        <ArrowClockwise size={22} />
      </button>
    </div>
  );
}
