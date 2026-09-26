import type { Translation } from "../catalog";
import type { errors as english } from "../en/errors";

export const errors: Translation<typeof english> = {
  sticker_not_found: "このシールは見つかりませんでした。",
  ens_not_configured: "このサーバーでは、まだ名前が使えません。",
  unknown_resolver: "この名前は別のアプリのものです。",
  unsupported_request: "この名前の問い合わせには答えられません。",
};
