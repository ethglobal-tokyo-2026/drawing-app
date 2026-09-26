import { useTranslation } from "../i18n/react";
import { Skeleton } from "../ui/Skeleton";

/** Where the placeholder stickers sit, as shares of the board, turned as a hand would stick them. */
const SPOTS = [
  { x: 30, y: 34, size: 118, turn: -6 },
  { x: 70, y: 30, size: 96, turn: 5 },
  { x: 38, y: 63, size: 104, turn: 4 },
  { x: 71, y: 62, size: 86, turn: -4 },
];

/** Faint sticker shapes on the board while its stickers load, where stickers usually sit. */
export function BoardLoading() {
  const { t } = useTranslation();
  return (
    <>
      <p className="visually-hidden" role="status">
        {t(($) => $.stickerBoard.board.loading)}
      </p>
      {SPOTS.map((spot) => (
        <Skeleton
          key={`${spot.x}-${spot.y}`}
          className="board-loading-sticker"
          width={spot.size}
          height={spot.size}
          style={{ left: `${spot.x}%`, top: `${spot.y}%`, rotate: `${spot.turn}deg` }}
        />
      ))}
    </>
  );
}
