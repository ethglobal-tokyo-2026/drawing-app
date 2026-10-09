import { useTranslation } from "../../i18n/react";
import { StickerBoardIcon } from "../../icons";
import "./foot-tile.css";
import "./MyBoardTile.css";

interface Props {
  onOpen: () => void;
}

/**
 * My board: a flat tile in the foot row after redo, and the only way back to the board mid-sheet,
 * since LINE's ✕ closes the whole app. The board covers the drawing screen, whose clock holds.
 */
export function MyBoardTile({ onOpen }: Props) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className="foot-tile my-board-tile"
      aria-label={t(($) => $.stickerCreation.myBoard)}
      onClick={onOpen}
    >
      <StickerBoardIcon size={22} />
    </button>
  );
}
