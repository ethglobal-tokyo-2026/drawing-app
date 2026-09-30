import type { Section } from "../catalog";

export const gratitude = {
  /** Gratitude Mini-game, which covers the phone when you send gratitude for a received sticker: the page title in LINE's header while it's open, and screen readers' name for the game */
  title: { en: "Send gratitude", ja: "感謝を送る" },
  /** Gratitude Mini-game, top left: screen readers' name for the sticker the gratitude is for, with its number */
  sticker: { en: "Sticker {{no}}", ja: "シール{{no}}" },
  /** Gratitude Mini-game, top: fine print over the giver's handle, beside their photo */
  from: { en: "From", ja: "贈り主" },
  /** Gratitude Mini-game, top right, before the first tap or once the ending has played: screen readers' name for the X button that closes the game */
  close: { en: "Close", ja: "閉じる" },
  /** Gratitude Mini-game, top right, once the combo is running: screen readers' name for the X button, which ends the combo, sends it and shows its receipt */
  endAndSend: { en: "End and send gratitude", ja: "ここで終えて感謝を送る" },
  /** Gratitude Mini-game: screen readers' name for the big heart's button, which you tap to play */
  heart: { en: "Send gratitude to {{handle}}", ja: "{{handle}}さんに感謝を送る" },
  /** Gratitude Mini-game, before the first tap: the hint under the heart, on two lines, beating like a game's start button */
  hint: { en: "Tap the heart<br/>as fast as you can!", ja: "できるだけ速く<br/>ハートをタップ！" },
  /** What to do, shown and said once the person is trying. */
  tips: {
    /** Gratitude Mini-game, after three drags across the heart that didn't start stroking: a tip label with a swipe icon, also said to screen readers */
    stroke: { en: "Stroke it back and forth, fast", ja: "行ったり来たり、すばやくなでて" },
    /** Gratitude Mini-game, during a hard shake of the phone, before shaking counts as hits: a tip label with a vibrate icon, also said to screen readers */
    shake: { en: "Keep shaking!", ja: "そのまま振り続けて！" },
  },
  /** Gratitude Mini-game, as the combo ends: the sigh that drifts up over where the heart was, beside a wind icon */
  sigh: { en: "fuu…", ja: "ふぅ…" },
  hud: {
    /** Gratitude Mini-game, the timer bar at the top: the unit after the seconds left */
    secondsUnit: { en: "s", ja: "秒" },
    /** Gratitude Mini-game, the timer bar at the top: a label that rises over the bar's end as a hit lands, the seconds the hit added */
    secondsAdded: { en: "+{{seconds}}s", ja: "+{{seconds}}秒" },
  },
  /** Said through the screen's polite live region, for assistive tech. */
  announcements: {
    /** Gratitude Mini-game, screen readers only: said as the first tap starts the timer bar */
    keepTapping: {
      en: "Keep tapping before the bar runs out.",
      ja: "バーがなくなる前に、タップを続けてください。",
    },
    /** Gratitude Mini-game, screen readers only: said on a hit at most every 1.6 seconds, the combo's gratitude so far and its multiplier */
    total: {
      en: "{{total}} gratitude, times {{multiplier}}",
      ja: "感謝{{total}}、{{multiplier}}倍",
    },
    /** Gratitude Mini-game, screen readers only: said when fast back-and-forth strokes on the heart start counting as hits */
    strokeUnlocked: { en: "Stroke unlocked.", ja: "なでなでが解放されました。" },
    /** Gratitude Mini-game, screen readers only: said when shaking the phone starts counting as hits, with reduced motion on, where the heart stays put */
    shakeUnlocked: { en: "Shake unlocked.", ja: "シェイクが解放されました。" },
    /** Gratitude Mini-game, screen readers only: said when shaking the phone starts counting as hits and the heart comes loose to bounce off the screen's edges, with reduced motion off */
    heartLoose: { en: "The heart is loose.", ja: "ハートがとれて、自由に動きだしました。" },
    /** Gratitude Mini-game, screen readers only: said once the receipt is up and the server has the gratitude */
    sent: {
      en: "Sent {{total}} gratitude to {{handle}}.",
      ja: "{{handle}}さんに{{total}}の感謝を送りました。",
    },
  },
  receipt: {
    /** Gratitude Mini-game, once the ending has played and the server has the gratitude: screen readers' name for the receipt card */
    label: { en: "Gratitude sent", ja: "感謝を送りました" },
    /** Gratitude Mini-game, once the ending has played while the gratitude is still going to the server: screen readers' name for the receipt card */
    labelSending: { en: "Sending gratitude", ja: "感謝を送っています" },
    /** Gratitude Mini-game, once the ending has played when the gratitude couldn't reach the server and waits on this phone: screen readers' name for the receipt card */
    labelKept: { en: "Gratitude saved", ja: "感謝を保存しました" },
    /** Gratitude Mini-game, once the ending has played when the server refused the gratitude: screen readers' name for the receipt card */
    labelRefused: { en: "Gratitude not sent", ja: "感謝を送れませんでした" },
    /** Gratitude Mini-game, receipt card: the line under the big gratitude total, naming the giver */
    gratitudeTo: { en: "gratitude to {{handle}}", ja: "{{handle}}さんへの感謝" },
    /** Gratitude Mini-game, receipt card: fine print beside the hit counter, the combo's best multiplier */
    bestMultiplier: { en: "best ×{{multiplier}}", ja: "最高×{{multiplier}}" },
    /** Gratitude Mini-game, receipt card, in a note under the combo while the gratitude is still going to the server */
    sending: { en: "Sending…", ja: "送っています…" },
    /** Gratitude Mini-game, receipt card, in a note under the combo when the gratitude couldn't reach the server, also said to screen readers */
    kept: {
      en: "Saved on this phone. It goes to {{handle}} when you’re back online.",
      ja: "この端末に保存しました。接続が戻ったら、{{handle}}さんに送ります。",
    },
  },
  failures: {
    /** Gratitude Mini-game, when the game breaks before the first tap: an alert at the bottom of the screen */
    stopped: {
      en: "The game stopped before your first tap, so nothing was sent. Close it and send your gratitude again.",
      ja: "最初のタップの前にゲームが止まってしまい、感謝は送られていません。閉じてから、もう一度感謝を送ってください。",
    },
    /** Gratitude Mini-game, when the game breaks mid-combo or in its ending and the receipt comes up at once: an alert at the bottom of the screen */
    stoppedInPlay: {
      en: "The game stopped early, so this is your combo up to then.",
      ja: "ゲームが途中で止まったため、そこまでの感謝になっています。",
    },
  },
  /** Why the server refused a combo for good. Each is the receipt card's note under the combo, also said to screen readers. */
  refusals: {
    /** Gratitude Mini-game, receipt card's note when the gift already has gratitude (gratitude_already_recorded) */
    alreadyRecorded: {
      en: "Gratitude for this sticker is already with {{handle}}, so this combo wasn’t sent.",
      ja: "このシールへの感謝はすでに{{handle}}さんに届いているため、今回の感謝は送られませんでした。",
    },
    /** Gratitude Mini-game, receipt card's note when someone else received the gift (not_receiver) */
    notReceiver: {
      en: "This sticker was received by someone else, so this combo wasn’t sent.",
      ja: "このシールを受け取ったのは別の人なので、今回の感謝は送られませんでした。",
    },
    /** Gratitude Mini-game, receipt card's note when the server doesn't have the gift as received yet (gift_not_received), which a later combo can fix */
    notReceived: {
      en: "This sticker isn’t marked received yet, so this combo wasn’t sent. Try again once it’s on your board.",
      ja: "このシールはまだ受け取り済みになっていないため、今回の感謝は送られませんでした。ボードに貼られてから、もう一度送ってください。",
    },
    /** Gratitude Mini-game, receipt card's note when the gift isn't there (gift_not_found) */
    notFound: {
      en: "This gift isn’t here anymore, so this combo wasn’t sent.",
      ja: "このギフトが見つからないため、今回の感謝は送られませんでした。",
    },
    /** Gratitude Mini-game, receipt card's note when the server couldn't read the combo (replay_invalid, invalid_request), which a new combo can get past */
    unreadable: {
      en: "Croquis couldn’t read your combo, so it wasn’t sent. Close this and send your gratitude again.",
      ja: "クロッキーが今回の感謝を読み取れなかったため、送られませんでした。閉じてから、もう一度感謝を送ってください。",
    },
    /** Gratitude Mini-game, receipt card's note for any other refusal, over its details for a report: the server's status, code and English words */
    other: {
      en: "Croquis didn’t accept your gratitude for {{handle}}, so this combo wasn’t sent.",
      ja: "クロッキーが{{handle}}さんへの感謝を受け付けなかったため、今回の感謝は送られませんでした。",
    },
  },
} as const satisfies Section;
