import type { Section } from "../catalog";

export const pointerIndicators = {
  /** Pointer indicator review page: its browser title and heading */
  title: { en: "Croquis pointer test", ja: "Croquis ポインターテスト" },
  /** Pointer indicator review page: the fixed recognition text beside its heading */
  rapidTapCheck: { en: "Rapid tap check", ja: "連続タップ確認" },
  /** Pointer indicator review page: the introduction above the controls */
  introduction: {
    en: "Try the same page in Safari and Brave with your Apple Pencil. The dot and tap ripple use Croquis’s actual indicators.",
    ja: "Apple Pencil で、Safari と Brave の両方で同じページを試してください。点とタップの波紋は Croquis と同じ表示です。",
  },
  /** Pointer indicator review page: the label beside the indicator switch */
  enabled: { en: "Show pointer and tap indicators", ja: "ポインターとタップの位置を表示" },
  /** Pointer indicator review page: the error when the device cannot keep the indicator setting */
  notKept: {
    en: "Indicators changed for this visit, but this device could not keep the setting.",
    ja: "今回の表示は変更されましたが、この端末に設定を保存できませんでした。",
  },
  /** Pointer indicator review page: the language selector's label */
  language: { en: "Language", ja: "言語" },
  /** Pointer indicator review page: the English language option */
  english: { en: "English", ja: "English" },
  /** Pointer indicator review page: the Japanese language option */
  japanese: { en: "日本語", ja: "日本語" },
  /** Pointer indicator review page: the error when switching its language fails */
  languageFailed: {
    en: "The page could not change languages. Reload to try again.",
    ja: "ページの言語を変更できませんでした。再読み込みして、もう一度お試しください。",
  },
  /** Pointer indicator review page: the status after a real hovering pen movement arrives */
  hoverDetected: { en: "Hover detected", ja: "ホバーを検出しました" },
  /** Pointer indicator review page: the status before any real hovering pen movement arrives */
  noHover: { en: "No hover detected yet", ja: "ホバーはまだ検出されていません" },
  /** Pointer indicator review page: the explanation of what its hover status measures */
  hoverExplanation: {
    en: "Hover means this browser sent a real pen movement while the tip was off the screen. Contact indicators can work even when hover is unavailable.",
    ja: "ホバーは、ペン先が画面に触れていないときに、ブラウザーが実際のペン移動を通知したことを示します。ホバーが使えなくても、接触時の位置は表示できます。",
  },
  /** Pointer indicator review page: the heading inside the large interaction target */
  target: { en: "Hover, tap, or drag here", ja: "ここでホバー・タップ・ドラッグ" },
  /** Pointer indicator review page: the instructions inside the interaction target */
  targetHint: {
    en: "Move the Pencil just above the screen, then touch down and move. Try your finger too.",
    ja: "画面のすぐ上でペンを動かしてから、画面に触れて動かしてください。指でも試せます。",
  },
  /** Pointer indicator review page: the button that checks ordinary control taps */
  tap: { en: "Tap this button", ja: "このボタンをタップ" },
  /** Pointer indicator review page: the count of button activations */
  taps: { en: "Button taps: {{count}}", ja: "ボタンのタップ：{{count}}" },
  /** Pointer indicator review page: the count of real pen hover movements received */
  hoverCount: { en: "Pen hover movements: {{count}}", ja: "ペンのホバー移動：{{count}}" },
  /** Pointer indicator review page: the count of trusted pointerdown events received anywhere on the page */
  contacts: { en: "Pointer-down events: {{count}}", ja: "ポインターダウンイベント：{{count}}" },
  /** Pointer indicator review page: the count of trusted touchstart events of every touch type */
  touchStarts: { en: "Touch-start events: {{count}}", ja: "タッチスタートイベント：{{count}}" },
  /** Pointer indicator review page: the instructions for comparing rapid contacts with indicators off and on */
  inputInstructions: {
    en: "Turn indicators off and tap the target rapidly. Turn them on and repeat, then copy input details. Compare Pointer-down events and Touch-start events.",
    ja: "表示をオフにして、枠の中を連続でタップしてください。表示をオンにして繰り返し、入力の詳細をコピーしてください。ポインターダウンイベントとタッチスタートイベントの数を比べます。",
  },
  /** Pointer indicator review page: the button that copies this visit's complete local input details */
  copyInputDetails: { en: "Copy input details", ja: "入力の詳細をコピー" },
  /** Pointer indicator review page: the confirmation after this visit's input details were copied */
  inputCopied: { en: "Input details copied", ja: "入力の詳細をコピーしました" },
  /** Pointer indicator review page: the persistent error when copying this visit's input details fails */
  copyFailed: {
    en: "Input details could not be copied. Try again or open the input history below.",
    ja: "入力の詳細をコピーできませんでした。もう一度お試しになるか、下の入力履歴を開いてください。",
  },
  /** Pointer indicator review page: the error detail when its clipboard request takes longer than five seconds */
  copyTimedOut: {
    en: "The clipboard did not respond within five seconds.",
    ja: "クリップボードが5秒以内に応答しませんでした。",
  },
  /** Pointer indicator review page: the collapsed summary for every discrete input record kept during this visit */
  inputHistory: { en: "Input history ({{count}} records)", ja: "入力履歴（{{count}}件）" },
  /** Pointer indicator review page: one input history record with elapsed time and the browser's complete event facts */
  inputRecord: {
    en: "{{elapsed}} ms · {{event}} · {{pointer}} · ID {{id}} · x {{x}}, y {{y}} · buttons {{buttons}} · pressure {{pressure}} · {{trusted}} · {{enabled}}",
    ja: "{{elapsed}} ms · {{event}} · {{pointer}} · ID {{id}} · x {{x}}、y {{y}} · ボタン {{buttons}} · 筆圧 {{pressure}} · {{trusted}} · {{enabled}}",
  },
  /** Pointer indicator review page: the input history field when Touch has no buttons property */
  buttonsUnavailable: { en: "n/a", ja: "該当なし" },
  /** Pointer indicator review page: the pressure field when the browser provides no touch force */
  pressureUnavailable: { en: "n/a", ja: "該当なし" },
  /** Pointer indicator review page: the input history mark for indicators enabled at the event time */
  indicatorsOn: { en: "indicators on", ja: "表示オン" },
  /** Pointer indicator review page: the input history mark for indicators disabled at the event time */
  indicatorsOff: { en: "indicators off", ja: "表示オフ" },
  /** Pointer indicator review page: the input history mark for a browser-delivered trusted event */
  realInput: { en: "real input", ja: "実際の入力" },
  /** Pointer indicator review page: the input history mark for an event generated by a script */
  syntheticInput: { en: "synthetic input", ja: "スクリプトの入力" },
  /** Pointer indicator review page: the heading above its most recent pointer or touch event */
  latest: { en: "Latest event", ja: "直近のイベント" },
  /** Pointer indicator review page: the latest-event placeholder before input arrives */
  waiting: { en: "Waiting for pointer input", ja: "ポインターの入力を待っています" },
  /** Pointer indicator review page: the latest pointer event's raw browser facts */
  event: {
    en: "{{event}} · {{pointer}} · ID {{id}} · x {{x}}, y {{y}} · buttons {{buttons}} · pressure {{pressure}}",
    ja: "{{event}} · {{pointer}} · ID {{id}} · x {{x}}、y {{y}} · ボタン {{buttons}} · 筆圧 {{pressure}}",
  },
  /** Pointer indicator review page: the latest touch event's raw browser facts for every touch type */
  touchEvent: {
    en: "{{event}} · {{pointer}} · touch ID {{id}} · x {{x}}, y {{y}} · pressure {{pressure}}",
    ja: "{{event}} · {{pointer}} · タッチ ID {{id}} · x {{x}}、y {{y}} · 筆圧 {{pressure}}",
  },
} as const satisfies Section;
