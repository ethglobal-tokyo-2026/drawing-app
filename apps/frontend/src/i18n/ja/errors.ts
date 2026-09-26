import type { Translation } from "../catalog";
import type { errors as english } from "../en/errors";

export const errors: Translation<typeof english> = {
  sticker_not_found: "このシールは見つかりませんでした。",
  ens_not_configured: "このサーバーでは、まだ名前が使えません。",
  unknown_resolver: "この名前は別のアプリのものです。",
  unsupported_request: "この名前の問い合わせには答えられません。",
  payment_not_found: "この支払いはチケットショップに届いていません。",
  payment_not_yours: "この支払いは別の人のチケットのものです。",
  sui_unavailable:
    "Suiから応答がありません。チケットはまだ追加されていません。もう一度お試しください。",
  line_unavailable: "LINEから応答がありません。トークのメニューはまだ変わっていません。",
};
