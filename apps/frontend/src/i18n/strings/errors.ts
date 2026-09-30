import type { ErrorCode } from "../../api/apiClient";
import type { Leaf } from "../catalog";

/** One message per error code, for people; the server's `detail` stays English, for developers. */
export const errors = {
  /** Any screen that shows a failed request through errorMessage/errorReason, when the server answers a code this catalog lacks (such as route_not_found); {{code}} is that code */
  unknown: {
    en: "Something went wrong ({{code}}). Try again. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "問題が発生しました（{{code}}）。もう一度お試しください。続く場合は、LINEのクロッキー公式アカウントにお知らせください。",
  },
  /** Any screen, when a request gets no answer (offline, or it failed before a reply): shown through errorMessage/errorReason by the screen that made it */
  network: {
    en: "Couldn’t connect. Check your connection, then try again.",
    ja: "つながりませんでした。接続を確認して、もう一度お試しください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: LINE is logged in but hands over no ID token to sign in to the app's server with (made by the app itself, shown through errorMessage) */
  no_line_token: {
    en: "LINE didn’t sign you in. Reconnect with LINE to try again.",
    ja: "LINEのログイン情報を取得できませんでした。LINEで再ログインしてください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: tapping it couldn't restart LINE Login (made by the app itself, shown through errorMessage) */
  line_reconnect_failed: {
    en: "Couldn’t reconnect with LINE. Try again, or reopen the app from LINE.",
    ja: "LINEで再ログインできませんでした。もう一度試すか、LINEからアプリをひらき直してください。",
  },
  /** Drawing screen, Giving and Receiving: sealing an 18+ sticker (POST /api/stickers) when you aren't a verified adult, giving one from a board (POST /api/gifts) to someone who isn't, or receiving one (POST /api/gifts/receive) when you aren't; in the seal chip, “couldn’t be packed” or the gift's refusal, through errorMessage/errorReason */
  adults_only: {
    en: "Only adults verified with World ID can seal, give or receive 18+ stickers.",
    ja: "18+のシールは、World IDで年齢確認した成人だけが仕上げたり、贈ったり、受け取ったりできます。",
  },
  /** Your stat board, Age verification paper: sending World App's proof (POST /api/me/age-verification) when it isn't an Orb-verified World ID's, or came from World's other environment, in “Your age couldn’t be verified” through errorReason */
  age_not_proven: {
    en: "This World ID isn’t verified at an Orb.",
    ja: "このWorld IDは、Orbで認証されていません。",
  },
  /** Your stat board, Age verification paper: tapping Verify your age (POST /api/me/age-verification/request) when this server has no World ID app, in “Your age couldn’t be verified” through errorReason */
  age_verification_not_configured: {
    en: "Age verification isn’t available yet.",
    ja: "年齢確認は、まだ利用できません。",
  },
  /** Your stat board, Age verification paper: sending World App's proof (POST /api/me/age-verification) when World refuses it, in “Your age couldn’t be verified” through errorReason */
  age_verification_refused: {
    en: "World ID didn’t accept the proof.",
    ja: "World IDが証明を受け付けませんでした。",
  },
  /** Your stat board, Age verification paper: sending World App's proof (POST /api/me/age-verification) when the same World ID already verified another account, in “Your age couldn’t be verified” through errorReason */
  age_verification_used: {
    en: "This World ID already verified another account.",
    ja: "このWorld IDは、すでに別のアカウントの年齢確認に使われています。",
  },
  /** Your stat board, Age verification paper: tapping Verify your age (POST /api/me/age-verification/request) after your age was already verified, in “Your age couldn’t be verified” through errorReason */
  already_age_verified: {
    en: "Your age is already verified.",
    ja: "年齢確認は、すでに済んでいます。",
  },
  /** Giving, In the bag: taking a gift back out (POST /api/gifts/:giftId/take-out) that its receiver already received, in “couldn’t be taken out” through errorReason; the Receive gift dialog shows its own Already opened screen instead */
  already_received: {
    en: "This gift was already opened.",
    ja: "このギフトは、すでにひらかれています。",
  },
  /** Giving and Receiving: opening a gift's link, Accept, taking a gift out, or the deposit's check after Send, when the chain can't be read, through errorMessage or errorReason */
  chain_unavailable: {
    en: "Couldn’t check on the gift just now. Try again in a moment.",
    ja: "ギフトの状態をいま確認できません。少し待ってから、もう一度お試しください。",
  },
  /** Receive gift dialog, Accept sheet: tapping Accept (POST /api/gifts/receive, or /:giftId/receive from the board) when the chain fails or doesn't confirm the sticker's claim in time, in “… wasn’t received” through errorReason */
  claim_failed: {
    en: "It couldn’t be confirmed in time. Trying again is safe: a gift is only ever received once.",
    ja: "時間内に確認できませんでした。受け取りは一度きりなので、やり直しても大丈夫です。",
  },
  /** Not shown in the app: the ENS gateway's answer to an outside ENS app looking up a croquis.eth name, when this server has no ENS set up */
  ens_not_configured: {
    en: "Names aren’t set up on this server yet.",
    ja: "このサーバーでは、まだ名前が使えません。",
  },
  /** Giving, In the bag: packing a sticker when the escrow's deposit (POST /api/gifts/:giftId/deposit) isn't this sticker's, so the gift closed and the sticker can be given again, in “couldn’t be packed” through errorReason */
  deposit_mismatch: {
    en: "The gift bag didn’t get your sticker. Give it again.",
    ja: "ギフト袋にシールが入りませんでした。もう一度贈ってください。",
  },
  /** Giving, In the bag: packing a sticker when the escrow holds it under terms packaging didn't issue (POST /api/gifts/:giftId/deposit), so only taking it out frees it, in “couldn’t be packed” through errorReason */
  deposit_held: {
    en: "Your sticker went into the gift bag the wrong way. Take it out, then give it again.",
    ja: "シールが正しくギフト袋に入りませんでした。取り出してから、もう一度贈ってください。",
  },
  /** Giving, In the bag: packing a sticker when the escrow still has no deposit after the app's retries (POST /api/gifts/:giftId/deposit), in “couldn’t be packed” through errorReason */
  deposit_not_landed: {
    en: "Your sticker hasn’t reached the gift bag yet. Wait a moment, then tap Send in LINE to check again.",
    ja: "シールがまだギフト袋に届いていません。少し待ってから、「LINEで送る」をタップして、もう一度確認してください。",
  },
  /** Giving, In the bag: recording LINE's picker outcome (POST /api/gifts/:giftId/shared) for a gift that's no longer packed or sent, or taking out a gift already returned, in “couldn’t record” or “couldn’t be taken out” through errorReason */
  gift_closed: {
    en: "This gift is already closed. Go back to your board, and if your sticker is there, give it again.",
    ja: "このギフトはすでに閉じられています。ボードに戻って、シールがあればもう一度贈ってください。",
  },
  /** Giving, In the bag: packing a sticker (POST /api/gifts) that an earlier gift still holds in the escrow until it's taken out, in “couldn’t be packed” through errorReason */
  gift_held: {
    en: "This sticker is still in an earlier gift bag. Take it out, then give it again.",
    ja: "このシールは、前のギフト袋に入ったままです。取り出してから、もう一度贈ってください。",
  },
  /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the gift expired unopened; the Receive gift dialog shows its own returned-gift screen instead, so this is errorMessage's fallback */
  gift_expired: {
    en: "This gift wasn’t opened in time.",
    ja: "このギフトは、期限内にひらかれませんでした。",
  },
  /** Giving, In the bag: packing a sticker (POST /api/gifts) that's already in another open gift, in “couldn’t be packed” through errorReason */
  gift_in_transit: {
    en: "This sticker is already on its way in a gift.",
    ja: "このシールは、すでにギフトとして贈られている途中です。",
  },
  /** Giving, In the bag: a deposit, picker outcome or take-out (POST /api/gifts/:giftId/…) for a gift that doesn't exist, through errorReason; the Receive gift dialog and the Gratitude Mini-game show their own lines for it instead */
  gift_not_found: {
    en: "Couldn’t find this gift. Go back to your board and give the sticker again.",
    ja: "このギフトが見つかりませんでした。ボードに戻って、もう一度シールを贈ってください。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) for a gift not received yet; the Mini-game shows its own “didn’t reach” line instead, so this is errorMessage's fallback */
  gift_not_received: {
    en: "This gift hasn’t been received yet.",
    ja: "このギフトは、まだ受け取られていません。",
  },
  /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the gift expired and went back to its giver; the Receive gift dialog shows its own returned-gift screen instead */
  gift_returned: {
    en: "This gift went back to its giver.",
    ja: "このギフトは、贈り主のもとに戻りました。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) for a gift that already has Gratitude; the Mini-game shows its own “didn’t reach” line instead, so this is errorMessage's fallback */
  gratitude_already_recorded: {
    en: "Gratitude for this gift is already in.",
    ja: "このギフトへの感謝は、すでに届いています。",
  },
  /** Sticker detail's Transfer Trail: loading a gift's Gratitude replay (GET /api/gratitude/:giftId) when none was recorded, in “Couldn’t load the replay” through errorReason */
  gratitude_not_found: {
    en: "There’s no gratitude for this gift yet.",
    ja: "このギフトへの感謝は、まだありません。",
  },
  /** Receiving: opening a gift message's link in a group chat (POST /api/gifts/preview or /receive); the Receive gift dialog shows its own “Open this in your chat” screen instead */
  group_chat: {
    en: "Gifts open only in the private chat they were sent to.",
    ja: "ギフトは、送られた1対1のトークでしかひらけません。",
  },
  /** Handle prompt: saving a handle (POST /api/me/handle) that breaks the rules; the prompt shows its own api.handle.invalid line instead, so this is errorMessage's fallback */
  handle_invalid: {
    en: "That handle doesn’t fit the rules.",
    ja: "そのユーザー名は、ルールに合っていません。",
  },
  /** Handle prompt: saving a handle (POST /api/me/handle) someone else has; the prompt shows its own api.handle.taken line instead, so this is errorMessage's fallback */
  handle_taken: {
    en: "Someone else has that handle.",
    ja: "そのユーザー名は、ほかの人が使っています。",
  },
  /** Any screen, when the server fails unexpectedly (500), through errorMessage/errorReason; also the reserve ticket checkout after paying, when Sui doesn't verify the payment (POST /api/ticket-purchases) */
  internal_error: {
    en: "Something went wrong on our side. Try again in a moment.",
    ja: "こちら側で問題が発生しました。少し待ってから、もう一度お試しください。",
  },
  /** Any screen, when the server can't read a request (400), through errorMessage/errorReason; e.g. the Drawing screen's seal chip when a seal's images are malformed (POST /api/stickers) */
  invalid_request: {
    en: "Croquis couldn’t read that request. Try again. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "クロッキーがそのリクエストを読み取れませんでした。もう一度お試しください。続く場合は、LINEのクロッキー公式アカウントにお知らせください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: signing in to the app's server (POST /api/session) when LINE refuses the ID token, through errorMessage */
  line_token_invalid: {
    en: "LINE didn’t accept this sign-in. Reconnect with LINE. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "LINEがログイン情報を確認できませんでした。LINEで再ログインしてください。続く場合は、LINEのクロッキー公式アカウントにお知らせください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: signing in to the app's server (POST /api/session) with an expired LINE ID token, through errorMessage. Also Giving, Receiving and the reserve ticket checkout, through errorReason, when a chain action or a payment waited on Privy and Privy couldn't sign in because LINE's ID token had expired (made by the app itself) */
  line_token_expired: {
    en: "Your LINE sign-in has expired. Reconnect with LINE to continue.",
    ja: "LINEのログイン情報の有効期限が切れました。LINEで再ログインしてください。",
  },
  /** Signing in (POST /api/session), and wherever errorMessage shows a refusal of POST /api/line-menu: LINE didn't answer when the app's server checked your sign-in or linked your chat menu. The developer slip's Chat menu row shows the code instead */
  line_unavailable: {
    en: "LINE didn’t answer. Try again in a moment.",
    ja: "LINEから応答がありません。少し待ってから、もう一度お試しください。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the sticker saved but its NFT mint wasn't confirmed (POST /api/stickers), through errorReason */
  mint_failed: {
    en: "Your sticker is saved, but it couldn’t be sealed on-chain. Try again; it won’t use another ticket.",
    ja: "シールは保存されましたが、ブロックチェーン上で仕上げられませんでした。もう一度お試しください。チケットを新たに使うことはありません。",
  },
  /** Drawing screen, starting a sticker: spending a ticket (POST /api/tickets/spend) with no daily or reserve tickets left, in the start card's “Couldn’t start your sticker” through errorMessage */
  no_tickets_left: { en: "You’re out of tickets.", ja: "チケットが残っていません。" },
  /** Giving, In the bag: recording that the gift was sent (POST /api/gifts/:giftId/shared) before its deposit landed in the escrow, in “couldn’t record” through errorReason; the Receive gift dialog shows its own “Almost here” screen instead */
  not_deposited: {
    en: "Your sticker hasn’t reached the gift bag yet. Wait a moment, then try again.",
    ja: "シールがまだギフト袋に届いていません。少し待ってから、もう一度お試しください。",
  },
  /** Sticker detail's Transfer Trail: marking a Gratitude replay watched (POST /api/gratitude/:giftId/seen) by anyone but the gift's giver, in “Couldn’t mark this gratitude watched” through errorReason; the card marks it only for the giver */
  not_giver: { en: "Only the giver can do that.", ja: "それができるのは贈り主だけです。" },
  /** Giving, In the bag: packing a sticker (POST /api/gifts) whose NFT isn't minted yet, in “couldn’t be packed” through errorReason */
  not_minted: {
    en: "This sticker isn’t sealed on-chain yet.",
    ja: "このシールは、まだブロックチェーン上で仕上がっていません。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) on a gift someone else received; the Mini-game shows its own “didn’t reach” line instead, so this is errorMessage's fallback */
  not_receiver: {
    en: "Only the gift’s receiver can do that.",
    ja: "それができるのは、ギフトを受け取った人だけです。",
  },
  /** Giving, In the bag: packing a sticker someone else holds (POST /api/gifts), or a deposit, picker outcome or take-out on someone else's gift, through errorReason */
  not_yours: { en: "That sticker isn’t yours.", ja: "そのシールは、あなたのものではありません。" },
  /** Receiving: the giver opening their own gift message's link (POST /api/gifts/preview or /receive); the Receive gift dialog shows its own “This gift is on its way” screen instead */
  own_gift: { en: "You can’t open your own gift.", ja: "自分が贈ったギフトは、ひらけません。" },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for a pack size the shop doesn't sell, in “The payment went through, but the tickets weren’t added” through errorReason */
  pack_unknown: { en: "That ticket pack doesn’t exist.", ja: "そのチケットパックはありません。" },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for a Sui payment that already bought tickets, in “The payment went through, but the tickets weren’t added” through errorReason */
  payment_already_counted: {
    en: "That payment was already counted.",
    ja: "その支払いは、すでに反映されています。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for a Sui transaction that paid no JPYC into the ticket vault, in “…the tickets weren’t added” through errorReason */
  payment_not_found: {
    en: "The Shop didn’t receive that payment.",
    ja: "ショップでこの支払いを確認できませんでした。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) while Sui doesn't show the payment yet, in “Tickets not added yet” through errorReason, under the key that asks again */
  payment_not_landed: {
    en: "Sui doesn’t show this payment yet. Try again in a moment.",
    ja: "Suiでこの支払いがまだ確認できません。少し待ってから、もう一度お試しください。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for a payment into the ticket vault that names someone else, in “…the tickets weren’t added” through errorReason */
  payment_not_yours: {
    en: "That payment was made for someone else’s tickets.",
    ja: "この支払いは別の人のチケットのものです。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) when the payment is below the pack's price at every quote still valid, in “…the tickets weren’t added” through errorReason */
  payment_short: {
    en: "The payment was less than the pack’s price.",
    ja: "支払い額がパックの価格に足りませんでした。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) whose replay fails the server's checks; the Mini-game shows its own “didn’t reach” line instead, so this is errorMessage's fallback */
  replay_invalid: {
    en: "The gratitude replay couldn’t be read.",
    ja: "感謝のリプレイを読み取れませんでした。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”: a request found the session gone (the cookie expired, or the account was deleted) and signing in again didn't hold; the app signs in again by itself the first time, so this shows only on that second failure, through errorMessage */
  signed_out: {
    en: "You’re signed out. Reopen Croquis from LINE to sign in again.",
    ja: "ログアウトされました。LINEからクロッキーをひらき直して、もう一度ログインしてください。",
  },
  /** Drawing screen, the seal key's chip, and Giving and Receiving: a chain action waited 30 s for the Sepolia account that holds the stickers and Privy never readied it, or Privy failed again after one fresh try; the reason follows in brackets (made by the app itself, shown through errorReason) */
  smart_account_not_ready: {
    en: "Your board address is taking too long to get ready. Try again.",
    ja: "ボードアドレスの準備に時間がかかっています。もう一度お試しください。",
  },
  /** Sticker detail: loading where it's been (GET /api/stickers/:stickerId), in “Couldn’t load where it’s been…”, or Giving: packing it (POST /api/gifts), in “couldn’t be packed”, through errorReason */
  sticker_not_found: {
    en: "Couldn’t find this sticker. Go back to your board and try again.",
    ja: "このシールが見つかりませんでした。ボードに戻って、もう一度お試しください。",
  },
  /** Your sticker board: saving where a sticker sits after you move it (PATCH /api/sticker-boards/me/sticker-placements/:stickerId) when it never reached you, in “Couldn’t save where … sits” through errorReason */
  sticker_placement_not_found: {
    en: "That sticker isn’t on your sticker board.",
    ja: "そのシールは、あなたのシールボードにありません。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) when the server couldn't read the payment from Sui, in “…the tickets weren’t added” through errorReason */
  sui_unavailable: {
    en: "Sui didn’t answer. Your tickets weren’t added yet; try again.",
    ja: "Suiから応答がありません。チケットはまだ追加されていません。もう一度お試しください。",
  },
  /** Reserve ticket checkout, after tapping Pay, under “Payment didn’t go through”: the Sui account you pay from wasn't ready in time, Privy couldn't make it or start its signer, or Privy failed again after one fresh try; the reason follows in brackets, and no JPYC was spent (made by the app itself, shown through errorReason) */
  sui_wallet_not_ready: {
    en: "Your Sui account isn’t ready yet. Try again.",
    ja: "Suiアカウントの準備がまだできていません。もう一度お試しください。",
  },
  /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the giver took the gift back; the Receive gift dialog shows its own “took this one back” screen instead */
  taken_back: { en: "The giver took this gift back.", ja: "贈り主がこのギフトを取り消しました。" },
  /** Giving, In the bag: confirming a take-out (POST /api/gifts/:giftId/take-out) before the escrow confirms it, through errorReason */
  take_out_not_landed: {
    en: "Taking this sticker out hasn’t been confirmed yet. Wait a moment, then try again.",
    ja: "シールを取り出せたか、まだ確認できていません。少し待ってから、もう一度お試しください。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the drawing's ticket already became a sticker (POST /api/stickers), through errorReason */
  ticket_already_used: {
    en: "That ticket was already used.",
    ja: "そのチケットは、すでに使われています。",
  },
  /** Drawing screen, starting a sticker: spending a ticket (POST /api/tickets/spend) when the next one isn't the daily or reserve kind the start card offered, in the start card's “Couldn’t start your sticker” through errorMessage */
  ticket_kind_changed: {
    en: "Your tickets changed. Try again.",
    ja: "チケットの状況が変わりました。もう一度お試しください。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the ticket the drawing started on doesn't exist (POST /api/stickers), through errorReason */
  ticket_not_found: {
    en: "Couldn’t find that ticket. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "そのチケットが見つかりませんでした。続く場合は、LINEのクロッキー公式アカウントにお知らせください。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the ticket the drawing started on is someone else's (POST /api/stickers), through errorReason */
  ticket_not_yours: {
    en: "That ticket isn’t yours.",
    ja: "そのチケットは、あなたのものではありません。",
  },
  /** Sticker detail: loading a sticker's timelapse (GET /api/stickers/:stickerId/timelapse) when it was sealed without one, in “Couldn’t load the timelapse” through errorReason; Timelapse shows only for stickers that have one */
  timelapse_not_found: {
    en: "This sticker was sealed without its timelapse.",
    ja: "このシールは、タイムラプスなしで仕上げられました。",
  },
  /** Not shown in the app: the ENS gateway's answer to an outside ENS app that asks through a resolver other than croquis.eth's */
  unknown_resolver: {
    en: "That name belongs to another app.",
    ja: "この名前は別のアプリのものです。",
  },
  /** Not shown in the app: the ENS gateway's answer to an outside ENS app whose name lookup it can't read or doesn't answer */
  unsupported_request: {
    en: "That name lookup isn’t one this app answers.",
    ja: "この名前の問い合わせには答えられません。",
  },
  /** An artist's sticker board: loading their board or stats (GET /api/sticker-boards/:userId, …/user-stats) for a person who doesn't exist, in “Couldn’t load …’s board” or “Their stats didn’t load” through errorReason */
  user_not_found: {
    en: "Couldn’t find that artist. Search for them in Explore to check the handle.",
    ja: "そのアーティストが見つかりませんでした。さがすでユーザー名を確認してください。",
  },
  /** Your stat board, Age verification paper: sending World App's proof (POST /api/me/age-verification) when World's verify service doesn't answer, in “Your age couldn’t be verified” through errorReason */
  world_id_unavailable: {
    en: "World ID didn’t answer. Try again in a moment.",
    ja: "World IDから応答がありませんでした。少し待ってから、もう一度お試しください。",
  },
} as const satisfies Record<ErrorCode | "unknown", Leaf>;
