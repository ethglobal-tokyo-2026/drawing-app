export const stickerBoard = {
  /** The developer slip: English only, so the Japanese catalog never translates it. */
  developer: {
    language: {
      title: "Language: {{language}}",
      line: "LINE's",
      english: "English",
      japanese: "日本語",
      notKept: "The choice couldn't be kept: {{reason}}",
    },
  },
  /** Beside the selected sticker on the board. */
  toolbar: {
    give: "Give",
    view: "View",
    remove: "Remove",
  },
} as const;
