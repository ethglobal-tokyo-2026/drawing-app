import type { Translation } from "../catalog";
import type { stickerBoard as english } from "../en/stickerBoard";

export const stickerBoard: Translation<typeof english> = {
  ensName: {
    open: "{{name}} を ENS アプリで開く",
  },
};
