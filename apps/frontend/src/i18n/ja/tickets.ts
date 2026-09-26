import type { Translation } from "../catalog";
import type { tickets as english } from "../en/tickets";

export const tickets: Translation<typeof english> = {
  checkout: {
    title: "有償チケット",
    lead: "有償チケットに有効期限はありません。",
    balance: "JPYC残高",
    readingBalance: "残高を確認しています…",
    balanceProblem: "残高を確認できませんでした（{{reason}}）。",
    gettingPrices: "今日の価格を確認しています…",
    pricesProblem: "今日の価格を確認できませんでした：{{reason}}",
    packs: "チケットパック",
    pack_other: "チケット{{count}}枚",
    discount: "{{percent}}%オフ",
    was: "通常価格{{price}}",
    pay: "支払う",
    payPrice: "{{price}}を支払う",
    paying: "支払い中…",
    notEnoughJpyc: "JPYCが足りません",
    added_other: "有償チケットを{{count}}枚追加しました",
    paid: "JPYCで{{price}}を支払いました。",
    buyMore: "チケットをもっと買う",
    paymentFailed: "支払いが完了しませんでした",
    paidButNotAdded:
      "支払いは完了しました（{{digest}}）が、チケットは追加されませんでした：{{reason}}",
    backToPacks: "パック選びに戻る",
    walletBroken: "Suiアカウントが使えません（{{reason}}）。",
    walletSignInFailed: "支払いのためのサインインができませんでした（{{reason}}）。",
  },
};
