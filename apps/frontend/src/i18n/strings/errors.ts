import type { ErrorCode } from "../../api/apiClient";
import type { Leaf } from "../catalog";

/** One message per error code, for people; the server's `detail` stays English, for developers. */
export const errors = {
  /** Any screen that shows a failed request through problemOf, when the server answers a code this catalog lacks (such as route_not_found); {{code}} is that code */
  unknown: {
    en: "Something went wrong ({{code}}). Try again. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "問題が<wbr/>発生しました（{{code}}）。<wbr/>もう一度<wbr/>お試しください。<wbr/>続く場合は、<wbr/>LINEの<wbr/>クロッキー<wbr/>公式アカウントに<wbr/>お知らせください。",
  },
  /** Any screen, when a request gets no answer (offline, or it failed before a reply): shown through problemOf by the screen that made it */
  network: {
    en: "Couldn’t connect. Check your connection, then try again.",
    ja: "つながりませんでした。<wbr/>接続を<wbr/>確認して、<wbr/>もう一度<wbr/>お試しください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: LINE is logged in but hands over no ID token to sign in to the app's server with (made by the app itself, shown through errorMessage) */
  no_line_token: {
    en: "LINE didn’t sign you in. Reconnect with LINE to try again.",
    ja: "LINEの<wbr/>ログイン情報を<wbr/>取得できませんでした。<wbr/>LINEで<wbr/>再ログインしてください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: tapping it couldn't restart LINE Login (made by the app itself, shown through errorMessage) */
  line_reconnect_failed: {
    en: "Couldn’t reconnect with LINE. Try again, or reopen the app from LINE.",
    ja: "LINEで<wbr/>再ログインできませんでした。<wbr/>もう一度<wbr/>試すか、<wbr/>LINEから<wbr/>アプリを<wbr/>ひらき直してください。",
  },
  /** Giving and Receiving: giving an 18+ sticker from a board (POST /api/gifts) to someone without Show 18+ stickers on, or receiving one (POST /api/gifts/receive) without it; in “couldn’t be packed” or the gift's refusal, through problemOf */
  nsfw_not_opted_in: {
    en: "Only people who turned on Show 18+ stickers in Settings can receive 18+ stickers.",
    ja: "18+のシールを受け取れるのは、設定で「18+のシールを表示する」をオンにした人だけです。",
  },
  /** Sticker detail, Mark 18+: marking a sticker (POST /api/stickers/:stickerId/nsfw) that someone else drew, in the detail's error line */
  not_original_artist: {
    en: "Only the person who drew this sticker can mark it 18+.",
    ja: "18+にできるのは、このシールの作者だけです。",
  },
  /** Sticker detail, Mark 18+: marking a sticker (POST /api/stickers/:stickerId/nsfw) that's already marked, such as from another window, in the detail's error line */
  already_nsfw: {
    en: "This sticker is already marked 18+.",
    ja: "このシールは、すでに18+です。",
  },
  /** Giving, In the bag: taking a gift back out (POST /api/gifts/:giftId/take-out) that its receiver already received, in “couldn’t be taken out” through problemOf; the Receive gift dialog shows its own Already opened screen instead */
  already_received: {
    en: "This gift was already opened.",
    ja: "このギフトは、すでにひらかれています。",
  },
  /** Giving and Receiving: packing a gift, opening a gift's link, Accept, taking a gift out, the deposit's check after Send, or reading when a gift expires, when the chain can't be read, through the error line */
  chain_unavailable: {
    en: "Couldn’t check on the gift just now. Try again in a moment.",
    ja: "ギフトの状態をいま確認できません。少し待ってから、もう一度お試しください。",
  },
  /** Receive gift dialog, Accept sheet: tapping Accept (POST /api/gifts/receive, or /:giftId/receive from the board) when the chain fails or doesn't confirm the sticker's claim, in “… wasn’t received” through problemOf; a gift its giver took back, or that went back to them, answers its own refusal instead */
  claim_failed: {
    en: "It couldn’t be confirmed. Trying again is safe, since a gift is only ever received once, but it may not work.",
    ja: "確認できませんでした。受け取りは一度きりなので、やり直しても大丈夫ですが、うまくいかないこともあります。",
  },
  /** Giving, In the bag: packing a sticker when Sui's answer to its signed deposit (POST /api/gifts/:giftId/deposit) never came, in “couldn’t be packed” through problemOf; Send in LINE sends the same deposit again */
  deposit_not_landed: {
    en: "Sui hasn’t answered about your sticker yet. Tap Send in LINE to check again; it won’t move twice.",
    ja: "シールについてSuiからの応答がまだありません。「LINEで送る」をタップして、もう一度確認してください。二重に動くことはありません。",
  },
  /** Giving, In the bag: recording LINE's picker outcome (POST /api/gifts/:giftId/shared) for a gift that's no longer packed or sent, or taking out a gift already returned, in “couldn’t record” or “couldn’t be taken out” through problemOf */
  gift_closed: {
    en: "This gift is already closed. Go back to your board, and if your sticker is there, give it again.",
    ja: "このギフトはすでに閉じられています。ボードに戻って、シールがあればもう一度贈ってください。",
  },
  /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the gift expired unopened; the Receive gift dialog shows its own returned-gift screen instead, so this is errorMessage's fallback */
  gift_expired: {
    en: "This gift wasn’t opened in time.",
    ja: "このギフトは、期限内にひらかれませんでした。",
  },
  /** Giving, In the bag: packing a sticker (POST /api/gifts) that's already in another open gift, in “couldn’t be packed” through problemOf */
  gift_in_transit: {
    en: "This sticker is already on its way in a gift.",
    ja: "このシールは、すでにギフトとして贈られている途中です。",
  },
  /** Giving, In the bag: a deposit, picker outcome or take-out (POST /api/gifts/:giftId/…) for a gift that doesn't exist, through problemOf; the Receive gift dialog and the Gratitude Mini-game show their own lines for it instead */
  gift_not_found: {
    en: "Couldn’t find this gift. Go back to your board and give the sticker again.",
    ja: "このギフトが見つかりませんでした。ボードに戻って、もう一度シールを贈ってください。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) for a gift not received yet; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
  gift_not_received: {
    en: "This gift hasn’t been received yet.",
    ja: "このギフトは、まだ受け取られていません。",
  },
  /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the gift expired and went back to its giver; the Receive gift dialog shows its own returned-gift screen instead */
  gift_returned: {
    en: "This gift went back to its giver.",
    ja: "このギフトは、贈り主のもとに戻りました。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) for a gift that already has Gratitude; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
  gratitude_already_recorded: {
    en: "Gratitude for this gift is already in.",
    ja: "このギフトへの感謝は、すでに届いています。",
  },
  /** Sticker detail's Transfer Trail: loading a gift's Gratitude replay (GET /api/gratitude/:giftId) when none was recorded, in “Couldn’t load the replay” through problemOf */
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
  /** Any screen, when the server fails unexpectedly (500), through problemOf; also the reserve ticket checkout after paying, when Sui doesn't verify the payment (POST /api/ticket-purchases) */
  internal_error: {
    en: "Something went wrong on our side. Try again in a moment.",
    ja: "こちら側で<wbr/>問題が<wbr/>発生しました。<wbr/>少し<wbr/>待ってから、<wbr/>もう一度<wbr/>お試しください。",
  },
  /** Any screen, when the server can't read a request (400), through problemOf; e.g. the Drawing screen's seal chip when a seal's images are malformed (POST /api/stickers) */
  invalid_request: {
    en: "Croquis couldn’t read what your device sent. Try again. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "クロッキーが<wbr/>その内容を<wbr/>読み取れませんでした。<wbr/>もう一度<wbr/>お試しください。<wbr/>続く場合は、<wbr/>LINEの<wbr/>クロッキー<wbr/>公式アカウントに<wbr/>お知らせください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: signing in to the app's server (POST /api/session) when LINE refuses the ID token, through errorMessage */
  line_token_invalid: {
    en: "LINE didn’t accept this sign-in. Reconnect with LINE. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "LINEが<wbr/>ログイン情報を<wbr/>確認できませんでした。<wbr/>LINEで<wbr/>再ログインしてください。<wbr/>続く場合は、<wbr/>LINEの<wbr/>クロッキー<wbr/>公式アカウントに<wbr/>お知らせください。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”, over Reconnect with LINE: signing in to the app's server (POST /api/session) with an expired LINE ID token, through errorMessage. Also Giving, Receiving and the reserve ticket checkout, through problemOf, when a chain action or a payment waited on Privy and Privy couldn't sign in because LINE's ID token had expired (made by the app itself) */
  line_token_expired: {
    en: "Your LINE sign-in has expired. Reconnect with LINE to continue.",
    ja: "LINEの<wbr/>ログイン情報の<wbr/>有効期限が<wbr/>切れました。<wbr/>LINEで<wbr/>再ログインしてください。",
  },
  /** Signing in (POST /api/session), and wherever errorMessage shows a refusal of POST /api/line-menu: LINE didn't answer when the app's server checked your sign-in or linked your chat menu. The developer slip's Chat menu row shows the code instead */
  line_unavailable: {
    en: "LINE didn’t answer. Try again in a moment.",
    ja: "LINEから<wbr/>応答が<wbr/>ありません。<wbr/>少し<wbr/>待ってから、<wbr/>もう一度<wbr/>お試しください。",
  },
  /** Drawing screen, after tapping the check to seal: a sticker that saved but whose NFT mint wasn't confirmed (POST /api/stickers); the seal chip words this itself, so this is errorMessage's fallback */
  mint_failed: {
    en: "Your sticker is saved, but it couldn’t be sealed on-chain. Try again; it won’t use another ticket.",
    ja: "シールは保存されましたが、ブロックチェーン上で仕上げられませんでした。もう一度お試しください。チケットを新たに使うことはありません。",
  },
  /** Drawing screen, starting a sticker: spending a ticket (POST /api/tickets/spend) with no daily or reserve tickets left, in the start card's “Couldn’t start your sticker” through errorMessage */
  no_tickets_left: { en: "You’re out of tickets.", ja: "チケットが残っていません。" },
  /** Giving, In the bag: recording that the gift was sent (POST /api/gifts/:giftId/shared) before its deposit landed in the escrow, in “couldn’t record” through problemOf; the Receive gift dialog shows its own “Almost here” screen instead */
  not_deposited: {
    en: "Your sticker hasn’t reached the gift bag yet. Wait a moment, then try again.",
    ja: "シールがまだギフト袋に届いていません。少し待ってから、もう一度お試しください。",
  },
  /** Sticker detail's Transfer Trail: marking a Gratitude replay watched (POST /api/gratitude/:giftId/seen) by anyone but the gift's giver, in “Couldn’t mark this gratitude watched” through problemOf; the card marks it only for the giver */
  not_giver: { en: "Only the giver can do that.", ja: "それができるのは贈り主だけです。" },
  /** Giving, In the bag: packing a sticker (POST /api/gifts) whose NFT isn't minted yet, in “couldn’t be packed” through problemOf */
  not_minted: {
    en: "This sticker isn’t sealed on-chain yet.",
    ja: "このシールは、まだブロックチェーン上で仕上がっていません。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) on a gift someone else received; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
  not_receiver: {
    en: "Only the gift’s receiver can do that.",
    ja: "それができるのは、ギフトを受け取った人だけです。",
  },
  /** Giving, In the bag: packing a sticker someone else holds (POST /api/gifts), or a deposit, picker outcome or take-out on someone else's gift, through problemOf */
  not_yours: { en: "That sticker isn’t yours.", ja: "そのシールは、あなたのものではありません。" },
  /** Receiving: the giver opening their own gift message's link (POST /api/gifts/preview or /receive); the Receive gift dialog shows its own “This gift is on its way” screen instead */
  own_gift: { en: "You can’t open your own gift.", ja: "自分が贈ったギフトは、ひらけません。" },
  /** Reserve ticket checkout, after tapping Pay: starting the purchase (POST /api/ticket-purchases/start) for a pack size the shop doesn't sell, under “Payment didn’t go through” through errorMessage; nothing was paid */
  pack_unknown: { en: "That ticket pack doesn’t exist.", ja: "そのチケットパックはありません。" },
  /** Reserve ticket checkout, after paying: the reason in “Tickets not added yet” when Sui's answer to the signed payment (POST /api/ticket-purchases) never came, under the key that sends it again */
  payment_not_landed: {
    en: "Sui hasn’t answered about the payment yet.",
    ja: "支払いについてSuiからの応答がまだありません。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for someone else's purchase, or for a payment into the ticket vault that names someone else, in “Tickets not added yet” through errorReason */
  payment_not_yours: {
    en: "That payment was made for someone else’s tickets.",
    ja: "この支払いは別の人のチケットのものです。",
  },
  /** Reserve ticket checkout, after paying: adding the tickets (POST /api/ticket-purchases) for a purchase the server has no record of, in “Tickets can’t be added” through errorReason */
  purchase_not_found: {
    en: "The Shop has no record of this purchase.",
    ja: "ショップにこの購入の記録がありません。",
  },
  /** Gratitude Mini-game: recording a combo (POST /api/gratitude) whose replay fails the server's checks; the Mini-game's receipt shows its own note instead, so this is errorMessage's fallback */
  replay_invalid: {
    en: "The gratitude replay couldn’t be read.",
    ja: "感謝のリプレイを読み取れませんでした。",
  },
  /** Sign-in screen, under “Couldn’t sign you in”: a request found the session gone (the cookie expired, or the account was deleted) and signing in again didn't hold; the app signs in again by itself the first time, so this shows only on that second failure, through errorMessage */
  signed_out: {
    en: "You’re signed out. Reopen Croquis from LINE to sign in again.",
    ja: "ログアウトされました。<wbr/>LINEから<wbr/>クロッキーを<wbr/>ひらき直して、<wbr/>もう一度<wbr/>ログインしてください。",
  },
  /** Sticker detail: loading where it's been (GET /api/stickers/:stickerId), in “Couldn’t load where it’s been…”, or Giving: packing it (POST /api/gifts), in “couldn’t be packed”, through problemOf */
  sticker_not_found: {
    en: "Couldn’t find this sticker. Go back to your board and try again.",
    ja: "このシールが見つかりませんでした。ボードに戻って、もう一度お試しください。",
  },
  /** Your sticker board: saving where a sticker sits after you move it (PATCH /api/sticker-boards/me/sticker-placements/:stickerId) when it never reached you, in “Couldn’t save where … sits” through problemOf */
  sticker_placement_not_found: {
    en: "That sticker isn’t on your sticker board.",
    ja: "そのシールは、あなたのシールボードにありません。",
  },
  /** Giving, Receiving and the reserve ticket checkout: your Sui address, which keeps your stickers and pays, wasn't ready in time, Privy couldn't make it or start its signer, or Privy failed again after one fresh try; the reason follows in brackets, and nothing moved (made by the app itself, shown through problemOf); the drawing screen's seal chip words this failure itself */
  sui_wallet_not_ready: {
    en: "Your Sui address isn’t ready yet. Try again.",
    ja: "Suiアドレスの準備がまだできていません。もう一度お試しください。",
  },
  /** Receiving: opening a gift message's link (POST /api/gifts/preview or /receive) after the giver took the gift back; the Receive gift dialog shows its own “took this one back” screen instead */
  taken_back: { en: "The giver took this gift back.", ja: "贈り主がこのギフトを取り消しました。" },
  /** Giving, In the bag: taking a sticker out when Sui's answer to its signed take-out (POST /api/gifts/:giftId/take-out) never came, in “couldn’t be taken out” through problemOf; Take it out sends the same take-out again */
  take_out_not_landed: {
    en: "Sui hasn’t answered about taking your sticker out yet. Try again; it won’t move twice.",
    ja: "シールの取り出しについてSuiからの応答がまだありません。もう一度お試しください。二重に動くことはありません。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the drawing's ticket already became a sticker (POST /api/stickers), through errorMessage */
  ticket_already_used: {
    en: "That ticket was already used.",
    ja: "そのチケットは、すでに使われています。",
  },
  /** Drawing screen, starting a sticker: spending a ticket (POST /api/tickets/spend) when the next one isn't the daily or reserve kind the start card offered, in the start card's “Couldn’t start your sticker” through errorMessage */
  ticket_kind_changed: {
    en: "Your tickets changed. Try again.",
    ja: "チケットの状況が変わりました。もう一度お試しください。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the ticket the drawing started on doesn't exist (POST /api/stickers), through errorMessage */
  ticket_not_found: {
    en: "Couldn’t find that ticket. If it keeps happening, tell the Croquis Official account in LINE.",
    ja: "そのチケットが見つかりませんでした。続く場合は、LINEのクロッキー公式アカウントにお知らせください。",
  },
  /** Drawing screen, after tapping the check to seal: the seal chip's reason when the ticket the drawing started on is someone else's (POST /api/stickers), through errorMessage */
  ticket_not_yours: {
    en: "That ticket isn’t yours.",
    ja: "そのチケットは、あなたのものではありません。",
  },
  /** Sticker detail: loading a sticker's timelapse (GET /api/stickers/:stickerId/timelapse) when it was sealed without one, in “Couldn’t load the timelapse” through problemOf; Timelapse shows only for stickers that have one */
  timelapse_not_found: {
    en: "This sticker was sealed without its timelapse.",
    ja: "このシールは、タイムラプスなしで仕上げられました。",
  },
  /** An artist's sticker board: loading their board or stats (GET /api/sticker-boards/:userId, …/user-stats) for a person who doesn't exist, in “Couldn’t load …’s board” or “Their stats didn’t load” through problemOf */
  user_not_found: {
    en: "Couldn’t find that artist. Search for them in Explore to check the handle.",
    ja: "そのアーティストが見つかりませんでした。「発見」でユーザー名を確認してください。",
  },
  /** Giving and the reserve ticket checkout: a deposit, take-out or payment (POST /api/gifts/…, /api/ticket-purchases) signed after the server's sponsorship of it lapsed, so it was never sent; Giving packs again by itself first, so it shows only when that fails too, through problemOf */
  sponsorship_expired: {
    en: "That took too long, so it wasn’t sent, and nothing moved. Try again.",
    ja: "時間がかかりすぎたため送信されず、何も動いていません。もう一度お試しください。",
  },
  /** Giving and the reserve ticket checkout: a deposit, take-out or payment (POST /api/gifts/…, /api/ticket-purchases) whose signature isn't your Sui account's, through problemOf */
  signature_invalid: {
    en: "Your Sui account’s signature didn’t match, so nothing moved. Try again.",
    ja: "Suiアカウントの署名が一致しなかったため、何も動いていません。もう一度お試しください。",
  },
  /** Giving and the reserve ticket checkout: a deposit, take-out or payment (POST /api/gifts/…, /api/ticket-purchases) that Sui ran and failed; Sui's own words follow as fine print, through problemOf */
  transaction_failed: {
    en: "Sui ran it, but it failed, so nothing moved.",
    ja: "Suiで実行されましたが失敗したため、何も動いていません。",
  },
  /** Giving and the reserve ticket checkout: packing a sticker or starting a purchase (POST /api/gifts, /api/ticket-purchases/start) that Sui would refuse, such as a payment the balance can't cover, through problemOf */
  sponsorship_refused: {
    en: "Sui wouldn’t accept this, so it wasn’t sent, and nothing moved.",
    ja: "Suiで受け付けられない内容だったため送信されず、何も動いていません。",
  },
  /** Giving and the reserve ticket checkout: packing, taking out or paying when Croquis can't get Sui's network fee paid just now, through problemOf */
  sponsor_unavailable: {
    en: "Croquis can’t send this to Sui just now. Try again in a moment.",
    ja: "いまSuiに送信できません。少し待ってから、もう一度お試しください。",
  },
  /** Giving and the reserve ticket checkout: packing, taking out or paying when the funds Croquis pays Sui's network fee from have run out, through problemOf */
  sponsor_fund_empty: {
    en: "Croquis can’t pay Sui’s fee just now. Try again later, and tell the Croquis Official account in LINE if it keeps happening.",
    ja: "いまSuiの手数料を支払えません。時間をおいてもう一度お試しください。続く場合は、LINEのクロッキー公式アカウントにお知らせください。",
  },
  /** Sealing, Giving, Receiving and the reserve ticket checkout: the server found no Sui address for you yet (POST /api/stickers, /api/gifts, /api/gifts/receive, /api/ticket-purchases/start), through problemOf */
  no_sui_wallet: {
    en: "Your Sui address isn’t ready yet. Try again in a moment.",
    ja: "Suiアドレスの準備がまだできていません。少し待ってから、もう一度お試しください。",
  },
  /** Someone else's stat board: loading their Sui address (GET /api/sticker-boards/:userId/sui-address) when Privy, which keeps the wallets, didn't answer; the address paper says it didn't load, with Try again */
  wallet_lookup_failed: {
    en: "Couldn’t get the Sui address just now. Try again in a moment.",
    ja: "Suiアドレスをいま取得できません。少し待ってから、もう一度お試しください。",
  },
  /** Any error line, when what failed isn't the server's answer but something on this device or in a library, such as LINE's picker; its own English words follow as details for a report (made by the app itself, shown through problemOf) */
  unexpected: {
    en: "Something went wrong. Try again in a moment.",
    ja: "問題が発生しました。少し待ってから、もう一度お試しください。",
  },
} as const satisfies Record<ErrorCode | "unknown" | "unexpected", Leaf>;
