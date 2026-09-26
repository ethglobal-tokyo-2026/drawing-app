import type { Translation } from "../catalog";
import type { errors as english } from "../en/errors";

export const errors: Translation<typeof english> = {
  no_line_token: "LINEのログイン情報を取得できませんでした。LINEで再ログインしてください。",
  line_reconnect_failed:
    "LINEで再ログインできませんでした。もう一度試すか、LINEからアプリを開き直してください。",
  line_token_invalid:
    "LINEがログイン情報を確認できませんでした。再ログインしても続く場合は、チームにお問い合わせください。",
  line_token_expired: "LINEのログイン情報の有効期限が切れました。LINEで再ログインしてください。",
  sticker_not_found: "このシールは見つかりませんでした。",
  ens_not_configured: "このサーバーでは、まだ名前が使えません。",
  unknown_resolver: "この名前は別のアプリのものです。",
  unsupported_request: "この名前の問い合わせには答えられません。",
  payment_not_found: "この支払いはチケットショップに届いていません。",
  payment_not_yours: "この支払いは別の人のチケットのものです。",
  sui_unavailable:
    "Suiから応答がありません。チケットはまだ追加されていません。もう一度お試しください。",
};
