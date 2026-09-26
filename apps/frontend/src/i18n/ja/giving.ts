import type { Translation } from "../catalog";
import type { giving as english } from "../en/giving";

export const giving: Translation<typeof english> = {
  depositUnconfirmed:
    "シールの転送を確認できませんでした。LINEで送るをタップしてギフトの状態を再確認してください。",
  takeOutUnconfirmed:
    "シールを取り出せたか確認できませんでした。再試行する前にアプリでギフトの状態を確認してください。",
  giftMessage: { altText: "{{name}}からシールが届きました", open: "ギフトをひらく" },
};
