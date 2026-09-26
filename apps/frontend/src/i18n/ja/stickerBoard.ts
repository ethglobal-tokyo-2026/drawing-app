import type { Translation } from "../catalog";
import type { stickerBoard as english } from "../en/stickerBoard";

export const stickerBoard: Translation<typeof english> = {
  board: {
    loading: "ステッカーを読み込んでいます",
  },
  ensName: {
    open: "{{name}} を ENS アプリで開く",
  },
  settings: {
    title: "設定",
    language: {
      title: "言語",
      sameAsLine: "LINEと同じ（{{language}}）",
      names: { en: "English", ja: "日本語" },
      saving: "保存しています…",
      notSaved: "言語を保存できなかったため、変更していません：{{reason}}",
      notKept:
        "言語は保存しましたが、この端末に記録できませんでした（{{reason}}）。次にアプリをひらいたときに切り替わります。",
    },
  },
};
