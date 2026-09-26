import type { Translation } from "../catalog";
import type { api as english } from "../en/api";

export const api: Translation<typeof english> = {
  signIn: {
    opening: "ステッカーボードを開いています…",
    failed: "ログインできませんでした",
    tryAgain: "もう一度試す",
    reconnect: "LINEで再ログイン",
    reconnecting: "LINEで再ログインしています…",
  },
};
