import type { StickerBoard } from "@drawing-app/api/client";
import { QueryAnswers, useApiQuery, type Query } from "../api/useApiQuery";
import { noteBootMilestone } from "../performance/bootMilestones";

const answers = new QueryAnswers<StickerBoard>();

/** For a sticker gone into a gift: the answers kept from before list it, so the give sheet would offer it. */
export const forgetMyStickerBoard = (): void => answers.forget();

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
      noteBootMilestone("board JSON", `${board.boardStickers.length} stickers`);
      return board;
    },
    answers,
    { ownLoadOnly },
  );
