import type { StickerBoard } from "@drawing-app/api/client";
import { QueryAnswers, useApiQuery, type Query } from "../api/useApiQuery";
import { noteBootMilestone } from "../performance/bootMilestones";

const answers = new QueryAnswers<StickerBoard>();
/** Whose board the last load answered with, so an answer kept for another account can go. */
let answeredFor: string | null = null;
const changes = new Set<() => void>();

/** For a sticker gone into a gift: the answers kept from before list it, so the give sheet would offer it. */
export const forgetMyStickerBoard = (): void => answers.forget();

/**
 * Forgets the answers kept for another account, so whoever signs in next on this tab never sees that
 * account's board.
 */
export function forgetMyStickerBoardUnlessFor(userId: string): void {
  if (answeredFor === null || answeredFor === userId) return;
  answeredFor = null;
  answers.forget();
}

/**
 * Your board changed on the server behind the board on screen, as when a Gift Message's send is
 * reported late: the kept answers go, and the board on screen loads again.
 */
export function myStickerBoardChanged(): void {
  answers.forget();
  for (const changed of [...changes]) changed();
}

/** Calls `changed` whenever myStickerBoardChanged runs; returns how to stop. */
export function onMyStickerBoardChanged(changed: () => void): () => void {
  changes.add(changed);
  return () => changes.delete(changed);
}

/**
 * Your sticker board as the server has it. The board, the Shop's previews and the give sheet share
 * one answer, so each shows the last one at once while it loads again, but for the board with
 * `ownLoadOnly`, which draws the phone's board until a load of its own lands.
 */
export const useMyStickerBoard = ({ ownLoadOnly = false } = {}): Query<StickerBoard> =>
  useApiQuery(
    "sticker-board/me",
    async (api) => {
      const board = await api.stickerBoard();
      answeredFor = board.owner.id;
      noteBootMilestone("board JSON", `${board.boardStickers.length} stickers`);
      return board;
    },
    answers,
    { ownLoadOnly },
  );
