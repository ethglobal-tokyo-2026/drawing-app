import type { Section } from "../catalog";

export const gratitude = {
  /** Gratitude Mini-game, which covers the phone when you send gratitude for a received sticker: the page title in LINE's header while it's open, and screen readers' name for the game */
  title: { en: "Send gratitude", ja: "感謝を送る" },
  /** Gratitude Mini-game, top left: screen readers' name for the sticker the gratitude is for, with its number */
  sticker: { en: "Sticker {{no}}", ja: "シール{{no}}" },
  /** Gratitude Mini-game, top: fine print over the giver's handle, beside their photo */
  from: { en: "From", ja: "贈り主" },
  /** Gratitude Mini-game, top right: screen readers' name for the X button that closes the game */
  close: { en: "Close", ja: "閉じる" },
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
    /** Gratitude Mini-game, screen readers only: said as the heart reaches the giver's photo at the combo's end */
    sent: {
      en: "Sent {{total}} gratitude to {{handle}}.",
      ja: "{{handle}}さんに{{total}}の感謝を送りました。",
    },
  },
  receipt: {
    /** Gratitude Mini-game, once the ending has played: screen readers' name for the receipt card */
    label: { en: "Gratitude sent", ja: "感謝を送りました" },
    /** Gratitude Mini-game, receipt card: the line under the big gratitude total, naming the giver */
    gratitudeTo: { en: "gratitude to {{handle}}", ja: "{{handle}}さんへの感謝" },
    /** Gratitude Mini-game, receipt card: fine print under the giver's line when the combo was one hit, its best multiplier and hits */
    best_one: { en: "best ×{{multiplier}} · {{hits}} hit" },
    /** Gratitude Mini-game, receipt card: fine print under the giver's line, the combo's best multiplier and its hits, over the top tier's Japanese name */
    best_other: {
      en: "best ×{{multiplier}} · {{hits}} hits",
      ja: "最高×{{multiplier}}・{{hits}}ヒット",
    },
    /** Gratitude Mini-game, receipt card: the button with the board icon that closes the game */
    backToBoard: { en: "Back to your board", ja: "マイボードに戻る" },
  },
  failures: {
    /** Gratitude Mini-game, when the game breaks while playing: an alert at the bottom of the screen */
    stopped: {
      en: "The game stopped. Close it and send your gratitude again.",
      ja: "ゲームが止まってしまいました。閉じてから、もう一度感謝を送ってください。",
    },
    /** Gratitude Mini-game, after the combo, if the server refuses it for good: an alert at the bottom of the screen */
    refused: {
      en: "Your gratitude didn't reach {{handle}}. Close this and send it again.",
      ja: "{{handle}}さんに感謝が届きませんでした。閉じてから、もう一度送ってください。",
    },
  },
} as const satisfies Section;
